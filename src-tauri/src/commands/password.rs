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
    let (meta_lair_client, app_port, admin_port) = launch(&app_handle, &config, &fs, password).await?;

	let admin_ws = AdminWebsocket::connect(format!(
		"ws://localhost:{}",
		admin_port
	))
	.await
	.map_err(|err| {
		WeError::AdminWebsocketError(format!("Could not connect to the admin interface: {}", err))
	})?;

    app_handle.manage(Mutex::new(meta_lair_client));
    app_handle.manage((admin_port, app_port));
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
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'enter_password'.");
    }
    let (meta_lair_client, app_port, admin_port) = launch(&app_handle, &config, &fs, password).await?;

	let admin_ws = AdminWebsocket::connect(format!(
		"ws://localhost:{}",
		admin_port
	))
	.await
	.map_err(|err| {
		WeError::AdminWebsocketError(format!("Could not connect to the admin interface: {}", err))
	})?;

    app_handle.manage(Mutex::new(meta_lair_client));
    app_handle.manage((admin_port, app_port));
    app_handle.manage(admin_ws);

    Ok(())
}
