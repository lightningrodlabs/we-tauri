// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod default_apps;
mod filesystem;
mod launch;
mod state;
use commands::{
    conductor_info::{get_conductor_info, is_launched},
    install_applet::install_applet,
    password::{create_password, enter_password, is_keystore_initialized},
    sign_zome_call::sign_zome_call,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sign_zome_call,
            install_applet,
            create_password,
            enter_password,
            is_keystore_initialized,
            is_launched,
            get_conductor_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
