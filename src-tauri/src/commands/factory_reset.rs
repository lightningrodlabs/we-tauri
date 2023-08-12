use std::{path::PathBuf, io, fs};
use tauri::Manager;
use crate::filesystem::WeFileSystem;

#[tauri::command]
pub async fn execute_factory_reset(
  window: tauri::Window,
  fs: tauri::State<'_, WeFileSystem>,
  app_handle: tauri::AppHandle,
  delete_logs: bool,
) -> Result<(), String> {
  if window.label() != "main" {
    return Err(String::from("Attempted to call tauri command 'execute_factory_reset' from unauthorized window."))
  }

  log::warn!("Factory reset requested.");

  // First, close all windows other than the main window
  let windows = app_handle.windows();

  for (label, w) in windows {
    if !label.eq(&String::from("main")) {
      if let Err(err) = w.close() {
        log::error!("[tauri command / execute_factory_reset] Error closing window {:?}", err);
      }
    }
  }

  println!("App data dir: {:?}", fs.app_data_dir());


  if delete_logs {
    remove_dir_if_exists(fs.app_data_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove app data directory: {}", err);
        format!("Could not remove app data directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.app_config_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove app config directory: {}", err);
        format!("Could not remove app config directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.app_log_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove app config directory: {}", err);
        format!("Could not remove app config directory: {}", err)
      }
    )?;

  } else {
    // ATTENTION: On Linux and Windows app_log_dir is a subdirectory of app_config_dir
    // (https://docs.rs/tauri/latest/tauri/api/path/fn.app_log_dir.html)
    // Deleting app_config_dir must therefore not be deleted if logs are to be kept.
    remove_dir_if_exists(fs.conductor_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove conductor directory: {}", err);
        format!("Could not remove conductor directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.keystore_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove keystore directory: {}", err);
        format!("Could not remove keystore directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.apps_store().root_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove  apps directory: {}", err);
        format!("Could not remove apps directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.happs_store().root_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove  happs directory: {}", err);
        format!("Could not remove happs directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.ui_store().root_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove uis directory: {}", err);
        format!("Could not remove uis directory: {}", err)
      }
    )?;
    remove_dir_if_exists(fs.icon_store().root_dir())
      .map_err(|err| {
        log::error!("[tauri command / execute_factory_reset] Could not remove icons directory: {}", err);
        format!("Could not remove icons directory: {}", err)
      }
    )?;
  }

  app_handle.restart();

  log::warn!("Restarted We, factory reset completed.");

  Ok(())

}



fn remove_dir_if_exists(path: PathBuf) -> io::Result<()> {
  if let Ok(_) = fs::read_dir(path.clone()) {
    fs::remove_dir_all(path)?;
  }
  Ok(())
}



