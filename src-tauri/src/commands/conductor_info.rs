use futures::lock::Mutex;
use holochain_client::AdminWebsocket;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    config::WeConfig,
    default_apps::{appstore_app_id, devhub_app_id},
    error::{WeResult, WeError}, launch::{AdminPort, AppPort},
};

#[tauri::command]
pub fn is_launched(window: tauri::Window, app_handle: AppHandle) -> WeResult<bool> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("is_launched")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'is_launched'.");
    }
    let connected_state: Option<tauri::State<'_, Mutex<AdminWebsocket>>> = app_handle.try_state();
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
    window: tauri::Window,
    app_handle: AppHandle,
    ports: tauri::State<'_, (AdminPort, AppPort)>,
    config: tauri::State<'_, WeConfig>,
) -> WeResult<ConductorInfo> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("get_conductor_info")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'get_conductor_info'.");
    }

    Ok(ConductorInfo {
        app_port: ports.1,
        admin_port: ports.0,
        applets_ui_port: config.applets_ui_port,
        appstore_app_id: appstore_app_id(&app_handle),
        devhub_app_id: devhub_app_id(&app_handle),
    })
}
