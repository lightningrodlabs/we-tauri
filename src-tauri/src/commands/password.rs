use std::{path::PathBuf, sync::Arc};

use futures::lock::Mutex;
use holochain_manager::config::LaunchHolochainConfig;
use holochain_web_app_manager::WebAppManager;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use tauri::{api::process::Command, Manager};

use crate::{
    filesystem::{conductor_path, keystore_path},
    state::{holochain_version, log_level, LaunchedState, WeError, WeResult},
};

#[tauri::command]
pub async fn is_keystore_initialized(app_handle: tauri::AppHandle) -> WeResult<bool> {
    let app_data_dir = app_handle.path_resolver().app_data_dir().unwrap();
    let path = keystore_path(&app_data_dir);

    let initialized = LairKeystoreManagerV0_2::is_initialized(path);
    Ok(initialized)
}

#[tauri::command]
pub async fn create_password(app_handle: tauri::AppHandle, password: String) -> WeResult<()> {
    let app_data_dir =
        app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?;

    let app_config_dir =
        app_handle
            .path_resolver()
            .app_config_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the config dir for this app",
            )))?;

    LairKeystoreManagerV0_2::initialize(keystore_path(&app_data_dir), password.clone()).await?;

    let state = launch(&app_data_dir, &app_config_dir, password).await?;

    app_handle.manage(Arc::new(Mutex::new(state)));

    Ok(())
}

#[tauri::command]
pub async fn enter_password(app_handle: tauri::AppHandle, password: String) -> WeResult<()> {
    let app_data_dir =
        app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?;

    let app_config_dir =
        app_handle
            .path_resolver()
            .app_config_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the config dir for this app",
            )))?;

    let state = launch(&app_data_dir, &app_config_dir, password).await?;

    app_handle.manage(Arc::new(Mutex::new(state)));

    Ok(())
}

async fn launch(
    app_data_dir: &PathBuf,
    app_config_dir: &PathBuf,
    password: String,
) -> WeResult<LaunchedState> {
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

    Ok(LaunchedState {
        lair_keystore_manager,
        web_app_manager,
    })
}
