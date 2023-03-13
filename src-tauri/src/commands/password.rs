use std::path::PathBuf;

use futures::lock::Mutex;
use holochain_manager::config::LaunchHolochainConfig;
use holochain_web_app_manager::WebAppManager;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use tauri::{api::process::Command, Manager};

use crate::{
    filesystem::{conductor_path, keystore_path},
    launch::launch,
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

    app_handle.manage(Mutex::new(state));

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

    app_handle.manage(Mutex::new(state));

    Ok(())
}
