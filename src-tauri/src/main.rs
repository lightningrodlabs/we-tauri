// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use config::WeConfig;
use filesystem::WeFileSystem;
use futures::lock::Mutex;
use holochain_web_app_manager::WebAppManager;
use serde_json::Value;
use tauri::{
    http::{status::StatusCode, Request, Response, ResponseBuilder},
    Manager, RunEvent, UserAttentionType, WindowBuilder, WindowUrl,
};

mod commands;
mod config;
mod default_apps;
mod filesystem;
mod launch;
mod state;
use commands::{
    conductor_info::{get_conductor_info, is_launched},
    devhub::open_devhub,
    install_applet_bundle::{fetch_icon, install_applet_bundle},
    password::{create_password, enter_password, is_keystore_initialized},
    sign_zome_call::sign_zome_call,
};
use state::{LaunchedState, WeResult};

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
            <script type="module">
              {}
            </script>
          </body>
        </html>
    "#,
        include_str!("../../ui/applet-iframe/dist/index.mjs")
    )
}

fn main() {
    let disable_deep_link = std::env::var("DISABLE_DEEP_LINK").is_ok();

    if !disable_deep_link {
        // Needs to be equal to the identifier in tauri.conf.json
        tauri_plugin_deep_link::prepare("we");
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sign_zome_call,
            open_devhub,
            install_applet_bundle,
            create_password,
            enter_password,
            is_keystore_initialized,
            is_launched,
            get_conductor_info,
            fetch_icon
        ])
        .setup(move |app| {
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

            // reading profile from cli
            let network_seed = match cli_matches.args.get("network-seed") {
                Some(data) => match data.value.clone() {
                    Value::String(network_seed) => Some(network_seed),
                    _ => None,
                },
                None => None,
            };
            app.manage(WeConfig { network_seed });

            let title = if profile.as_str() == "default" {
                String::from("We")
            } else {
                format!("We - {}", profile)
            };

            let app_handle = app.handle();

            let window = WindowBuilder::new(app, "we", WindowUrl::App("index.html".into()))
                .title(title)
                .inner_size(1000.0, 800.0)
                .on_web_resource_request(move |request, mut response| {
                    println!("hi");
                    if request.uri().starts_with("https://uhCEk") {
                    println!("hi2");
                        tauri::async_runtime::block_on(async {
                            let mutex = app_handle.state::<Mutex<LaunchedState>>();
                            let m = mutex.lock().await;

                            if let Err(err) = handle_request(&m.web_app_manager, request, &mut response) {
                                println!("Error handling the request: {:?}", err);
                            }
                        });
                    }
                })
                .build()?;

            if !disable_deep_link {
                if let Err(err) = tauri_plugin_deep_link::register("we", move |request| {
                    window.emit("deep-link-received", request).unwrap();
                    window
                        .request_user_attention(Some(UserAttentionType::Informational))
                        .unwrap();
                }) {
                    println!("Error registering the deep link plugin: {:?}", err);
                }
            }

            Ok(())
        })
        .register_uri_scheme_protocol("applet", |app_handle, request| {
            // prepare our response
            tauri::async_runtime::block_on(async move {
                let mut response = ResponseBuilder::new().body(vec![]).unwrap();

                let mutex = app_handle.state::<Mutex<LaunchedState>>();
                let m = mutex.lock().await;

                handle_request(&m.web_app_manager, request, &mut response)?;

                return Ok(response);
            })
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            // This event is emitted upon quitting the Launcher via cmq+Q on macOS.
            // Sidecar binaries need to get explicitly killed in this case (https://github.com/holochain/launcher/issues/141)
            if let RunEvent::Exit = event {
                tauri::api::process::kill_children();
            }
        });
}

fn handle_request(
    web_app_manager: &WebAppManager,
    request: &Request,
    response: &mut Response,
) -> WeResult<()> {
    let uri_without_protocol = request
        .uri()
        .split("://")
        .map(|s| s.to_string())
        .collect::<Vec<String>>()
        .get(1)
        .unwrap()
        .clone();
    let uri_without_querystring: String = uri_without_protocol
        .split("?")
        .map(|s| s.to_string())
        .collect::<Vec<String>>()
        .get(0)
        .unwrap()
        .clone();
    let uri_components: Vec<String> = uri_without_querystring
        .split("/")
        .map(|s| s.to_string())
        .collect();

    let applet_id = uri_components.get(0).unwrap();

    let assets_path = web_app_manager.get_app_assets_dir(&applet_id, &String::from("default"));
    let mut asset_file = assets_path.clone();
    for i in 1..uri_components.len() {
        asset_file = asset_file.join(uri_components[i].clone());
    }

    if let None | Some("index.html") | Some("") = uri_components.get(1).map(|s| s.as_str()) {
        let mutable_response = response.body_mut();
        *mutable_response = iframe().as_bytes().to_vec();
        response.set_mimetype(Some("text/html".to_string()));
        return Ok(());
    }

    let mime_guess = mime_guess::from_path(asset_file.clone());

    let mime_type = match mime_guess.first() {
        Some(mime) => Some(mime.essence_str().to_string()),
        None => {
            log::info!("Could not determine MIME Type of file '{:?}'", asset_file);
            // println!("\n### ERROR ### Could not determine MIME Type of file '{:?}'\n", asset_file);
            None
        }
    };

    match std::fs::read(asset_file.clone()) {
        Ok(asset) => {
            let mutable_response = response.body_mut();
            *mutable_response = asset;
            response.set_mimetype(mime_type.clone());
        }
        Err(_) => response.set_status(StatusCode::NOT_FOUND),
    }

    Ok(())
}
