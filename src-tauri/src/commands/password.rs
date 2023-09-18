use futures::lock::Mutex;
use holochain_client::AdminWebsocket;
use tauri::{AppHandle, Manager};

use crate::{
    config::WeConfig,
    error::{WeResult, WeError},
    filesystem::WeFileSystem,
    launch::launch,
};

#[tauri::command]
pub async fn is_keystore_initialized(window: tauri::Window, fs: tauri::State<'_, WeFileSystem>) -> WeResult<bool> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("is_keystore_initialized")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'is_keystore_initialized'.");
    }
    Ok(fs.keystore_initialized())
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
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'create_password'.");
    }
    let (_meta_lair_client, _admin_port, _app_port) = launch(&app_handle, &config, &fs, password).await?;

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
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'enter_password'.");
    }
    let (_meta_lair_client, _admin_port, _app_port) = launch(&app_handle, &config, &fs, password).await?;

    Ok(())
}
