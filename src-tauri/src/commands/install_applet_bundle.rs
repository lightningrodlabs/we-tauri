use std::{
    collections::{BTreeMap, HashMap},
    sync::Arc,
};

use appstore_types::AppEntry;
use base64::Engine;
use devhub_types::{
    happ_entry_types::{HappManifest, GUIReleaseEntry},
    DevHubResponse, encode_bundle, DnaVersionEntry, HappReleaseEntry, FileEntry,
};
use essence::EssenceResponse;
use futures::lock::Mutex;
use hc_crud::Entity;
use holochain::{
    conductor::{
        api::{CellInfo, ClonedCell, ProvisionedCell},
        ConductorHandle,
    },
    prelude::{
        kitsune_p2p::dependencies::kitsune_p2p_types::dependencies::lair_keystore_api::LairClient,
        ActionHash, ActionHashB64, AgentPubKeyB64, AppBundleSource, CellId, CreateCloneCellPayload,
        DisableCloneCellPayload, DnaHash, DnaHashB64, EnableCloneCellPayload,
        ExternIO, FunctionName, HumanTimestamp, MembraneProof, RoleName, Serialize,
        SerializedBytes, Timestamp, UnsafeBytes, ZomeCallUnsigned, ZomeName,
    },
};
use holochain_client::{
    AgentPubKey, AppInfo, AppRequest, AppResponse, ConductorApiError,
    ConductorApiResult, InstallAppPayload, InstalledAppId, ZomeCall, AppStatusFilter, AdminWebsocket,
};
use holochain_keystore::MetaLairClient;
use holochain_launcher_utils::zome_call_signing::sign_zome_call_with_client;
use holochain_state::nonce::fresh_nonce;
use holochain_types::prelude::{AnyDhtHash, EntryHash, AnyDhtHashB64};
use holochain_websocket::{connect, WebsocketConfig, WebsocketSender};
use mere_memory_types::{MemoryEntry, MemoryBlockEntry};
use portal_types::{DnaZomeFunction, HostEntry, RemoteCallDetails};
use serde::{Deserialize, de::DeserializeOwned};

use crate::{
    default_apps::appstore_app_id,
    error::{WeError, WeResult},
    filesystem::{WeFileSystem, UiIdentifier, HappIdentifier, ReleaseInfo, ResourceLocator, ResourceLocatorB64}, launch::{AdminPort, AppPort},
};

#[tauri::command]
pub async fn fetch_icon(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    ports: tauri::State<'_, (AdminPort, AppPort)>,
    meta_lair_client: tauri::State<'_, Mutex<MetaLairClient>>,
    we_fs: tauri::State<'_, WeFileSystem>,
    app_action_hash_b64: String, // ActionHash of the entry of the applet's webassets in the DevHub
) -> WeResult<String> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("fetch_icon")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'fetch_icon'.");
    }

    let app_action_hash =
        ActionHash::from(ActionHashB64::from_b64_str(app_action_hash_b64.as_str()).unwrap());

    if let Some(icon) = we_fs.icon_store().get_icon(&app_action_hash)? {
        return Ok(icon);
    }

    let mut app_agent_client = AppAgentWebsocket::connect(
        format!(
            "ws://localhost:{}",
            ports.1,
        ),
        appstore_app_id(&app_handle),
        meta_lair_client.lock().await.lair_client(),
    )
    .await?;
    let r = app_agent_client
        .call_zome_fn(
            RoleName::from("appstore"),
            ZomeName::from("appstore_api"),
            FunctionName::from("get_app"),
            ExternIO::encode(GetEntityInput {
                id: app_action_hash.clone(),
            })?,
        )
        .await?;
    let response: appstore::EntityResponse<AppEntry> = r.decode()?;
    let app_entry = response.as_result()?;

    let result = app_agent_client
        .call_zome_fn(
            RoleName::from("appstore"),
            ZomeName::from("mere_memory_api"),
            FunctionName::from("retrieve_bytes"),
            ExternIO::encode(app_entry.content.icon.clone())?,
        )
        .await?;
    let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
    let bytes = bytes.as_result()?;

    let base64_string = base64::engine::general_purpose::STANDARD.encode(bytes);

    let mime_type = match app_entry.content.metadata.get("icon_mime_type") {
        Some(mime_type) => mime_type.as_str().unwrap_or("image/png").to_string(),
        None => String::from("image/png"),
    };

    let icon_src = format!("data:{};base64,{}", mime_type, base64_string);

    we_fs
        .icon_store()
        .store_icon(&app_action_hash, icon_src.clone())?;

    Ok(icon_src)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetEntityInput {
    pub id: ActionHash,
}


