use futures::lock::Mutex;
use holochain::prelude::AppBundle;
use holochain_client::{AdminWebsocket, AppInfo, AppStatusFilter, InstallAppPayload};
use std::collections::HashMap;

use crate::error::{WeError, WeResult};

#[tauri::command]
pub async fn join_group(
    window: tauri::Window,
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
    network_seed: String,
) -> WeResult<AppInfo> {
    if window.label() != "main" {
        return Err(WeError::UnauthorizedWindow(String::from("join_group")));
    }
    inner_join_group(admin_ws, network_seed).await
}

pub async fn inner_join_group(
    admin_ws: tauri::State<'_, Mutex<AdminWebsocket>>,
    network_seed: String,
) -> WeResult<AppInfo> {
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'join_group'.");
    }

    let mut admin_ws = admin_ws.lock().await;

    let apps = admin_ws.list_apps(None).await?;

    let group_app_id = format!("group#{}", sha256::digest(network_seed.clone()));

    let is_installed = apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&group_app_id);

    if is_installed {
        let response = admin_ws.enable_app(group_app_id).await?;
        return Ok(response.app);
    }

    let agent_key = apps[0].agent_pub_key.clone(); // TODO: change when every app has a different public key
    let we_bundle = AppBundle::decode(include_bytes!("../../../workdir/we.happ"))?;

    let app_info = admin_ws
        .install_app(InstallAppPayload {
            source: holochain_types::prelude::AppBundleSource::Bundle(we_bundle),
            agent_key,
            network_seed: Some(network_seed),
            installed_app_id: Some(group_app_id.clone()),
            membrane_proofs: HashMap::new(),
        })
        .await?;

    admin_ws.enable_app(group_app_id).await?;

    admin_ws.close();

    Ok(app_info)
}
