use futures::lock::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    default_apps::we_app_id,
    state::{LaunchedState, WeResult},
};

#[tauri::command]
pub fn is_launched(app_handle: AppHandle) -> WeResult<bool> {
    let connected_state: Option<tauri::State<'_, Mutex<LaunchedState>>> = app_handle.try_state();
    Ok(connected_state.is_some())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ConductorInfo {
    app_port: u16,
    admin_port: u16,
    we_app_id: String,
}

#[tauri::command]
pub async fn get_conductor_info(
    state: tauri::State<'_, Mutex<LaunchedState>>,
) -> WeResult<ConductorInfo> {
    let mut m = state.lock().await;

    Ok(ConductorInfo {
        app_port: m.web_app_manager.app_interface_port(),
        admin_port: m.web_app_manager.admin_interface_port(),
        we_app_id: we_app_id(),
    })
}
