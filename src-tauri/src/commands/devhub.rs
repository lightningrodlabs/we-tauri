use futures::lock::Mutex;
use holochain_launcher_utils::window_builder::happ_window_builder;

use crate::default_apps::devhub_app_id;
use crate::state::WeError;
use crate::state::{LaunchedState, WeResult};

#[tauri::command]
pub async fn open_devhub(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Mutex<LaunchedState>>,
) -> WeResult<()> {
    let devhub_app_id = devhub_app_id();
    let mut m = state.lock().await;

    let ui_name = String::from("default");

    let assets_path = m
        .web_app_manager
        .get_app_assets_dir(&devhub_app_id, &ui_name);
    let local_storage_path = m
        .web_app_manager
        .get_app_local_storage_dir(&devhub_app_id, &ui_name);

    happ_window_builder(
        &app_handle,
        devhub_app_id,
        String::from("DevHub"),
        String::from("DevHub"),
        holochain_launcher_utils::window_builder::UISource::Path(assets_path),
        local_storage_path,
        m.web_app_manager.app_interface_port(),
        m.web_app_manager.admin_interface_port(),
        true,
    )
    .build()
    .map_err(|err| WeError::TauriError(format!("{:?}", err)))?;

    Ok(())
}
