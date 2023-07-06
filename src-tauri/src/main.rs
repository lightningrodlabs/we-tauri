// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use applet_iframes::{pong_iframe, read_asset, start_applet_uis_server};
use config::WeConfig;
use filesystem::WeFileSystem;
use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use hyper::StatusCode;
use launch::get_admin_ws;
use serde_json::Value;
use tauri::{
    http::ResponseBuilder, Manager, RunEvent, UserAttentionType, WindowBuilder, WindowUrl,
};

mod applet_iframes;
mod commands;
mod config;
mod default_apps;
mod filesystem;
mod launch;
mod state;
use commands::{
    conductor_info::{get_conductor_info, is_launched},
    devhub::{disable_dev_mode, enable_dev_mode, is_dev_mode_enabled, open_devhub},
    install_applet_bundle::{fetch_icon, install_applet_bundle},
    password::{create_password, enter_password, is_keystore_initialized},
    sign_zome_call::sign_zome_call,
};

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
            is_dev_mode_enabled,
            enable_dev_mode,
            disable_dev_mode,
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

            let title = if profile.as_str() == "default" {
                String::from("We")
            } else {
                format!("We - {}", profile)
            };

            let app_handle = app.handle();

            let window = WindowBuilder::new(app, "we", WindowUrl::App("index.html".into()))
                .title(title)
                .disable_file_drop_handler()
                .inner_size(1000.0, 700.0)
                .build()?;

            let ui_server_port = portpicker::pick_unused_port().expect("No ports free");
            start_applet_uis_server(app_handle, ui_server_port);

            app.manage(WeConfig {
                network_seed,
                applets_ui_port: ui_server_port,
            });

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
            if request.uri().starts_with("applet://ping") {
                return ResponseBuilder::new()
                    .status(StatusCode::ACCEPTED)
                    .mimetype("text/html")
                    .body(pong_iframe().as_bytes().to_vec());
            }
            // prepare our response
            tauri::async_runtime::block_on(async move {
                let we_fs = app_handle.state::<WeFileSystem>();
                let mutex = app_handle.state::<Mutex<ConductorHandle>>();
                let conductor = mutex.lock().await;

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
                let lowercase_applet_id = uri_components.get(0).unwrap();
                let mut asset_file = PathBuf::new();
                for i in 1..uri_components.len() {
                    asset_file = asset_file.join(uri_components[i].clone());
                }
                let mut admin_ws = get_admin_ws(&conductor).await?;

                match read_asset(
                    &we_fs,
                    &mut admin_ws,
                    lowercase_applet_id,
                    asset_file.as_os_str().to_str().unwrap().to_string(),
                )
                .await
                {
                    Ok(Some((asset, mime_type))) => {
                        let mut response = ResponseBuilder::new().status(StatusCode::ACCEPTED);
                        if let Some(mime_type) = mime_type {
                            response = response.mimetype(mime_type.as_str());
                        }

                        return response.body(asset);
                    }
                    Ok(None) => ResponseBuilder::new()
                        .status(StatusCode::NOT_FOUND)
                        .body(vec![]),
                    Err(e) => ResponseBuilder::new()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(format!("{:?}", e).as_bytes().to_vec()),
                }
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
