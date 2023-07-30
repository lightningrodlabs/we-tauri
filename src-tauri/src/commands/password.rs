use futures::lock::Mutex;
use tauri::{AppHandle, Manager};

use crate::{
    config::WeConfig,
    error::{WeResult, WeError},
    filesystem::WeFileSystem,
    launch::{get_admin_ws, launch},
};

#[tauri::command]
pub async fn is_keystore_initialized(window: tauri::Window, fs: tauri::State<'_, WeFileSystem>) -> WeResult<bool> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("is_keystore_initialized")));
    }
    let exists = fs
        .keystore_dir()
        .join("lair-keystore-config.yaml")
        .exists();
    Ok(exists)
}

#[tauri::command]
pub async fn create_password(
    window: tauri::Window,
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    password: String,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("create_password")));
    }
    let conductor = launch(&app_handle, &config, &fs, password).await?;

    let admin_ws = get_admin_ws(&conductor).await?;

    app_handle.manage(Mutex::new(conductor));
    app_handle.manage(admin_ws);

    Ok(())
}

#[tauri::command]
pub async fn enter_password(
    window: tauri::Window,
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    password: String,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("enter_password")));
    }
    let conductor = launch(&app_handle, &config, &fs, password).await?;

    app_handle.manage(Mutex::new(conductor));

    Ok(())
}
