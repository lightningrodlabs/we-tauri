use crate::window::build_main_window;
use tauri::{
    api::process, AppHandle, CustomMenuItem, Manager, SystemTrayMenu, SystemTrayMenuItem, Wry,
};

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
        }
        "restart" => {
            process::kill_children();
            app.app_handle().restart();
        }
        "quit" => {
            process::kill_children();
            app.exit(0);
        }
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