#[tauri::command]
pub async fn install_applet_bundle_if_necessary(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
    meta_lair_client: tauri::State<'_, Mutex<MetaLairClient>>,
    ports: tauri::State<'_, (AdminPort, AppPort)>,
    we_fs: tauri::State<'_, WeFileSystem>,
    app_id: String,
    network_seed: Option<String>,
    membrane_proofs: HashMap<String, Vec<u8>>,
    agent_pub_key: String, // TODO: remove when every applet has a different key
    devhub_dna_hash: String,
    happ_entry_action_hash: String,
    happ_release_hash: String,
) -> WeResult<AppInfo> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from("install_applet_bundle_if_necessary")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'install_applet_bundle_if_necessary'.");
    }

    log::info!("Installing: app_id = {:?}", app_id);

    window.emit("applet-install-progress", "Checking for existing applets in conductor")?;

    let mut admin_ws = admin_ws.lock().await;

    let apps = admin_ws.list_apps(Some(AppStatusFilter::Disabled)).await?;

    let is_disabled = apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&app_id);

    if is_disabled {
        let app_info = admin_ws.enable_app(app_id).await?;
        return Ok(app_info.app);
    }

    let pub_key = AgentPubKey::from(AgentPubKeyB64::from_b64_str(agent_pub_key.as_str())
        .map_err(|e| WeError::HashConversionError(format!("Failed to convert agent public key string to AgentPubKeyb64: {}", e)))?
    );
    let devhub_dna_hash =
        DnaHash::from(DnaHashB64::from_b64_str(devhub_dna_hash.as_str())
            .map_err(|e| WeError::HashConversionError(format!("Failed to convert dna hash string to DnaHashB64: {}", e)))?
    );
    let happ_release_action_hash =
        ActionHash::from(ActionHashB64::from_b64_str(happ_release_hash.as_str())
            .map_err(|e| WeError::HashConversionError(format!("Failed to convert action hash string to ActionHashB64: {}", e)))?
    );


    let mut app_agent_websocket = AppAgentWebsocket::connect(
        format!(
            "ws://localhost:{}",
            ports.0,
        ),
        appstore_app_id(&app_handle),
        meta_lair_client.lock().await.lair_client(),
    )
    .await?;

    let hosts = get_available_hosts_for_zome_function(
        &mut app_agent_websocket,
        &devhub_dna_hash,
        ZomeName::from(String::from("happ_library")),
        FunctionName::from(String::from("get_happ_release")),
    ).await?;

    if hosts.len() == 0 {
        return Err(WeError::NoAvailableHostsError(()));
    }

    let mut errors = vec![];

    window.emit("applet-install-progress", "fetching happ and ui from peer host")?;

    let mut success = false;

    for host in hosts {

        match fetch_and_store_happ_and_ui_from_host_if_necessary(
            &mut app_agent_websocket,
            &we_fs,
            happ_release_action_hash.clone(),
            host,
            devhub_dna_hash.clone(),
        ).await {
            Ok((happ_release_info, gui_release_info)) => {
                we_fs.apps_store().store_happ_release_info(&app_id, happ_release_info)?;
                if let Some(info) = gui_release_info {
                    we_fs.apps_store().store_gui_release_info(&app_id, info)?;
                }
                success = true;
                break;
            },
            Err(e) => errors.push(e)
        }
    }

    if !success {
        return Err(WeError::PortalRemoteCallError(format!("Failed to fetch happ and UI from all available hosts. All errors: {:?}", errors)))
    }

    // store HappEntry info
    we_fs.apps_store().store_happ_entry_locator(
        &app_id,
        ResourceLocatorB64 {
            dna_hash: devhub_dna_hash.into(),
            resource_hash: AnyDhtHash::try_from(
                ActionHash::from(ActionHashB64::from_b64_str(happ_entry_action_hash.as_str())
                    .map_err(|e| WeError::HashConversionError(format!("Failed to convert action hash string to ActionHashB64: {}", e)))?
                )
            ).map_err(|e| WeError::HashConversionError(format!("Failed to convert HappEntry action hash to AnyDhtHash: {:?}", e)))?
            .into(),
        }
    )?;


    let mut converted_membrane_proofs: HashMap<String, MembraneProof> = HashMap::new();
    for (dna_slot, proof) in membrane_proofs.iter() {
        converted_membrane_proofs.insert(
            dna_slot.clone(),
            Arc::new(SerializedBytes::from(UnsafeBytes::from(proof.clone()))),
        );
    }

    window.emit("applet-install-progress", "installing")?;

    let happ_option = we_fs
        .happs_store()
        .get_happ(HappIdentifier::HappReleaseHash(
            ActionHashB64::from_b64_str(happ_release_hash.as_str()).unwrap()
        )
    )?;


    let app_info = match happ_option {
        None => return Err(WeError::CustomError(String::from("No happ bundle found to install."))),
        Some(happ) => {
            admin_ws
            .install_app(InstallAppPayload {
                source: AppBundleSource::Bundle(happ),
                agent_key: pub_key,
                installed_app_id: Some(app_id.clone()),
                network_seed,
                membrane_proofs: converted_membrane_proofs,
            })
            .await?
        }
    };

    admin_ws.enable_app(app_id.clone()).await?;

    log::info!("Installed and enabled hApp {}", app_id);

    admin_ws.close();

    Ok(app_info)
}


#[tauri::command]
pub async fn update_applet_ui(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    meta_lair_client: tauri::State<'_, Mutex<MetaLairClient>>,
    ports: tauri::State<'_, (AdminPort, AppPort)>,
    we_fs: tauri::State<'_, WeFileSystem>,
    app_id: String,
    devhub_dna_hash: String,
    gui_release_hash: String,
) -> WeResult<()> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from("update_applet_ui")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'update_applet_ui'.");
    }

    let dna_hash_b64 = DnaHashB64::from_b64_str(&devhub_dna_hash.as_str())
        .map_err(|e| WeError::HashConversionError(format!("Failed to convert dna hash string to DnaHashB64: {}", e)))?;

    let gui_release_hash_b64 = ActionHashB64::from_b64_str(gui_release_hash.as_str())
        .map_err(|e| WeError::HashConversionError(format!("Failed to convert action hash string to ActionHashB64: {}", e)))?;

    let gui_release_action_hash = ActionHash::from(gui_release_hash_b64.clone());

    let ui_identifier = UiIdentifier::GuiReleaseHash(gui_release_hash_b64.clone());

    match we_fs.ui_store().assets_dir(ui_identifier.clone()).exists() {
        true => {
            let version = we_fs.ui_store().get_gui_version(ui_identifier);
            let gui_release_info = ReleaseInfo {
                resource_locator: Some(
                    ResourceLocatorB64 {
                        dna_hash: dna_hash_b64,
                        resource_hash: AnyDhtHash::try_from(ActionHash::from(gui_release_hash_b64))
                            .map_err(|e| WeError::HashConversionError(format!("Failed to convert ActionHashB64 to AnyDhtHashB64: {}", e)))?
                            .into(),
                    }
                ),
                version,
            };
            we_fs.apps_store().store_gui_release_info(&app_id, gui_release_info)
        },
        false => {

            let mut app_agent_websocket = AppAgentWebsocket::connect(
                format!(
                    "ws://localhost:{}",
                    ports.1,
                ),
                appstore_app_id(&app_handle),
                meta_lair_client.lock().await.lair_client(),
            )
            .await?;

            window.emit("applet-install-progress", "pinging available hosts")?;

            let hosts = get_available_hosts_for_zome_function(
                &mut app_agent_websocket,
                &DnaHash::from(dna_hash_b64.clone()),
                ZomeName::from(String::from("happ_library")),
                FunctionName::from(String::from("get_webasset_file")),
            ).await?;

            if hosts.len() == 0 {
                return Err(WeError::NoAvailableHostsError(()));
            }

            let mut errors = vec![];

            window.emit("applet-install-progress", "fetching ui from available peer host")?;

            let mut success = false;

            for host in hosts {

                match fetch_and_store_ui_from_host_if_necessary(
                    &mut app_agent_websocket,
                    &we_fs,
                    gui_release_action_hash.clone(),
                    host,
                    DnaHash::from(dna_hash_b64.clone()),
                ).await {
                    Ok(gui_version) => {
                        let gui_release_info = ReleaseInfo {
                            resource_locator: Some(
                                ResourceLocatorB64 {
                                    dna_hash: dna_hash_b64,
                                    resource_hash: AnyDhtHash::try_from(ActionHash::from(gui_release_hash_b64))
                                        .map_err(|e| WeError::HashConversionError(format!("Failed to convert ActionHashB64 to AnyDhtHashB64: {}", e)))?
                                        .into(),
                                }
                            ),
                            version: Some(gui_version),
                        };
                        we_fs.apps_store().store_gui_release_info(&app_id, gui_release_info)?;
                        success = true;
                        break;
                    },
                    Err(e) => errors.push(e)
                }
            }

            if !success {
                return Err(WeError::PortalRemoteCallError(format!("Failed to fetch UI from all available hosts: {:?}", errors)))
            }

            Ok(())
        }
    }
}

