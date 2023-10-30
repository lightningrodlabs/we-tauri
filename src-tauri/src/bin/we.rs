// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures::lock::Mutex;
use serde_json::Value;
use tauri::{Manager, RunEvent, SystemTray, SystemTrayEvent, UserAttentionType, WindowEvent};

use we_alpha::applet_iframes::start_applet_uis_server;
use we_alpha::commands::notification::{IconState, SysTrayIconState};
use we_alpha::config::WeConfig;
use we_alpha::filesystem::{Profile, WeFileSystem};
use we_alpha::logs::setup_logs;
use we_alpha::system_tray::{app_system_tray, handle_system_tray_event};
use we_alpha::window::build_main_window;

fn main() {
    #[cfg(any(
        target_os = "linux",
        target_os = "freebsd",
        target_os = "dragonfly",
        target_os = "openbsd",
        target_os = "netbsd"
    ))]
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    let disable_deep_link = std::env::var("DISABLE_DEEP_LINK").is_ok();

    if !disable_deep_link {
        // Needs to be equal to the identifier in tauri.conf.json
        tauri_plugin_deep_link::prepare("we");
    }

    we_alpha::tauri_builder()
        .system_tray(SystemTray::new().with_menu(app_system_tray()))
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => handle_system_tray_event(app, id),
            _ => {}
        })
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
            app.manage(Mutex::new(SysTrayIconState {
                icon_state: IconState::Clean,
            }));

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

                    if cfg!(target_os = "linux") {
                        // remove dock icon wiggeling after 10 seconds
                        std::thread::sleep(std::time::Duration::from_secs(10));
                        window.request_user_attention(None).unwrap();
                    }
                }) {
                    println!("Error registering the deep link plugin: {:?}", err);
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            match event {
                // This event is emitted upon pressing the x to close the App window
                // The app is prevented from exiting to keep it running in the background with the system tray
                RunEvent::ExitRequested { api, .. } => api.prevent_exit(),

                // This event is emitted upon quitting the App via cmq+Q on macOS.
                // Sidecar binaries need to get explicitly killed in this case (https://github.com/holochain/launcher/issues/141)
                RunEvent::Exit => {
                    tauri::api::process::kill_children();
                }

                // also let the window run in the background to have the UI keep listening to notifications
                RunEvent::WindowEvent { label, event, .. } => {
                    if label == "main" {
                        if let WindowEvent::CloseRequested { api, .. } = event {
                            api.prevent_close();
                            let main_window = app_handle.get_window("main").unwrap();
                            main_window.hide().unwrap();
                        }
                    }
                }

                _ => (),
            }
        });
}
