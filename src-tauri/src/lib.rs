use std::path::PathBuf;

use futures::lock::Mutex;
use holochain_client::AdminWebsocket;
use hyper::StatusCode;
use tauri::{http::ResponseBuilder, Manager};

pub const APP_NAME: &str = "We";
pub mod applet_iframes;
pub mod commands;
pub mod config;
pub mod default_apps;
pub mod error;
pub mod filesystem;
pub mod launch;
pub mod logs;
pub mod menu;
pub mod system_tray;
pub mod window;

use crate::{
    applet_iframes::{pong_iframe, read_asset},
    commands::{
        conductor_info::{get_conductor_info, is_launched},
        devhub::{
            disable_dev_mode, enable_dev_mode, is_dev_mode_enabled, open_appstore, open_devhub,
        },
        factory_reset::execute_factory_reset,
        install_applet_bundle::{
            fetch_available_ui_updates, fetch_icon, install_applet_bundle_if_necessary,
            update_applet_ui,
        },
        join_group::join_group,
        notification::{clear_systray_notification_state, notify_tauri},
        password::{create_password, enter_password, is_keystore_initialized},
        sign_zome_call::sign_zome_call,
    },
    filesystem::WeFileSystem,
    menu::{build_menu, handle_menu_event},
};

pub fn tauri_builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .menu(build_menu())
        .on_menu_event(|event| handle_menu_event(event.menu_item_id(), event.window()))
        .invoke_handler(tauri::generate_handler![
            clear_systray_notification_state,
            create_password,
            disable_dev_mode,
            enable_dev_mode,
            enter_password,
            execute_factory_reset,
            fetch_icon,
            fetch_available_ui_updates,
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
                let mutex = app_handle.state::<Mutex<AdminWebsocket>>();
                let mut admin_ws = mutex.lock().await;

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
                println!(
                    "Got applet request for applet with id: {}",
                    lowercase_applet_id
                );
                let mut asset_file = PathBuf::new();
                for i in 1..uri_components.len() {
                    asset_file = asset_file.join(uri_components[i].clone());
                }

                let r = match read_asset(
                    &we_fs,
                    &mut admin_ws,
                    lowercase_applet_id,
                    asset_file.as_os_str().to_str().unwrap().to_string(),
                )
                .await
                {
                    Ok(Some((asset, mime_type))) => {
                        println!("Got asset for applet with id: {}", lowercase_applet_id);
                        let mut response = ResponseBuilder::new().status(StatusCode::ACCEPTED);
                        if let Some(mime_type) = mime_type {
                            response = response
                                .header("Content-Type", format!("{};charset=utf-8", mime_type))
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
}
