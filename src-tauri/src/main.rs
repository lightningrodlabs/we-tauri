// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures::lock::Mutex;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use std::sync::Arc;

use tauri::Manager;

mod commands;
mod filesystem;
mod state;
use commands::{install_applet::install_applet, sign_zome_call::sign_zome_call};
use filesystem::keystore_path;
use state::{SetupState, WeState};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![sign_zome_call, install_applet])
        .setup(|app| {
            let app_data_dir = app.path_resolver().app_data_dir().unwrap();
            let path = keystore_path(&app_data_dir);

            let initialized = LairKeystoreManagerV0_2::is_initialized(path);

            let state = match initialized {
                true => WeState::Setup(SetupState::EnterPassword),
                false => WeState::Setup(SetupState::CreatePassword),
            };

            app.manage(Arc::new(Mutex::new(state)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
