use futures::lock::Mutex;
use holochain::conductor::Conductor;
use holochain_launcher_utils::window_builder::happ_window_builder;

use crate::default_apps::devhub_app_id;
use crate::launch::get_admin_ws;
use crate::state::WeError;
use crate::state::{LaunchedState, WeResult};

#[tauri::command]
pub async fn enable_dev_mode(
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    conductor: tauri::State<'_, Mutex<Conductor>>,
) -> WeResult<()> {
    let dev_hub_bundle = WebAppBundle::decode(include_bytes!("../../DevHub.webhapp"))?;

    let conductor = conductor.lock().await;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    admin_ws
        .install_app(InstallAppPayload {
            source: holochain_types::prelude::AppBundleSource::Bundle(
                dev_hub_bundle.happ_bundle()?,
            ),
            agent_key,
            network_seed: Some(network_seed(&config)),
            installed_app_id: Some(devhub_app_id()),
            membrane_proofs: HashMap::new(),
        })
        .await?;

    fs.webapp_store()
        .store_webhapp(&devhub_app_id(), dev_hub_bundle)?;

    Ok(())
}

#[tauri::command]
pub async fn open_devhub(
    app_handle: tauri::AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    conductor: tauri::State<'_, Mutex<Conductor>>,
) -> WeResult<()> {
    let devhub_app_id = devhub_app_id();

    let ui_path = fs.webhapp_ui_path(&devhub_app_id);

    let conductor = conductor.lock().await;

    happ_window_builder(
        &app_handle,
        devhub_app_id,
        String::from("devhub"),
        String::from("DevHub"),
        holochain_launcher_utils::window_builder::UISource::Path(ui_path),
        local_storage_path,
        conductor.list_app_interfaces()?[0],
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Cannot get admin_port"),
        true,
    )
    .build()?;

    Ok(())
}
