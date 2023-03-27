use futures::lock::Mutex;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use tauri::{AppHandle, Manager};

use crate::{filesystem::WeFileSystem, launch::launch, state::WeResult};

#[tauri::command]
pub async fn is_keystore_initialized(fs: tauri::State<'_, WeFileSystem>) -> WeResult<bool> {
    let initialized = LairKeystoreManagerV0_2::is_initialized(fs.keystore_path());
    Ok(initialized)
}

#[tauri::command]
pub async fn create_password(
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    password: String,
    mdns: bool,
) -> WeResult<()> {
    LairKeystoreManagerV0_2::initialize(fs.keystore_path(), password.clone()).await?;

    let state = launch(&fs, password, mdns).await?;

    app_handle.manage(Mutex::new(state));

    Ok(())
}

#[tauri::command]
pub async fn enter_password(
    app_handle: AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    password: String,
    mdns: bool,
) -> WeResult<()> {
    let state = launch(&fs, password, mdns).await?;

    app_handle.manage(Mutex::new(state));

    Ok(())
}
