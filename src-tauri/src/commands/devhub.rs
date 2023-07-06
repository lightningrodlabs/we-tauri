use std::collections::HashMap;

use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use holochain::prelude::AgentPubKeyB64;
use holochain_client::AgentPubKey;
use holochain_client::AppStatusFilter;
use holochain_client::InstallAppPayload;
use holochain_launcher_utils::window_builder::happ_window_builder;
use holochain_types::web_app::WebAppBundle;

use crate::config::WeConfig;
use crate::default_apps::devhub_app_id;
use crate::default_apps::network_seed;
use crate::filesystem::WeFileSystem;
use crate::launch::get_admin_ws;
use crate::state::WeResult;

#[tauri::command]
pub async fn is_dev_mode_enabled(
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
) -> WeResult<bool> {
    // let mut admin_ws = (*(admin_ws)).clone();
    let conductor = conductor.lock().await;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    let apps = admin_ws.list_apps(Some(AppStatusFilter::Enabled)).await?;

    Ok(apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&devhub_app_id()))
}

#[tauri::command]
pub async fn enable_dev_mode(
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
    agent_key_b64: String,
) -> WeResult<()> {
    if is_dev_mode_enabled(conductor.clone()).await? {
        let conductor = conductor.lock().await;

        let mut admin_ws = get_admin_ws(&conductor).await?;
        admin_ws.enable_app(devhub_app_id()).await?;
        return Ok(());
    }
    let conductor = conductor.lock().await;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    let dev_hub_bundle = WebAppBundle::decode(include_bytes!("../../../DevHub.webhapp"))?;

    let agent_key =
        AgentPubKey::from(AgentPubKeyB64::from_b64_str(agent_key_b64.as_str()).unwrap());

    admin_ws
        .install_app(InstallAppPayload {
            source: holochain_types::prelude::AppBundleSource::Bundle(
                dev_hub_bundle.happ_bundle().await?,
            ),
            agent_key,
            network_seed: Some(network_seed(&config)),
            installed_app_id: Some(devhub_app_id()),
            membrane_proofs: HashMap::new(),
        })
        .await?;

    fs.webapp_store()
        .store_webapp(&devhub_app_id(), &dev_hub_bundle)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn disable_dev_mode(conductor: tauri::State<'_, Mutex<ConductorHandle>>) -> WeResult<()> {
    let conductor = conductor.lock().await;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    admin_ws.disable_app(devhub_app_id()).await?;

    Ok(())
}

#[tauri::command]
pub async fn open_devhub(
    app_handle: tauri::AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
) -> WeResult<()> {
    let devhub_app_id = devhub_app_id();

    let ui_path = fs.webapp_store().webhapp_ui_path(&devhub_app_id);

    let conductor = conductor.lock().await;

    happ_window_builder(
        &app_handle,
        devhub_app_id,
        String::from("devhub"),
        String::from("DevHub"),
        holochain_launcher_utils::window_builder::UISource::Path(ui_path.clone()),
        ui_path.join(".localstorage"),
        conductor.list_app_interfaces().await?[0],
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Cannot get admin_port"),
        true,
    )
    .build()?;

    Ok(())
}
