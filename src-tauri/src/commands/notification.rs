use futures::lock::Mutex;
use tauri::api::notification::Notification;
use tauri::{AppHandle, Icon, Manager};

use crate::error::WeError;
use crate::error::WeResult;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]

pub struct WeNotification {
    title: String,
    body: String,
    notification_type: String,
    icon_src: Option<String>,
    urgency: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum IconState {
    Clean,
    Low,
    Medium,
    High,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SysTrayIconState {
    pub icon_state: IconState,
}

impl SysTrayIconState {
    pub fn get_icon_state(&self) -> IconState {
        self.icon_state.clone()
    }
}

#[tauri::command]
pub async fn notify_tauri(
    window: tauri::Window,
    app_handle: AppHandle,
    message: WeNotification,
    systray: bool,
    os: bool,
    // appstore_app_hash_b64: Option<String>,
    applet_name: Option<String>,
) -> WeResult<()> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from("notify_tauri")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'notify_tauri'.");
    }

    println!("Received notification request: {:?}", message);

    match window.is_focused() {
        // don't show notification dot in systray icon if window is already focused
        Ok(true) => return Ok(()),
        _ => (),
    }

    // change systray icon
    if systray {
        let mutex = app_handle.state::<Mutex<SysTrayIconState>>();

        match message.urgency.as_str() {
            "low" => (),
            "medium" => {
                let systray_icon_state = mutex.lock().await.get_icon_state();
                match systray_icon_state {
                    IconState::Clean | IconState::Low => {
                        println!("Current icon state: clean or low");
                        let icon_path_option = app_handle
                            .path_resolver()
                            .resolve_resource("icons/icon_priority_medium_32x32.png");
                        if let Some(icon_path) = icon_path_option {
                            app_handle.tray_handle().set_icon(Icon::File(icon_path))?;
                        }
                        *mutex.lock().await = SysTrayIconState {
                            icon_state: IconState::Medium,
                        };

                        println!(
                            "Current icon state after medium message: {:?}",
                            (*mutex).lock().await.get_icon_state()
                        );
                    }
                    _ => (),
                }
            }
            "high" => {
                let icon_path_option = app_handle
                    .path_resolver()
                    .resolve_resource("icons/icon_priority_high_32x32.png");
                if let Some(icon_path) = icon_path_option {
                    app_handle.tray_handle().set_icon(Icon::File(icon_path))?;
                }
                *mutex.lock().await = SysTrayIconState {
                    icon_state: IconState::High,
                };

                println!(
                    "Current icon state after urgent message: {:?}",
                    (*mutex).lock().await.get_icon_state()
                );
            }
            _ => log::error!(
                "Got invalid notification urgency level: {}",
                message.urgency
            ),
        }
    }

    // send os notification
    if os {
        let mut notification =
            Notification::new(&app_handle.config().tauri.bundle.identifier).body(message.body);

        match applet_name {
            Some(name) => {
                notification = notification.title(format!("{} - {}", name, message.title))
            }
            None => notification = notification.title(message.title),
        }

        // let icon_path = we_fs.icon_store().root_dir().join("uhCkkEYzzy0DoxAjfYrBj8SniQFJzQfMK7GjVfwjLE7xy13PFoiZl");
        // let icon_path = PathBuf::from("home").join("matthias").join("Pictures").join("cleave2.png");
        // match icon_path.into_os_string().into_string() {
        //   Ok(path_string) => notification = notification.icon(path_string),
        //   Err(e) => println!("Failed to convert icon_path into path_string: {:?}", e),
        // }

        if let Some(icon_path) = app_handle
            .path_resolver()
            .resolve_resource("icons/32x32.png")
        {
            match icon_path.into_os_string().into_string() {
                Ok(path_string) => notification = notification.icon(path_string),
                Err(e) => log::error!("Failed to convert icon path into os string: {:?}", e),
            }
        }

        // not working... icon method takes file path
        // println!("@notify: got appstore_app_hash_b64: {:?}", appstore_app_hash_b64);
        // if let Some(b64_hash) = appstore_app_hash_b64 {
        //   let appstore_app_hash =
        //     ActionHash::from(ActionHashB64::from_b64_str(b64_hash.as_str()).unwrap());

        //   match we_fs.icon_store().get_icon(&appstore_app_hash) {
        //     Ok(Some(icon)) => {
        //       println!("Got icon from icon_store: {}", icon);
        //       notification = notification.icon(icon)
        //     },
        //     _ => (),
        //   }
        // }

        notification.show().map_err(|e| WeError::TauriApiError(e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_systray_notification_state(
    window: tauri::Window,
    app_handle: AppHandle,
) -> WeResult<()> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from(
            "clear_systray_notification_state",
        )));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'clear_systray_notification_state'.");
    }

    // clear notification dots
    let icon_path_option = app_handle
        .path_resolver()
        .resolve_resource("icons/32x32.png");
    if let Some(icon_path) = icon_path_option {
        match app_handle.tray_handle().set_icon(Icon::File(icon_path)) {
            Ok(()) => (),
            Err(e) => log::error!("Failed to set system tray icon: {}", e),
        };
    }

    let mutex = app_handle.state::<Mutex<SysTrayIconState>>();
    *mutex.lock().await = SysTrayIconState {
        icon_state: IconState::Clean,
    };

    Ok(())
}
