use tauri::api::process;
use tauri::{CustomMenuItem, Manager, Menu, Submenu, Window, Wry};
use tauri::api::dialog::message;

use crate::{logs::open_logs_folder, filesystem::WeFileSystem, APP_NAME};

pub fn build_menu() -> Menu {

	let version = CustomMenuItem::new("version".to_string(), "Version");
	let open_logs = CustomMenuItem::new("open_logs".to_string(), "Open Logs");
    let factory_reset = CustomMenuItem::new("factory_reset".to_string(), "Factory Reset");
	let devtools = CustomMenuItem::new("devtools".to_string(), "Open DevTools");
	let restart = CustomMenuItem::new("restart".to_string(), "Restart");
	let quit = CustomMenuItem::new("quit".to_string(), "Quit");

	let menu_submenu = Submenu::new(
        "Menu",
        Menu::new()
            .add_item(devtools.clone())
            .add_item(restart.clone())
            .add_item(quit.clone())
	);

    let settings_submenu = Submenu::new(
        "Settings",
        Menu::new()
        .add_item(version.clone())
        .add_item(open_logs.clone())
        .add_item(factory_reset.clone())
    );



	// special menu for macOS
	if cfg!(target_os = "macos") {
        let app_menu_submenu = Submenu::new(
            APP_NAME, // This is the menu title on macOS
            Menu::new()
                .add_item(devtools)
                .add_item(restart)
                .add_item(quit)
        );


        let settings_submenu_macos = Submenu::new(
        "Settings",
        Menu::new()
            .add_item(version.clone())
            .add_item(open_logs.clone())
            .add_item(factory_reset.clone())
        );

        return Menu::os_default(APP_NAME)
            .add_submenu(app_menu_submenu)
            .add_submenu(settings_submenu_macos)
	}

	Menu::new()
        .add_submenu(menu_submenu)
        .add_submenu(settings_submenu)
}

pub fn handle_menu_event(event_id: &str, window: &Window<Wry>) {
    let app_handle = window.app_handle();
    let fs = app_handle.state::<WeFileSystem>();
    match event_id {
        "version" => message(Some(&window), APP_NAME, format!("Version {}", app_handle.package_info().version.to_string())),
        "open_logs" => open_logs_folder(fs.inner().to_owned()),
        "devtools" => window.open_devtools(),
        "factory_reset" => window.emit("request-factory-reset", ()).unwrap(),
        "restart" => {
            process::kill_children();
            app_handle.restart();
        },
        "quit" => {
            process::kill_children();
            app_handle.exit(0)
        },
        _ => {}
    }
}
