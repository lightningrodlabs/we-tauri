use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::api::process::Command;

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

pub struct RunningState {
    pub lair_keystore_manager: LairKeystoreManagerV0_2,
    pub web_app_manager: WebAppManager,
}

pub enum WeState {
    Setup(SetupState),
    Running(RunningState),
    Error(WeError),
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

pub async fn launch(
    app_data_dir: &PathBuf,
    app_config_dir: &PathBuf,
    password: String,
) -> WeResult<RunningState> {
    let lair_keystore_manager = LairKeystoreManagerV0_2::launch(
        log_level(),
        keystore_path(&app_data_dir),
        password.clone(),
    )
    .await
    .map_err(|err| WeError::LairKeystoreError(err))?;

    let version = holochain_version();
    let version_str = version.to_string();

    let admin_port = portpicker::pick_unused_port().expect("No ports free");

    let web_app_manager = WebAppManager::launch(
        version,
        LaunchHolochainConfig {
            log_level: log_level(),
            admin_port,
            command: Command::new_sidecar(format!("holochain-v{}", version_str))
                .map_err(|err| WeError::TauriError(format!("{:?}", err)))?,
            conductor_config_dir: conductor_path(&app_config_dir, &version),
            environment_path: conductor_path(&app_data_dir, &version),
            keystore_connection_url: lair_keystore_manager.connection_url(),
        },
        password.clone(),
    )
    .await?;

    Ok(RunningState {
        lair_keystore_manager,
        web_app_manager,
    })
}