#[tauri::command]
pub async fn fetch_available_ui_updates(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    meta_lair_client: tauri::State<'_, Mutex<MetaLairClient>>,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
    ports: tauri::State<'_, (AdminPort, AppPort)>,
    we_fs: tauri::State<'_, WeFileSystem>,
) -> WeResult<HashMap<InstalledAppId, Option<ResourceLocatorB64>>> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from("fetch_available_ui_updates")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'fetch_available_ui_updates'.");
    }

    let mut admin_ws = admin_ws.lock().await;

    let mut happ_release_info_map: HashMap<DnaHashB64, HashMap<InstalledAppId, ResourceLocatorB64>> = HashMap::new();
    let mut gui_release_info_map: HashMap<InstalledAppId, ActionHashB64> = HashMap::new();
    let mut updates_map: HashMap<InstalledAppId, Option<ResourceLocatorB64>> = HashMap::new();

    let running_apps: Vec<AppInfo> = admin_ws.list_apps(Some(AppStatusFilter::Running)).await?;
    let running_applet_app_ids: Vec<InstalledAppId> = running_apps
        .into_iter()
        .filter(|app_info| app_info.installed_app_id.starts_with("applet#"))
        .map(|app_info| app_info.installed_app_id)
        .collect::<Vec<InstalledAppId>>();

    for applet in running_applet_app_ids {

        let happ_release_info = we_fs.apps_store().get_happ_release_info(&applet)?;

        if let Some(locator) = happ_release_info.resource_locator {

            let happ_release_locator_map = happ_release_info_map.get(&locator.dna_hash);

            match happ_release_locator_map {
                Some(map) => {
                    let mut owned_map = map.to_owned();
                    owned_map.insert(applet.clone(), locator.clone());
                    happ_release_info_map.insert(locator.dna_hash, owned_map);
                },
                None => {
                    let mut map = HashMap::new();
                    map.insert(applet.clone(), locator.clone());
                    happ_release_info_map.insert(locator.dna_hash, map);
                }
            };

            let gui_release_hashb64 = we_fs.apps_store().get_gui_release_hash(&applet)?;
            if let Some(hash) = gui_release_hashb64 {
                gui_release_info_map.insert(applet, hash);
            }
        }

    }


    let mut app_agent_websocket = AppAgentWebsocket::connect(
        format!(
            "ws://localhost:{}",
            ports.1,
        ),
        appstore_app_id(&app_handle),
        meta_lair_client.lock().await.lair_client(),
    )
    .await?;

    for (dna_hash, locator_map) in happ_release_info_map.iter() {
        let hosts = get_available_hosts_for_zome_function(
            &mut app_agent_websocket,
            &DnaHash::from(dna_hash.to_owned()),
            ZomeName::from(String::from("happ_library")),
            FunctionName::from(String::from("get_happ_release")),
        ).await?;

        for (applet, locator) in locator_map.iter() {

            let happ_release_hash = ActionHash::try_from(AnyDhtHash::from(locator.resource_hash.to_owned()))
                .map_err(|e| WeError::HashConversionError(
                    format!("Failed to convert resource hash to ActionHash: {:?}", e))
                )?;

            // TODO Optimization: Only fetch a given happ release once if multiple applets depend on it

            // we assume that if a host responds with a happ release entry that it's the latest version of that
            // entry and we don't query further hosts
            for host in hosts.clone() {

                match portal_remote_call::<GetEntityInput, Entity<HappReleaseEntry>>(
                    &mut app_agent_websocket,
                    host.clone(),
                    DnaHash::from(dna_hash.to_owned()),
                    String::from("happ_library"),
                    String::from("get_happ_release"),
                    GetEntityInput {
                        id: happ_release_hash.clone(),
                    }
                ).await {
                    Ok(entity) => {
                        // check whether official_gui is newer than current gui and if yes, add to updates_map
                        let existing_gui_release_hash = gui_release_info_map.get(applet);
                        match existing_gui_release_hash {
                            Some(hashb64) => {
                                if let Some(latest_hash) = entity.content.official_gui {
                                    if ActionHash::from(hashb64.to_owned()) != latest_hash {
                                        updates_map.insert(applet.to_owned(), Some(
                                            ResourceLocatorB64 {
                                                dna_hash: dna_hash.to_owned(),
                                                resource_hash: AnyDhtHashB64::from(AnyDhtHash::from(latest_hash)),
                                            }
                                        ));
                                    }
                                }
                            },
                            None => {
                                if let Some(latest_hash) = entity.content.official_gui {
                                    updates_map.insert(applet.to_owned(), Some(
                                        ResourceLocatorB64 {
                                            dna_hash: dna_hash.to_owned(),
                                            resource_hash: AnyDhtHashB64::from(AnyDhtHash::from(latest_hash)),
                                        }
                                    ));
                                }
                            }
                        }
                        break;
                    },
                    Err(e) => (),
                }
            }

        }
    }

    Ok(updates_map)
}

