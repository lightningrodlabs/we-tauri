use futures::lock::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use holochain_manager::versions::{mr_bundle_latest::error::MrBundleError, HolochainVersion};
use holochain_web_app_manager::{error::LaunchWebAppManagerError, WebAppManager};
use lair_keystore_manager::{error::LairKeystoreError, versions::v0_2::LairKeystoreManagerV0_2};
use log::Level;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SetupState {
    CreatePassword,
    EnterPassword,
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

    #[error("MrBundle error: `{0}`")]
    MrBundleError(String),

    #[error("Tauri error: `{0}`")]
    TauriError(String),
}

pub type WeResult<T> = Result<T, WeError>;
