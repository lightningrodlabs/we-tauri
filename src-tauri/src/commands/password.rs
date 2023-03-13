use futures::lock::Mutex;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};

use crate::{
    filesystem::keystore_path,
    state::{launch, WeError, WeResult, WeState},
};

#[tauri::command]
pub async fn create_password(
    state: tauri::State<'_, Mutex<WeState>>,
    app_handle: tauri::AppHandle,
    password: String,
) -> WeResult<()> {
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

    let running_state = launch(&app_data_dir, &app_config_dir, password).await?;
    let mut m = state.lock().await;
    (*m) = WeState::Running(running_state);

    Ok(())
}
