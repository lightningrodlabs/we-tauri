// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use filesystem::WeFileSystem;
use futures::lock::Mutex;
use holochain_launcher_utils::window_builder::read_resource_from_path;
use serde_json::Value;
use tauri::{http::ResponseBuilder, Manager, UserAttentionType, WindowBuilder, WindowUrl};

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
    format!(
        r#"
        <html>
          <head>
            <style>
              body {{
                margin: 0; 
                height: 100%; 
                width: 100%; 
                display: flex;
              }}
            </style>
            <link href="/styles.css" rel="stylesheet"></link>
          </head>
          <body>
            <script src="/applet-iframe.js"></script>
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
                .title("We")
                .build()?;

            if let Err(err) = tauri_plugin_deep_link::register("we-group", move |request| {
                // window.emit("join-group", request).unwrap();
                // window
                //     .request_user_attention(Some(UserAttentionType::Informational))
                //     .unwrap();
            }) {
                println!("Error registering the deep link plugin: {:?}", err);
            }

            Ok(())
        })
        .register_uri_scheme_protocol("applet", |app_handle, request| {
            // prepare our response
            let response_builder = ResponseBuilder::new();

            let uri = request.uri().strip_prefix("applet://").unwrap();
            let uri_components: Vec<String> = uri.split("/").map(|s| s.to_string()).collect();

            let applet_id = uri_components.get(0).unwrap();

            if let Some(mutex) = app_handle.try_state::<Mutex<LaunchedState>>() {
                match uri_components.get(1).map(|s| s.as_str()) {
                    None | Some("index.html") | Some("") => {
                        return response_builder
                            .mimetype("text/html")
                            .status(200)
                            .body(iframe().as_bytes().to_vec());
                    }
                    Some("applet-iframe.js") => {
                        // Redirect
                        return response_builder
                            .mimetype("text/javascript")
                            .status(200)
                            .body(
                                include_bytes!("../../ui/applet-iframe/dist/index.mjs").to_vec(),
                            );
                    }
                    _ => {
                        let r = tauri::async_runtime::block_on(async {
                            let m = mutex.lock().await;

                            let assets_path = m
                                .web_app_manager
                                .get_app_assets_dir(&applet_id, &String::from("default"));
                            let mut path = assets_path;
                            for i in 1..uri_components.len() {
                                path = path.join(uri_components[i].clone());
                            }

                            let mut response = response_builder.status(200).body(vec![]).unwrap();

                            read_resource_from_path(path, &mut response, true, None);

                            return response;
                        });
                        return Ok(r);
                    }
                }
            }

            return Err("Not found")?;
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
