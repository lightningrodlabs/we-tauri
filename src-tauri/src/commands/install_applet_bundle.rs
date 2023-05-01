use std::{collections::HashMap, fs, sync::Arc};

use devhub_types::DevHubResponse;
use futures::lock::Mutex;
use hdk::prelude::{
    EntryHash, ExternIO, FunctionName, MembraneProof, Serialize, SerializedBytes, Timestamp,
    UnsafeBytes, ZomeCallUnsigned, ZomeName,
};
use holochain_client::{AgentPubKey, AppInfo, AppWebsocket};
use holochain_manager::versions::holochain_conductor_api_latest::CellInfo;
use holochain_state::nonce::fresh_nonce;
use holochain_types::{
    prelude::{AgentPubKeyB64, EntryHashB64},
    web_app::WebAppBundle,
};
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};

use crate::{
    default_apps::devhub_app_id,
    state::{LaunchedState, WeError, WeResult},
};

#[tauri::command]
pub async fn install_applet_bundle(
    state: tauri::State<'_, Mutex<LaunchedState>>,
    app_id: String,
    network_seed: Option<String>,
    membrane_proofs: HashMap<String, Vec<u8>>,
    agent_pub_key: String, // TODO: remove when every applet has a different key
    happ_release_hash: String,
    gui_release_hash: String,
) -> WeResult<(AppInfo, Option<Vec<u8>>)> {
    log::info!("Installing: app_id = {:?}", app_id);

    let mut converted_membrane_proofs: HashMap<String, MembraneProof> = HashMap::new();
    for (dna_slot, proof) in membrane_proofs.iter() {
        converted_membrane_proofs.insert(
            dna_slot.clone(),
            Arc::new(SerializedBytes::from(UnsafeBytes::from(proof.clone()))),
        );
    }

    let pub_key = AgentPubKey::from(AgentPubKeyB64::from_b64_str(agent_pub_key.as_str()).unwrap());
    let happ_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(happ_release_hash.as_str()).unwrap());
    let gui_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(gui_release_hash.as_str()).unwrap());
    let mut m = state.lock().await;

    let bytes = fetch_web_happ(
        m.web_app_manager.app_interface_port(),
        &devhub_app_id(),
        &pub_key,
        &m.lair_keystore_manager,
        happ_release_entry_hash,
        gui_release_entry_hash,
    )
    .await?;

    let web_app_bundle = WebAppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
        String::from("Failed to read Web hApp bundle file"),
    )))?;

    let app_info = m
        .web_app_manager
        .install_web_app(
            app_id.clone(),
            web_app_bundle,
            network_seed,
            converted_membrane_proofs,
            Some(pub_key),
            Some(happ_release_hash),
            Some(gui_release_hash),
        )
        .await
        .map_err(|err| WeError::WebAppManagerError(err))?;

    log::info!("Installed hApp {}", app_id);

    let ui_folder_path = m
        .web_app_manager
        .get_app_assets_dir(&app_info.installed_app_id, &String::from("default"));

    // TODO: change when devhub includes the icon
    let bytes = match fs::read(ui_folder_path.join("icon.png")) {
        Ok(bytes) => Some(bytes),
        Err(_) => None,
    };

    Ok((app_info, bytes))
}

#[derive(Debug, Serialize)]
pub struct GetWebHappPackageInput {
    pub name: String,
    pub happ_release_id: EntryHash,
    pub gui_release_id: EntryHash,
}
async fn fetch_web_happ(
    app_port: u16,
    devhub_app_id: &String,
    agent_pub_key: &AgentPubKey,
    lair_keystore_manager: &LairKeystoreManagerV0_2,
    happ_release_entry_hash: EntryHash,
    gui_release_entry_hash: EntryHash,
) -> WeResult<Vec<u8>> {
    let mut ws = AppWebsocket::connect(format!("ws://localhost:{}", app_port))
        .await
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let app_info = ws
        .app_info(devhub_app_id.clone())
        .await
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?
        .ok_or(WeError::NotRunning)?;

    let cells = app_info.cell_info.get("happs").ok_or(WeError::NotRunning)?;

    let Some(CellInfo::Provisioned(happs_cell)) = cells.get(0) else {
        return Err(WeError::NotRunning);
    };

    let (nonce, expires_at) = fresh_nonce(Timestamp::now())
        .map_err(|err| WeError::DatabaseError(format!("{:?}", err)))?;

    let zome_call_unsigned = ZomeCallUnsigned {
        provenance: agent_pub_key.clone(),
        cell_id: happs_cell.cell_id.clone(),
        zome_name: ZomeName::from("happ_library"),
        fn_name: FunctionName::from("get_webhapp_package"),
        payload: ExternIO::encode(GetWebHappPackageInput {
            name: String::from("happ"),
            happ_release_id: happ_release_entry_hash,
            gui_release_id: gui_release_entry_hash,
        })?,
        cap_secret: None,
        expires_at,
        nonce,
    };

    let signed_zome_call = lair_keystore_manager
        .sign_zome_call(zome_call_unsigned)
        .await?;

    let result = ws
        .call_zome(signed_zome_call)
        .await
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let response: DevHubResponse<Vec<u8>> = result.decode().map_err(|err| {
        WeError::AppWebsocketError(format!("Error decoding the webhapp package: {:?}", err))
    })?;

    let bytes = response
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("Error calling devhub: {:?}", err)))?;

    Ok(bytes)
}
