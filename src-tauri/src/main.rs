// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

use applet_iframes::{pong_iframe, read_asset, start_applet_uis_server};
use config::WeConfig;
use filesystem::{Profile, WeFileSystem};
use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use hyper::StatusCode;
use launch::get_admin_ws;
use logs::setup_logs;
use menu::{build_menu, handle_menu_event};
use serde_json::Value;
use system_tray::{app_system_tray, handle_system_tray_event};
use tauri::{
    http::ResponseBuilder, Manager, RunEvent, UserAttentionType, SystemTray, SystemTrayEvent, WindowEvent,
};

mod applet_iframes;
mod commands;
mod config;
mod default_apps;
mod error;
mod filesystem;
mod launch;
mod logs;
mod menu;
mod system_tray;
mod window;
use commands::{
    conductor_info::{get_conductor_info, is_launched},
    devhub::{disable_dev_mode, enable_dev_mode, is_dev_mode_enabled, open_appstore, open_devhub},
    factory_reset::execute_factory_reset,
    install_applet_bundle::{fetch_icon, install_applet_bundle_if_necessary, update_applet_ui},
    join_group::join_group,
    notification::{notify_tauri, IconState, clear_systray_notification_state},
    password::{create_password, enter_password, is_keystore_initialized},
    sign_zome_call::sign_zome_call, notification::SysTrayIconState,
};
use window::build_main_window;

pub const APP_NAME: &str = "We";

fn main() {
    let disable_deep_link = std::env::var("DISABLE_DEEP_LINK").is_ok();

    if !disable_deep_link {
        // Needs to be equal to the identifier in tauri.conf.json
        tauri_plugin_deep_link::prepare("we");
    }

    tauri::Builder::default()
        .menu(build_menu())
        .on_menu_event(|event| handle_menu_event(event.menu_item_id(), event.window()))
        .system_tray(SystemTray::new().with_menu(app_system_tray()))
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => handle_system_tray_event(app, id),
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            clear_systray_notification_state,
            create_password,
            disable_dev_mode,
            enable_dev_mode,
            enter_password,
            execute_factory_reset,
            fetch_icon,
            get_conductor_info,
            install_applet_bundle_if_necessary,
            is_dev_mode_enabled,
            is_keystore_initialized,
            is_launched,
            join_group,
            notify_tauri,
            open_appstore,
            open_devhub,
            sign_zome_call,
            update_applet_ui,
        ])
        .setup(move |app| {
            let handle = app.handle();

            // reading profile from cli
            let cli_matches = app.get_cli_matches()?;
            let profile: Profile = match cli_matches.args.get("profile") {
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
            app.manage(fs.clone());
            app.manage(profile);
            app.manage(Mutex::new(SysTrayIconState { icon_state: IconState::Clean }));

            // reading network seed from cli
            let network_seed = match cli_matches.args.get("network-seed") {
                Some(data) => match data.value.clone() {
                    Value::String(network_seed) => Some(network_seed),
                    _ => None,
                },
                None => None,
            };

            // set up logs
            if let Err(err) = setup_logs(fs) {
                println!("Error setting up the logs: {:?}", err);
            }

            let app_handle = app.handle();

            let window = build_main_window(&app_handle)?;

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
                    window.show().unwrap();
                    window.unminimize().unwrap();
                    window.set_focus().unwrap();

                    if cfg!(target_os = "linux") { // remove dock icon wiggeling after 10 seconds
                        std::thread::sleep(std::time::Duration::from_secs(10));
                        window
                        .request_user_attention(None)
                        .unwrap();
                    }
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
                    .header("Content-Type", "text/html;charset=utf-8")
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

                let r = match read_asset(
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
                            response = response.header("Content-Type", format!("{};charset=utf-8", mime_type))
                        } else {
                            response = response.header("Content-Type", "charset=utf-8")
                        }

                        return response.body(asset);
                    }
                    Ok(None) => ResponseBuilder::new()
                        .status(StatusCode::NOT_FOUND)
                        .body(vec![]),
                    Err(e) => ResponseBuilder::new()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(format!("{:?}", e).as_bytes().to_vec()),
                };

                admin_ws.close();
                r
            })
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            match event {
                // This event is emitted upon pressing the x to close the App window
                // The app is prevented from exiting to keep it running in the background with the system tray
                RunEvent::ExitRequested { api, .. } => api.prevent_exit(),

                // also let the window run in the background to have the UI keep listening to notifications
                RunEvent::WindowEvent { label, event, .. } => {
                    if label == "main" {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let main_window = app_handle.get_window("main").unwrap();
                            main_window.hide().unwrap();
                        }
                    }
                },

                _ => (),
            }

        });
}