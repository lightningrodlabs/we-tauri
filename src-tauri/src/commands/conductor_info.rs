use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    config::WeConfig,
    default_apps::{appstore_app_id, devhub_app_id},
    error::WeResult,
};

#[tauri::command]
pub fn is_launched(app_handle: AppHandle) -> WeResult<bool> {
    let connected_state: Option<tauri::State<'_, Mutex<ConductorHandle>>> = app_handle.try_state();
    Ok(connected_state.is_some())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConductorInfo {
    app_port: u16,
    admin_port: u16,
    applets_ui_port: u16,
    appstore_app_id: String,
    devhub_app_id: String,
}

#[tauri::command]
pub async fn get_conductor_info(
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
    config: tauri::State<'_, WeConfig>,
) -> WeResult<ConductorInfo> {
    let conductor = conductor.lock().await;

    Ok(ConductorInfo {
        app_port: conductor.list_app_interfaces().await?[0],
        admin_port: conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Couldn't get admin port"),
        applets_ui_port: config.applets_ui_port,
        appstore_app_id: appstore_app_id(),
        devhub_app_id: devhub_app_id(),
    })
}
