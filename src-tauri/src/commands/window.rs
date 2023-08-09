use crate::error::{WeResult, WeError};

#[tauri::command]
pub async fn main_window_focused(window: tauri::Window) -> WeResult<bool> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("main_window_focused")));
    }
    window.is_focused().map_err(|err| WeError::TauriError(err))
}
