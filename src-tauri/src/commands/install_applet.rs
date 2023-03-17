use std::{collections::HashMap, fs, sync::Arc};

use futures::lock::Mutex;
use hdk::prelude::{MembraneProof, SerializedBytes, UnsafeBytes};
use holochain_client::{AgentPubKey, AppInfo};
use holochain_types::{
    prelude::{AgentPubKeyB64, AppBundle},
    web_app::WebAppBundle,
};
use tauri::AppHandle;

use crate::{
    filesystem::WeFileSystem,
    state::{LaunchedState, WeError, WeResult},
};

#[tauri::command]
pub async fn install_applet(
    app_handle: AppHandle,
    state: tauri::State<'_, Mutex<LaunchedState>>,
    app_id: String,
    network_seed: Option<String>,
    membrane_proofs: HashMap<String, Vec<u8>>,
    agent_pub_key: String, // TODO: remove when every applet has a different key
    happ_release_hash: Option<String>,
    gui_release_hash: Option<String>,
) -> WeResult<AppInfo> {
    let app_bundle_path = WeFileSystem::new(&app_handle)?
        .app_data_dir
        .join("webhapps")
        .join(format!("{}.webhapp", app_id));

    log::info!("Installing: web_app_bundle = {:?}", app_bundle_path);

    let mut converted_membrane_proofs: HashMap<String, MembraneProof> = HashMap::new();
    for (dna_slot, proof) in membrane_proofs.iter() {
        converted_membrane_proofs.insert(
            dna_slot.clone(),
            Arc::new(SerializedBytes::from(UnsafeBytes::from(proof.clone()))),
        );
    }

    let mut m = state.lock().await;

    let bytes = fs::read(&app_bundle_path).or(Err(WeError::FileSystemError(String::from(
        "Failed to read Web hApp bundle file",
    ))))?;

    let app_info = match WebAppBundle::decode(&bytes) {
        Ok(web_app_bundle) => m
            .web_app_manager
            .install_web_app(
                app_id.clone(),
                web_app_bundle,
                network_seed,
                converted_membrane_proofs,
                Some(AgentPubKey::from(
                    AgentPubKeyB64::from_b64_str(agent_pub_key.as_str()).unwrap(),
                )),
                happ_release_hash,
                gui_release_hash,
            )
            .await
            .map_err(|err| WeError::WebAppManagerError(err)),
        Err(_) => {
            let app_bundle = AppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
                String::from("Failed to read Web hApp bundle file"),
            )))?;
            m.web_app_manager
                .install_app(
                    app_id.clone(),
                    app_bundle,
                    network_seed,
                    converted_membrane_proofs,
                    Some(AgentPubKey::from(
                        AgentPubKeyB64::from_b64_str(agent_pub_key.as_str()).unwrap(),
                    )),
                    happ_release_hash,
                )
                .await
                .map_err(|err| WeError::WebAppManagerError(err))
        }
    }?;

    log::info!("Installed hApp {}", app_id);

    Ok(app_info)
}