async fn fetch_and_store_ui_from_host_if_necessary(
    app_agent_websocket: &mut AppAgentWebsocket,
    we_fs: &WeFileSystem,
    gui_release_hash: ActionHash,
    host: AgentPubKey,
    devhub_dna: DnaHash,
) -> WeResult<String> {

    let gui_release_entry_entity: Entity<GUIReleaseEntry> = portal_remote_call(
        app_agent_websocket,
        host.clone(),
        devhub_dna.clone(),
        String::from("happ_library"),
        String::from("get_gui_release"),
        GetEntityInput {
            id: gui_release_hash.clone(),
        }
    ).await
    .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get gui release entry: {}", e)))?;

    let web_asset_file: Entity<FileEntry> = portal_remote_call(
        app_agent_websocket,
        host.clone(),
        devhub_dna.clone(),
        String::from("happ_library"),
        String::from("get_webasset_file"),
        GetEntityInput {
            id: gui_release_entry_entity.content.web_asset_id,
        }
        ).await
        .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get webasset file: {}", e)))?;

    let ui_bytes = fetch_mere_memory(
        app_agent_websocket,
        host.clone(),
        "web_assets",
        devhub_dna.clone(),
        web_asset_file.content.mere_memory_addr
    ).await
    .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get webasset file: {}", e)))?;

    let ui_identifier = UiIdentifier::GuiReleaseHash(ActionHashB64::from(gui_release_hash.clone()));

    // store gui
    let  gui_version = gui_release_entry_entity.content.version;
    we_fs.ui_store().store_ui(ui_identifier, ui_bytes, Some(gui_version.clone()))?;

    Ok(gui_version)
}


