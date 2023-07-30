use tauri::{AppHandle, CustomMenuItem, Manager, SystemTrayMenu, Wry, SystemTrayMenuItem, Icon};
use crate::window::build_main_window;

pub fn handle_system_tray_event(app: &AppHandle<Wry>, event_id: String) {
    match event_id.as_str() {
        "open" => {
            let main_window = app.get_window("main");

            if let Some(window) = main_window {
                window.show().unwrap();
                window.unminimize().unwrap();
                window.set_focus().unwrap();
                // tauri function to clear SysTrayIconState is routed via the frontend because the systray callback cannot be async
                window.emit("clear-systray-notification-state", ()).unwrap();
            } else {
                let _r = build_main_window(app);
            }

            // clear notification dots
            let icon_path_option = app.path_resolver().resolve_resource("icons/32x32.png");
            if let Some(icon_path) = icon_path_option {
                match app.tray_handle().set_icon(Icon::File(icon_path)) {
                    Ok(()) => (),
                    Err(e) => log::error!("Failed to set system tray icon: {}", e)
                };
            }
        }
        "restart" => app.app_handle().restart(),
        "quit" => app.exit(0),
        _ => (),
    }
}

pub fn app_system_tray() -> SystemTrayMenu {
    let mut menu = SystemTrayMenu::new();
    menu = menu.add_item(CustomMenuItem::new("open".to_string(), "Open"));
    menu = menu.add_item(CustomMenuItem::new("restart".to_string(), "Restart"));
    menu = menu.add_native_item(SystemTrayMenuItem::Separator);
    menu = menu.add_item(CustomMenuItem::new("quit".to_string(), "Quit"));
    menu
}
