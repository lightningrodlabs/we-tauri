// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures::lock::Mutex;
use holochain_launcher_utils::window_builder::read_resource_from_path;
use tauri::{Manager, WindowBuilder, WindowUrl};

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
use state::LaunchedState;

pub fn iframe() -> String {
    r#"
        <html><head></head><body><script type="module">
        import applet from '/index.js';
        console.log(applet);
        </script></body></html>
    "#
    .to_string()
}

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
        .setup(|app| {
            let handle = app.handle();
            WindowBuilder::new(app, "we", WindowUrl::App("index.html".into()))
                .on_web_resource_request(move |request, response| {
                    let uri = request.uri();
                    let mut uri_components = uri.split("/");
                    println!("{:?}", uri_components.nth(5));
                    if let Some("applet") = uri_components.nth(3) {
                        println!("hey0");
                        if let Some(mutex) = handle.try_state::<Mutex<LaunchedState>>() {
                            println!("hey1");
                            match uri_components.nth(5) {
                                None | Some("index.html") => {
                                    let mutable_response = response.body_mut();
                                    *mutable_response = iframe().as_bytes().to_vec();
                                }
                                _ => tauri::async_runtime::block_on(async {
                                    let m = mutex.lock().await;
                                    if let Some(applet_id) = uri_components.nth(4) {
                                        println!("hey4");
                                        let assets_path = m.web_app_manager.get_app_assets_dir(
                                            &applet_id.to_string(),
                                            &String::from("default"),
                                        );
                                        read_resource_from_path(assets_path, response, true, None);
                                    }
                                }),
                            }
                        }
                    }
                })
                .title("We")
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
