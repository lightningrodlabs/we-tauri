use tauri::{AppHandle, Window, WindowBuilder, WindowUrl, Manager};
use crate::{filesystem::Profile, APP_NAME};

pub fn build_main_window(app_handle: &AppHandle) -> Result<Window, tauri::Error> {
    let profile = app_handle.state::<Profile>().inner().to_owned();

    let title = if profile.as_str() == "default" {
        APP_NAME.to_string()
    } else {
        format!("{} - {}", APP_NAME, profile)
    };

    WindowBuilder::new(app_handle, "main", WindowUrl::App("index.html".into()))
        .title(title)
        .disable_file_drop_handler()
        .inner_size(1000.0, 700.0)
        .build()
}