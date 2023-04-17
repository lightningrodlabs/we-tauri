// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use filesystem::WeFileSystem;
use futures::lock::Mutex;
use holochain_launcher_utils::window_builder::read_resource_from_path;
use serde_json::Value;
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

pub fn iframe(applet_id: &String) -> String {
    format!(
        r#"
        <html>
          <head>
            <link href="/applet/{applet_id}/styles.css" rel="stylesheet"></link>
          </head>
          <body>
          </body>
        </html>
    "#
    )
}

fn main() {
    // Needs to be equal to the identifier in tauri.conf.json
    tauri_plugin_deep_link::prepare("we");

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

            // reading profile from cli
            let cli_matches = app.get_cli_matches()?;
            let profile: String = match cli_matches.args.get("profile") {
                Some(data) => match data.value.clone() {
                    Value::String(profile) => {
                        if profile == "default" {
                            eprintln!("Error: The name 'default' is not allowed for a profile.");
                            panic!("Error: The name 'default' is not allowed for a profile.");
                        }
                        profile
                    }
                    _ => {
                        // println!("ERROR: Value passed to --profile option could not be interpreted as string.");
                        String::from("default")
                        // panic!("Value passed to --profile option could not be interpreted as string.")
                    }
                },
                None => String::from("default"),
            };

            let fs = WeFileSystem::new(&handle, &profile)?;
            app.manage(fs);

            let window = WindowBuilder::new(app, "we", WindowUrl::App("index.html".into()))
                .on_web_resource_request(move |request, response| {
                    let uri = request.uri();
                    let uri_components: Vec<String> =
                        uri.split("/").map(|s| s.to_string()).collect();

                    if let Some("applet") = uri_components.get(3).map(|s| s.as_str()) {
                        if let Some(mutex) = handle.try_state::<Mutex<LaunchedState>>() {
                            if let Some(applet_id) = uri_components.get(4) {
                                match uri_components.get(5).map(|s| s.as_str()) {
                                    None | Some("index.html") => {
                                        let mutable_response = response.body_mut();
                                        *mutable_response = iframe(&applet_id).as_bytes().to_vec();
                                    }
                                    _ => tauri::async_runtime::block_on(async {
                                        let m = mutex.lock().await;

                                        let assets_path = m.web_app_manager.get_app_assets_dir(
                                            &applet_id,
                                            &String::from("default"),
                                        );
                                        let mut path = assets_path;
                                        for i in 5..uri_components.len() {
                                            path = path.join(uri_components[i].clone());
                                        }
                                        read_resource_from_path(path, response, true, None);
                                    }),
                                }
                            }
                        }
                    }
                })
                .title("We")
                .build()?;

            tauri_plugin_deep_link::register("we-group", move |request| {
                let network_seed = request.split("//").last().unwrap().to_string();
                window.emit("join-group", network_seed).unwrap();
            })
            .unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