async fn fetch_and_store_happ_and_ui_from_host_if_necessary(
    app_agent_websocket: &mut AppAgentWebsocket,
    we_fs: &WeFileSystem,
    happ_release_hash: ActionHash,
    host: AgentPubKey,
    devhub_dna: DnaHash,
) -> WeResult<(ReleaseInfo, Option<ReleaseInfo>)> {

    // fetch HappReleaseEntry to check whether it's a happ or webhapp and to get the Manifest
    let happ_release_entry_entity: Entity<HappReleaseEntry> = portal_remote_call(
        app_agent_websocket,
        host.clone(),
        devhub_dna.clone(),
        String::from("happ_library"),
        String::from("get_happ_release"),
        GetEntityInput {
            id: happ_release_hash.clone(),
        }
    ).await
    .map_err(|e| WeError::PortalRemoteCallError(format!("{}", e)))?;

    let happ_identifier = HappIdentifier::HappReleaseHash(ActionHashB64::from(happ_release_hash.clone()));

    // Check whether happ is already installed and if not fetch it
    let happ_file = we_fs.happs_store().happ_package_path(happ_identifier.clone());
    match happ_file.exists() {
        true => (),
        false => {
            let happ_bundle_bytes = fetch_and_assemble_happ(
                app_agent_websocket,
                host.clone(),
                devhub_dna.clone(),
                happ_release_entry_entity.content.clone(),
            ).await?;

            we_fs.happs_store().store_happ(happ_identifier, happ_bundle_bytes).await?;
        }
    };

    let happ_release_info = ReleaseInfo {
        resource_locator: Some(
            ResourceLocator {
                dna_hash: devhub_dna.clone(),
                resource_hash: AnyDhtHash::from(happ_release_hash),
            }.into()
        ),
        version: Some(happ_release_entry_entity.content.version.clone()),
    };

    let (gui_release_hash, gui_version) = match happ_release_entry_entity.content.official_gui.clone() {
        Some(gui_release_hash) => {
            let gui_identifier = UiIdentifier::GuiReleaseHash(ActionHashB64::from(gui_release_hash.clone()));
            // check whether gui is installed already
            let assets_dir = we_fs.ui_store().assets_dir(gui_identifier.clone());
            match assets_dir.exists() {
                true => { // gui is already installed
                    let gui_version = we_fs.ui_store().get_gui_version(gui_identifier.clone());
                    (Some(gui_release_hash), gui_version)
                },
                false => {
                    let gui_version = fetch_and_store_ui_from_host_if_necessary(
                        app_agent_websocket,
                        we_fs,
                        gui_release_hash.clone(),
                        host.clone(),
                        devhub_dna.clone(),
                    ).await?;
                    (Some(gui_release_hash), Some(gui_version))
                    // // fetch gui
                    // let gui_release_entry_entity: Entity<GUIReleaseEntry> = portal_remote_call(
                    //     app_agent_websocket,
                    //     host.clone(),
                    //     devhub_dna.clone(),
                    //     String::from("happ_library"),
                    //     String::from("get_gui_release"),
                    //     GetEntityInput {
                    //         id: gui_release_hash.clone(),
                    //     }
                    // ).await
                    // .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get gui release entry: {}", e)))?;

                    // let web_asset_file: Entity<FileEntry> = portal_remote_call(
                    //     app_agent_websocket,
                    //     host.clone(),
                    //     devhub_dna.clone(),
                    //     String::from("happ_library"),
                    //     String::from("get_webasset_file"),
                    //     GetEntityInput {
                    //         id: gui_release_entry_entity.content.web_asset_id,
                    //     }
                    //   ).await
                    //   .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get webasset file: {}", e)))?;

                    // let ui_bytes = fetch_mere_memory(
                    //     app_agent_websocket,
                    //     host.clone(),
                    //     "web_assets",
                    //     devhub_dna.clone(),
                    //     web_asset_file.content.mere_memory_addr
                    // ).await
                    // .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get webasset file: {}", e)))?;

                    // // store gui
                    // let  gui_version = gui_release_entry_entity.content.version;
                    // we_fs.ui_store().store_ui(gui_identifier, ui_bytes, Some(gui_version.clone()))?;

                    // (Some(gui_release_hash), Some(gui_version))
                },
            }
        },
        None => (None, None),
    };

    let gui_release_info = match gui_release_hash {
        Some(hash) => Some(
            ReleaseInfo {
                resource_locator: Some(
                    ResourceLocator {
                        dna_hash: devhub_dna.clone(),
                        resource_hash: AnyDhtHash::from(hash),
                    }.into()
                ),
                version: gui_version,
            }
        ),
        None => None,
    };

    Ok((happ_release_info, gui_release_info))
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HappBundle {
    pub manifest: HappManifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}


/// Fetch and assemble a happ from a devhub host
async fn fetch_and_assemble_happ(
    app_agent_websocket: &mut AppAgentWebsocket,
    host: AgentPubKey,
    devhub_happ_library_dna_hash: DnaHash,
    mut happ_release_entry: HappReleaseEntry,
  ) -> WeResult<Vec<u8>>{

    // 1. Get all .dna files
    let mut dna_resources : BTreeMap<String, Vec<u8>> = BTreeMap::new();

    for (i, dna_ref) in happ_release_entry.dnas.iter().enumerate() {

        let dna_path = format!("./{}.dna", dna_ref.role_name );

        println!("Assembling data for dna with role_name: {}", dna_ref.role_name);
        println!("DNA path: {}", dna_path);

        let dna_version : Entity<DnaVersionEntry> = portal_remote_call(
            app_agent_websocket,
        host.clone(),
        devhub_happ_library_dna_hash.clone(),
        String::from("happ_library"),
        String::from("get_dna_version"),
        GetEntityInput {
            id: dna_ref.version.to_owned()
        },
        ).await
        .map_err(|e| WeError::PortalRemoteCallError(format!("Failed to get dna version: {}", e)))?;

        let mut resources : BTreeMap<String, Vec<u8>> = BTreeMap::new();
        let mut integrity_zomes : Vec<BundleIntegrityZomeInfo> = vec![];
        let mut coordinator_zomes : Vec<BundleZomeInfo> = vec![];

        for zome_ref in dna_version.content.integrity_zomes {
            let wasm_bytes = fetch_mere_memory(
                app_agent_websocket,
                host.clone(),
                "dnarepo",
                devhub_happ_library_dna_hash.clone(),
                zome_ref.resource,
            ).await
            .map_err(|e| WeError::MereMemoryError(format!("Failed to get zome from mere memory: {}", e)))?;

            let path = format!("./{}.wasm", zome_ref.name );

            integrity_zomes.push( BundleIntegrityZomeInfo {
                name: zome_ref.name.clone(),
                bundled: path.clone(),
                hash: None,
            });

            resources.insert(path,wasm_bytes);
        }

        for zome_ref in dna_version.content.zomes {
            let wasm_bytes = fetch_mere_memory(
                app_agent_websocket,
                host.clone(),
                "dnarepo",
                devhub_happ_library_dna_hash.clone(),
                zome_ref.resource,
            ).await
            .map_err(|e| WeError::MereMemoryError(format!("Failed to get zome from mere memory: {}", e)))?;


            let path = format!("./{}.wasm", zome_ref.name );


            coordinator_zomes.push( BundleZomeInfo {
                name: zome_ref.name.clone(),
                bundled: path.clone(),
                hash: None,
                dependencies: zome_ref.dependencies.iter().map( |name| DependencyRef { name: name.to_owned() }).collect(),
            });

            resources.insert(path,wasm_bytes);
        }

        let dna_bundle = DnaBundle {
            manifest: Manifest {
                manifest_version: "1".into(),
                name: dna_ref.role_name.clone(),
                integrity: IntegrityZomes {
                    origin_time: dna_version.content.origin_time.clone(),
                    network_seed: dna_version.content.network_seed.clone(),
                    properties: dna_version.content.properties.clone(),
                    zomes: integrity_zomes,
                },
                coordinator: CoordinatorZomes {
                    zomes: coordinator_zomes,
                },
            },
            resources: resources,
        };

        let dna_pack_bytes = encode_bundle( dna_bundle )
            .map_err(|e| WeError::CustomError(format!("Failed to encode bundle for dna {}: {}", dna_ref.role_name, e)))?;

            dna_resources.insert(dna_path.clone(), dna_pack_bytes);
            happ_release_entry.manifest.roles[i].dna.bundled = dna_path;
    }

    // println!("happ manifest: {:?}", happ_release_entry.manifest);
    // println!("dna_resources keys: {:?}", dna_resources.keys());

    let happ_bundle = HappBundle {
        manifest: happ_release_entry.manifest,
        resources: dna_resources,
    };

    let happ_pack_bytes = encode_bundle( happ_bundle )
        .map_err(|e| WeError::CustomError(format!("Failed to encode happ bundle: {}", e)))?;

    Ok(happ_pack_bytes)
}

async fn get_available_hosts_for_zome_function(
    app_store_client: &mut AppAgentWebsocket,
    devhub_dna: &DnaHash,
    zome_name: ZomeName,
    zome_function: FunctionName,
) -> WeResult<Vec<AgentPubKey>> {
    let hosts: EssenceResponse<Vec<hc_crud::Entity<HostEntry>>, Metadata, ()> = app_store_client
        .call_zome_fn(
            RoleName::from("portal"),
            ZomeName::from("portal_api"),
            FunctionName::from("get_hosts_for_zome_function"),
            ExternIO::encode(DnaZomeFunction {
                dna: devhub_dna.clone(),
                zome: zome_name,
                function: zome_function,
            })?,
        )
        .await?
        .decode()?;

    let hosts = hosts.as_result()?;
    let hosts: Vec<AgentPubKey> = hosts.into_iter().map(|e| e.content.author).collect();

    let mut handles = Vec::new();

    for host in hosts.iter() {
        let mut client = app_store_client.clone();
        let host = host.clone();
        handles.push(tokio::time::timeout(
            tokio::time::Duration::from_secs(3),
            tauri::async_runtime::spawn(async move { is_host_available(&mut client, &host).await }),
        ));
    }

    let mut available_hosts = Vec::new();

    for (i, handle) in handles.into_iter().enumerate() {
        if let Ok(Ok(Ok(true))) = handle.await {
            available_hosts.push(hosts[i].clone());
        }
    }

    Ok(available_hosts)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Metadata {
    pub composition: String,
}
async fn is_host_available(
    app_store_client: &mut AppAgentWebsocket,
    host: &AgentPubKey,
) -> WeResult<bool> {
    let response: EssenceResponse<bool, Metadata, ()> = app_store_client
        .call_zome_fn(
            RoleName::from("portal"),
            ZomeName::from("portal_api"),
            FunctionName::from("ping"),
            ExternIO::encode(host.clone())?,
        )
        .await?
        .decode()?;

    let r: bool = response.as_result()?;

    Ok(r)
}




#[derive(Debug, Serialize, Deserialize)]
pub struct CustomRemoteCallInput<T: Serialize + core::fmt::Debug> {
  host: AgentPubKey,
  call: RemoteCallDetails<String, String, T>,
}

/// Wrapper for remote calls through the portal_api
async fn portal_remote_call<T: Serialize + core::fmt::Debug, U: Serialize + DeserializeOwned + core::fmt::Debug>(
    app_agent_client: &mut AppAgentWebsocket,
    host: AgentPubKey,
    dna: DnaHash,
    zome: String,
    function: String,
    payload: T,
) -> Result<U, String> {

    let input = CustomRemoteCallInput {
        host,
        call: RemoteCallDetails {
            dna,
            zome: zome.clone(),
            function: function.clone(),
            payload,
        }
    };

    let result = app_agent_client
        .call_zome_fn(
        RoleName::from("portal"),
        ZomeName::from("portal_api"),
        FunctionName::from("custom_remote_call"),
        ExternIO::encode(input)?,
    ).await
        .map_err(|e| e.to_string())?;

    let response: DevHubResponse<DevHubResponse<U>> = result.decode()
        .map_err(|e| format!("Error decoding the remote call response for zome '{}' and function '{}': {}", zome, function, e))?;

    let inner_response = match response {
        DevHubResponse::Success(pack) => pack.payload,
        DevHubResponse::Failure(error) => {
            println!("Errorpayload: {:?}", error.payload);
            return Err(format!("Received ErrorPayload: {:?}", error.payload));
        },
    };

    let bytes = inner_response
        .as_result()
        .map_err(|e| format!("Failed to get content from DevHubResponse: {}", e))?;

    Ok(bytes)
  }


/// Fetching and combining bytes by mere_memory_address
async fn fetch_mere_memory(
    app_agent_client: &mut AppAgentWebsocket,
    host: AgentPubKey,
    dna_name: &str,
    devhub_happ_library_dna_hash: DnaHash,
    memory_address: EntryHash,
) -> Result<Vec<u8>, String> {

    // 1. get MemoryEntry
    let memory_entry: MemoryEntry = portal_remote_call(
        app_agent_client,
        host.clone(),
        devhub_happ_library_dna_hash.clone(),
        String::from("happ_library"),
        format!("{}_get_memory", dna_name),
        memory_address,
    ).await?;

    let mut memory_blocks: Vec<MemoryBlockEntry> = Vec::new();
    // 2. Assemble all MemoryEntryBlock's
    for block_address in memory_entry.block_addresses {
        let memory_block_entry: MemoryBlockEntry = portal_remote_call(
            app_agent_client,
            host.clone(),
            devhub_happ_library_dna_hash.clone(),
            String::from("happ_library"),
            format!("{}_get_memory_block", dna_name),
            block_address,
        ).await?;

        memory_blocks.push(memory_block_entry);
    }

    // 3. Sort and combine them
    memory_blocks.sort_by(|a, b| a.sequence.position.cmp(&b.sequence.position));

    let combined_memory = memory_blocks
        .into_iter()
        .map(|m| m.bytes)
        .flatten()
        .collect::<Vec<u8>>();

    Ok(combined_memory)
}



// ------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyRef {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleIntegrityZomeInfo {
    pub name: String,
    pub bundled: String,

    // Optional fields
    pub hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleZomeInfo {
    pub name: String,
    pub bundled: String,
    pub dependencies: Vec<DependencyRef>,

    // Optional fields
    pub hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manifest {
    pub manifest_version: String,
    pub name: String,
    pub integrity: IntegrityZomes,
    pub coordinator: CoordinatorZomes,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntegrityZomes {
    origin_time: HumanTimestamp,
    zomes: Vec<BundleIntegrityZomeInfo>,

    // Optional fields
    pub network_seed: Option<String>,
    pub properties: Option<BTreeMap<String, serde_yaml::Value>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CoordinatorZomes {
    zomes: Vec<BundleZomeInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bundle {
    pub manifest: Manifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DnaBundle {
    pub manifest: Manifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}

#[derive(Clone)]
struct AppAgentWebsocket {
    pub my_pub_key: AgentPubKey,
    app_ws: AppWebsocket,
    app_info: AppInfo,
    lair_client: LairClient,
}

impl AppAgentWebsocket {
    pub async fn connect(url: String, app_id: String, lair_client: LairClient) -> WeResult<Self> {
        let mut app_ws = AppWebsocket::connect(url)
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

        let app_info = app_ws
            .app_info(app_id.clone())
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?
            .ok_or(WeError::NotRunning)?;

        Ok(AppAgentWebsocket {
            my_pub_key: app_info.agent_pub_key.clone(),
            app_ws,
            app_info,
            lair_client,
        })
    }

    pub async fn call_zome_fn(
        &mut self,
        role_name: RoleName,
        zome_name: ZomeName,
        fn_name: FunctionName,
        payload: ExternIO,
    ) -> WeResult<ExternIO> {
        let cell_id = self.get_cell_id_from_role_name(&role_name)?;

        let agent_pub_key = self.app_info.agent_pub_key.clone();

        let (nonce, expires_at) = fresh_nonce(Timestamp::now())
            .map_err(|err| WeError::DatabaseError(format!("{:?}", err)))?;

        let zome_call_unsigned = ZomeCallUnsigned {
            provenance: agent_pub_key,
            cell_id,
            zome_name,
            fn_name,
            payload,
            cap_secret: None,
            expires_at,
            nonce,
        };

        let signed_zome_call = sign_zome_call_with_client(zome_call_unsigned, &self.lair_client)
            .await
            .map_err(|err| WeError::SignZomeCallError(err))?;

        let result = self.app_ws.call_zome(signed_zome_call).await?;

        Ok(result)
    }

    fn get_cell_id_from_role_name(&self, role_name: &RoleName) -> WeResult<CellId> {
        if is_clone_id(role_name) {
            let base_role_name = get_base_role_name_from_clone_id(role_name);

            let Some(role_cells) = self.app_info.cell_info.get(&base_role_name) else {
               return Err(WeError::AppWebsocketError(format!("No cell found with role_name {}", role_name)));
            };

            let maybe_clone_cell: Option<ClonedCell> =
                role_cells.into_iter().find_map(|cell| match cell {
                    CellInfo::Cloned(cloned_cell) => {
                        if cloned_cell.clone_id.0.eq(role_name) {
                            Some(cloned_cell.clone())
                        } else {
                            None
                        }
                    }
                    _ => None,
                });

            let clone_cell = maybe_clone_cell.ok_or(WeError::AppWebsocketError(format!(
                "No clone cell found with clone id {}",
                role_name
            )))?;
            return Ok(clone_cell.cell_id);
        } else {
            let Some(role_cells) = self.app_info.cell_info.get(role_name) else {
               return Err(WeError::AppWebsocketError(format!("No cell found with role_name {}", role_name)));
            };

            let maybe_provisioned: Option<ProvisionedCell> =
                role_cells.into_iter().find_map(|cell| match cell {
                    CellInfo::Provisioned(provisioned_cell) => Some(provisioned_cell.clone()),
                    _ => None,
                });

            let provisioned_cell = maybe_provisioned.ok_or(WeError::AppWebsocketError(format!(
                "No clone cell found with role id {}",
                role_name
            )))?;
            return Ok(provisioned_cell.cell_id);
        }
    }
}

fn is_clone_id(role_name: &RoleName) -> bool {
    role_name.as_str().contains(".")
}

fn get_base_role_name_from_clone_id(role_name: &RoleName) -> RoleName {
    RoleName::from(
        role_name
            .as_str()
            .split(".")
            .into_iter()
            .map(|s| s.to_string())
            .collect::<Vec<String>>()
            .first()
            .unwrap(),
    )
}

#[derive(Clone)]
pub struct AppWebsocket {
    tx: WebsocketSender,
}

impl AppWebsocket {
    pub async fn connect(app_url: String) -> WeResult<Self> {
        let url = url::Url::parse(&app_url).unwrap();
        let websocket_config = Arc::new(WebsocketConfig::default().max_frame_size(64 << 20));
        let websocket_config = Arc::clone(&websocket_config);
        let (tx, mut rx) = connect(url.clone().into(), websocket_config)
            .await
            .map_err(|e| ConductorApiError::WebsocketError(e))?;

        // close receiver because it is not needed
        match rx.take_handle() {
            Some(h) => h.close(),
            None => (),
        }

        Ok(Self { tx })
    }

    pub async fn app_info(
        &mut self,
        app_id: InstalledAppId,
    ) -> ConductorApiResult<Option<AppInfo>> {
        let msg = AppRequest::AppInfo {
            installed_app_id: app_id,
        };
        let response = self.send(msg).await?;
        match response {
            AppResponse::AppInfo(app_info) => Ok(app_info),
            _ => unreachable!("Unexpected response {:?}", response),
        }
    }

    pub async fn call_zome(&mut self, msg: ZomeCall) -> ConductorApiResult<ExternIO> {
        let app_request = AppRequest::CallZome(Box::new(msg));
        let response = self.send(app_request).await?;

        match response {
            AppResponse::ZomeCalled(result) => Ok(*result),
            _ => unreachable!("Unexpected response {:?}", response),
        }
    }

    pub async fn create_clone_cell(
        &mut self,
        msg: CreateCloneCellPayload,
    ) -> ConductorApiResult<ClonedCell> {
        let app_request = AppRequest::CreateCloneCell(Box::new(msg));
        let response = self.send(app_request).await?;
        match response {
            AppResponse::CloneCellCreated(clone_cell) => Ok(clone_cell),
            _ => unreachable!("Unexpected response {:?}", response),
        }
    }

    pub async fn enable_clone_cell(
        &mut self,
        payload: EnableCloneCellPayload,
    ) -> ConductorApiResult<ClonedCell> {
        let msg = AppRequest::EnableCloneCell(Box::new(payload));
        let response = self.send(msg).await?;
        match response {
            AppResponse::CloneCellEnabled(enabled_cell) => Ok(enabled_cell),
            _ => unreachable!("Unexpected response {:?}", response),
        }
    }

    pub async fn disable_clone_cell(
        &mut self,
        msg: DisableCloneCellPayload,
    ) -> ConductorApiResult<()> {
        let app_request = AppRequest::DisableCloneCell(Box::new(msg));
        let response = self.send(app_request).await?;
        match response {
            AppResponse::CloneCellDisabled => Ok(()),
            _ => unreachable!("Unexpected response {:?}", response),
        }
    }

    async fn send(&mut self, msg: AppRequest) -> ConductorApiResult<AppResponse> {
        let response = self
            .tx
            .request(msg)
            .await
            .map_err(|err| ConductorApiError::WebsocketError(err))?;

        match response {
            AppResponse::Error(error) => Err(ConductorApiError::ExternalApiWireError(error)),
            _ => Ok(response),
        }
    }
}






// pub async fn internal_fetch_applet_bundle(
//     app_handle: tauri::AppHandle,
//     conductor: &Conductor,
//     we_fs: &WeFileSystem,
//     devhub_dna: DnaHash,
//     happ_release_hash: ActionHash,
//     gui_release_hash: ActionHash,
// ) -> WeResult<WebAppBundle> {

//     // 1. Get HappReleaseEntry

//     // note that this is problematic. The webhapp is defined by both happ release hash and gui release hash.
//     // doing it like this will result in returning always the oldest UI of a given happ release.
//     if let Some(happ) = we_fs.happs_store().get_happ(&happ_release_hash)? {
//         return Ok(web_app);
//     }

//     let bytes = fetch_web_happ(
//         app_handle,
//         conductor,
//         devhub_dna,
//         happ_release_hash.clone(),
//         gui_release_hash,
//     )
//     .await?;

//     let web_app_bundle = WebAppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
//         String::from("Failed to read Web hApp bundle file"),
//     )))?;

//     we_fs
//         .webapp_store()
//         .store_webapp(&happ_release_hash, &web_app_bundle)
//         .await?;

//     Ok(web_app_bundle)
// }


// async fn fetch_web_happ(
//     app_handle: tauri::AppHandle,
//     conductor: &Conductor,
//     devhub_dna: DnaHash,
//     happ_release_action_hash: ActionHash,
//     gui_release_action_hash: ActionHash,
// ) -> WeResult<Vec<u8>> {
//     let mut client = AppAgentWebsocket::connect(
//         format!(
//             "ws://localhost:{}",
//             conductor.list_app_interfaces().await?[0]
//         ),
//         appstore_app_id(&app_handle),
//         conductor.keystore().lair_client(),
//     )
//     .await?;

//     let payload = GetWebHappPackageInput {
//         name: String::from("app"),
//         happ_release_id: happ_release_action_hash,
//         gui_release_id: gui_release_action_hash,
//     };

//     // If we have the given devhub dna hash, shortcut to us being the host
//     let mut admin_ws = get_admin_ws(conductor).await?;
//     let apps = admin_ws.list_apps(Some(AppStatusFilter::Running)).await?;

//     // Otherwise, get the list of available host and try them one by one

//     let mut hosts = get_available_hosts(&mut client, &devhub_dna).await?;

//     for app in apps {
//         for (_app_name, cells) in app.cell_info {
//             for cell in cells {
//                 if let CellInfo::Provisioned(provisioned_cell) = cell {
//                     if provisioned_cell.cell_id.dna_hash().eq(&devhub_dna) {
//                         hosts.insert(0, app.agent_pub_key.clone());
//                     }
//                 }
//             }
//         }
//     }

//     if hosts.len() == 0 {
//         return Err(WeError::NoAvailableHostsError(()));
//     }

//     let mut errors = vec![];

//     for host in hosts {
//         let response = get_webhapp_from_host(&mut client, &devhub_dna, &host, &payload).await;
//         if let Ok(web_app_bytes) = response {
//             return Ok(web_app_bytes);
//         }

//         if let Err(err) = response {
//             println!("Error fetching applet {:?}", err);
//             errors.push(err);
//         }
//     }

//     admin_ws.close();

//     return Err(WeError::AppWebsocketError(format!(
//         "Couldn't fetch the webhapp from any of the hosts. Errors: {:?}",
//         errors
//     )));
// }


// async fn get_dna_package(
//     client: &mut AppAgentWebsocket,
//     dna_version_hash: ActionHash,
// ) -> WeResult<Entity<DnaVersionPackage>> {
//     let result = client
//         .call_zome_fn(
//             RoleName::from("dnarepo"),
//             ZomeName::from("dna_library"),
//             FunctionName::from("get_dna_version"),
//             ExternIO::encode(GetEntityInput {
//                 id: dna_version_hash.clone(),
//             })?,
//         )
//         .await?;
//     let dna_version: EntityResponse<DnaVersionEntry> = result.decode()?;
//     let dna_version = dna_version.as_result()?;

//     let result = client
//         .call_zome_fn(
//             RoleName::from("dnarepo"),
//             ZomeName::from("dna_library"),
//             FunctionName::from("get_dna"),
//             ExternIO::encode(GetEntityInput {
//                 id: dna_version.content.for_dna.clone(),
//             })?,
//         )
//         .await?;
//     let dna: EntityResponse<DnaEntry> = result.decode()?;
//     let dna = dna.as_result()?;

//     let mut integrity_zomes: Vec<BundleIntegrityZomeInfo> = vec![];
//     let mut coordinator_zomes: Vec<BundleZomeInfo> = vec![];
//     let mut resources: BTreeMap<String, Vec<u8>> = BTreeMap::new();

//     for zome_ref in dna_version.content.integrity_zomes.iter() {
//         let result = client
//             .call_zome_fn(
//                 RoleName::from("dnarepo"),
//                 ZomeName::from("mere_memory"),
//                 FunctionName::from("retrieve_bytes"),
//                 ExternIO::encode(zome_ref.resource.clone())?,
//             )
//             .await?;
//         let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
//         let bytes = bytes.as_result()?;
//         let path = format!("./{}.wasm", zome_ref.name);

//         integrity_zomes.push(BundleIntegrityZomeInfo {
//             name: zome_ref.name.clone(),
//             bundled: path.clone(),
//             hash: None,
//         });

//         resources.insert(path, bytes);
//     }

//     for zome_ref in dna_version.content.zomes.iter() {
//         let result = client
//             .call_zome_fn(
//                 RoleName::from("dnarepo"),
//                 ZomeName::from("mere_memory"),
//                 FunctionName::from("retrieve_bytes"),
//                 ExternIO::encode(zome_ref.resource.clone())?,
//             )
//             .await?;
//         let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
//         let bytes = bytes.as_result()?;
//         let path = format!("./{}.wasm", zome_ref.name);

//         coordinator_zomes.push(BundleZomeInfo {
//             name: zome_ref.name.clone(),
//             bundled: path.clone(),
//             hash: None,
//             dependencies: zome_ref
//                 .dependencies
//                 .iter()
//                 .map(|name| DependencyRef {
//                     name: name.to_owned(),
//                 })
//                 .collect(),
//         });

//         resources.insert(path, bytes);
//     }

//     let bundle = Bundle {
//         manifest: Manifest {
//             manifest_version: "1".into(),
//             name: dna.content.name,
//             integrity: IntegrityZomes {
//                 origin_time: dna_version.content.origin_time.clone(),
//                 network_seed: dna_version.content.network_seed.clone(),
//                 properties: dna_version.content.properties.clone(),
//                 zomes: integrity_zomes,
//             },
//             coordinator: CoordinatorZomes {
//                 zomes: coordinator_zomes,
//             },
//         },
//         resources,
//     };

//     let dna_pack_bytes =
//         encode_bundle(bundle).map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
//     let package = dna_version.content.to_package(dna_pack_bytes);

//     Ok(Entity {
//         id: dna_version.id,
//         action: dna_version.action,
//         address: dna_version.address,
//         ctype: EntityType::new("dna_version", "package"),
//         content: package,
//     })
// }