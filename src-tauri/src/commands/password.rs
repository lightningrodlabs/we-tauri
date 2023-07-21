use futures::lock::Mutex;
use tauri::{AppHandle, Manager};

use crate::{
    config::WeConfig,
    error::WeResult,
    filesystem::WeFileSystem,
    launch::{get_admin_ws, launch},
};

#[tauri::command]
pub async fn is_keystore_initialized(fs: tauri::State<'_, WeFileSystem>) -> WeResult<bool> {
    let exists = fs
        .keystore_path()
        .join("lair-keystore-config.yaml")
        .exists();
    Ok(exists)
}

#[tauri::command]
pub async fn create_password(
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    password: String,
) -> WeResult<()> {
    let conductor = launch(&app_handle, &config, &fs, password).await?;

    let admin_ws = get_admin_ws(&conductor).await?;

    app_handle.manage(Mutex::new(conductor));
    app_handle.manage(admin_ws);

    Ok(())
}

#[tauri::command]
pub async fn enter_password(
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    password: String,
) -> WeResult<()> {
    let conductor = launch(&app_handle, &config, &fs, password).await?;

    app_handle.manage(Mutex::new(conductor));

    Ok(())
}
