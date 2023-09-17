use std::collections::HashMap;

use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use holochain_client::AdminWebsocket;
use holochain_client::AppStatusFilter;
use holochain_client::InstallAppPayload;
use holochain_launcher_utils::window_builder::happ_window_builder;
use holochain_types::web_app::WebAppBundle;

use crate::config::WeConfig;
use crate::default_apps::appstore_app_id;
use crate::default_apps::devhub_app_id;
use crate::default_apps::network_seed;
use crate::error::WeError;
use crate::error::WeResult;
use crate::filesystem::UiIdentifier;
use crate::filesystem::WeFileSystem;
use crate::filesystem::create_dir_if_necessary;

#[tauri::command]
pub async fn is_dev_mode_enabled(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
) -> WeResult<bool> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("is_dev_mode_enabled")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'is_dev_mode_enabled'.");
    }
    let mut admin_ws = admin_ws.lock().await;

    let apps = admin_ws.list_apps(Some(AppStatusFilter::Enabled)).await?;

    Ok(apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&devhub_app_id(&app_handle)))
}

#[tauri::command]
pub async fn enable_dev_mode(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
    fs: tauri::State<'_, WeFileSystem>,
    config: tauri::State<'_, WeConfig>,
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("enable_dev_mode")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'enable_dev_mode'.");
    }
    let mut admin_ws = admin_ws.lock().await;

    let apps = admin_ws.list_apps(Some(AppStatusFilter::Disabled)).await?;

    let is_devhub_installed = apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&devhub_app_id(&app_handle));

    if is_devhub_installed {
        admin_ws.enable_app(devhub_app_id(&app_handle)).await?;
        return Ok(());
    }

    let dev_hub_bundle = WebAppBundle::decode(include_bytes!("../../../DevHub.webhapp"))?;

    let agent_key = admin_ws.generate_agent_pub_key().await?;
    admin_ws
        .install_app(InstallAppPayload {
            source: holochain_types::prelude::AppBundleSource::Bundle(
                dev_hub_bundle.happ_bundle().await?,
            ),
            agent_key,
            network_seed: Some(network_seed(&app_handle, &config)),
            installed_app_id: Some(devhub_app_id(&app_handle)),
            membrane_proofs: HashMap::new(),
        })
        .await?;
    admin_ws.enable_app(devhub_app_id(&app_handle)).await?;

    admin_ws.close();

    fs.ui_store()
        .extract_and_store_ui(UiIdentifier::Other(devhub_app_id(&app_handle)), &dev_hub_bundle)
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn disable_dev_mode(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("disable_dev_mode")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'disable_dev_mode'.");
    }
    let mut admin_ws = admin_ws.lock().await;

    admin_ws.disable_app(devhub_app_id(&app_handle)).await?;

    admin_ws.close();

    Ok(())
}

#[tauri::command]
pub async fn open_devhub(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("open_devhub")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'open_devhub'.");
    }
    let devhub_app_id = devhub_app_id(&app_handle);

    let ui_dir = fs.ui_store().assets_dir(UiIdentifier::Other(devhub_app_id.clone()));

    let app_dir = fs.apps_store().root_dir().join(&devhub_app_id);
    create_dir_if_necessary(&app_dir)?;

    let conductor = conductor.lock().await;

    happ_window_builder(
        &app_handle,
        devhub_app_id,
        String::from("devhub"),
        String::from("DevHub"),
        holochain_launcher_utils::window_builder::UISource::Path(ui_dir.clone()),
        app_dir.join("localStorage"),
        conductor.list_app_interfaces().await?[0],
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Cannot get admin_port"),
        true,
    )
    .build()?;

    Ok(())
}

#[tauri::command]
pub async fn open_appstore(
    window: tauri::Window,
    app_handle: tauri::AppHandle,
    fs: tauri::State<'_, WeFileSystem>,
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
) -> WeResult<()> {
    if window.label() != "main" {
      return Err(WeError::UnauthorizedWindow(String::from("open_appstore")));
    }
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'open_appstore'.");
    }
    let appstore_app_id = appstore_app_id(&app_handle);

    let ui_dir = fs.ui_store().assets_dir(UiIdentifier::Other(appstore_app_id.clone()));

    let app_dir = fs.apps_store().root_dir().join(&appstore_app_id);
    create_dir_if_necessary(&app_dir)?;

    let conductor = conductor.lock().await;

    happ_window_builder(
        &app_handle,
        appstore_app_id,
        String::from("appstore"),
        String::from("App Store"),
        holochain_launcher_utils::window_builder::UISource::Path(ui_dir.clone()),
        app_dir.join("localStorage"),
        conductor.list_app_interfaces().await?[0],
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Cannot get admin_port"),
        true,
    )
    .build()?;

    Ok(())
}
