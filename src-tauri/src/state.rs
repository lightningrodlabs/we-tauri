use futures::lock::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{api::process::Command, AppHandle, Manager};

use holochain_manager::{config::LaunchHolochainConfig, versions::HolochainVersion};
use holochain_web_app_manager::{error::LaunchWebAppManagerError, WebAppManager};
use lair_keystore_manager::{
    error::LairKeystoreError, versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager,
};
use log::Level;

use crate::filesystem::{conductor_path, keystore_path};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SetupState {
    CreatePassword,
    EnterPassword,
}

#[tauri::command]
pub fn is_launched(app_handle: AppHandle) -> WeResult<bool> {
    let connected_state: Option<tauri::State<'_, LaunchedState>> = app_handle.try_state();
    Ok(connected_state.is_some())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PortsInfo {
    app_port: u16,
    admin_port: u16,
}

#[tauri::command]
pub async fn get_ports_info(state: tauri::State<'_, Mutex<LaunchedState>>) -> WeResult<PortsInfo> {
    let mut m = state.lock().await;

    Ok(PortsInfo {
        app_port: m.web_app_manager.app_interface_port(),
        admin_port: m.web_app_manager.admin_interface_port(),
    })
}

pub struct LaunchedState {
    pub lair_keystore_manager: LairKeystoreManagerV0_2,
    pub web_app_manager: WebAppManager,
}

// If not initialized: Not Running -->|run| Setup -->|init && launch(password)| Running
// If initialized:     Not Running -->|run| Setup -->|launch(password)| Running

pub fn holochain_version() -> HolochainVersion {
    HolochainVersion::V0_1_3
}

pub fn log_level() -> Level {
    Level::Warn
}

#[derive(Serialize, Deserialize, Debug, thiserror::Error)]
pub enum WeError {
    #[error("Filesystem error: `{0}`")]
    FileSystemError(String),
    #[error("Holochain is not running")]
    NotRunning,

    #[error(transparent)]
    LaunchWebAppManagerError(#[from] LaunchWebAppManagerError),

    #[error("Error managing apps: `{0}`")]
    WebAppManagerError(String),

    #[error(transparent)]
    LairKeystoreError(#[from] LairKeystoreError),

    #[error("Tauri error: `{0}`")]
    TauriError(String),
}

pub type WeResult<T> = Result<T, WeError>;
