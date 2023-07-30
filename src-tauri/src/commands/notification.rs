use futures::lock::Mutex;
use holochain_types::prelude::{ActionHashB64, ActionHash};
use tauri::{AppHandle, Icon, Manager};
use tauri::api::notification::Notification;

use crate::error::WeError;
use crate::{
  error::WeResult,
  filesystem::WeFileSystem,
};
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
  pub icon_state: IconState
}

impl SysTrayIconState {
  pub fn get_icon_state(&self) -> IconState {
    self.icon_state.clone()
  }
}



#[tauri::command]
pub async fn notify(
  window: tauri::Window,
  app_handle: AppHandle,
  // we_fs: tauri::State<'_, WeFileSystem>,
  message: WeNotification,
  systray: bool,
  os: bool,
  // appstore_app_hash_b64: Option<String>,
  applet_name: Option<String>,
) -> WeResult<()> {
  if window.label() != "main" {
    return Err(WeError::UnauthorizedWindow(String::from("notify")));
  }

  // change systray icon
  if systray {
    let mutex = app_handle.state::<Mutex<SysTrayIconState>>();
    let systray_state = (*mutex).lock().await;

    match message.urgency.as_str() {
      "low" => (),
      "medium" => {
        let icon_path_option = app_handle.path_resolver().resolve_resource("icons/icon_priority_medium_32x32.png");
        if let Some(icon_path) = icon_path_option {
          app_handle.tray_handle().set_icon(Icon::File(icon_path))?;
        }
        match systray_state.get_icon_state() {
          IconState::Clean | IconState::Low => {
            let icon_path_option = app_handle.path_resolver().resolve_resource("icons/icon_priority_medium_32x32.png");
            if let Some(icon_path) = icon_path_option {
              app_handle.tray_handle().set_icon(Icon::File(icon_path))?;
            }
          },
          _ => (),
        }
      },
      "high" => {
        let icon_path_option = app_handle.path_resolver().resolve_resource("icons/icon_priority_high_32x32.png");
        if let Some(icon_path) = icon_path_option {
          app_handle.tray_handle().set_icon(Icon::File(icon_path))?;
        }
      },
      _ => log::error!("Got invalid notification urgency level: {}", message.urgency),
    }
  }

  // send os notification
  if os {

    let mut notification =  Notification::new(&app_handle.config().tauri.bundle.identifier)
      .body(message.body);

    match applet_name {
      Some(name) => notification = notification.title(format!("{} - {}", name, message.title)),
      None => notification = notification.title(message.title),
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

    notification.show()
      .map_err(|e| WeError::TauriApiError(e))?;
  }

  Ok(())

}


#[tauri::command]
pub async fn clear_systray_notification_state(
  window: tauri::Window,
  app_handle: AppHandle,
) -> WeResult<()> {
  if window.label() != "main" {
    return Err(WeError::UnauthorizedWindow(String::from("notify")));
  }

  let mutex = app_handle.state::<Mutex<SysTrayIconState>>();
  *mutex.lock().await = SysTrayIconState { icon_state: IconState::Clean };

  Ok(())
}
