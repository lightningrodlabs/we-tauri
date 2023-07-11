use std::collections::HashMap;

use futures::lock::Mutex;
use holochain::{conductor::ConductorHandle, prelude::AppBundle};
use holochain_client::{AppInfo, AppStatusFilter, InstallAppPayload};

use crate::{launch::get_admin_ws, state::WeResult};

#[tauri::command]
pub async fn join_group(
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
    network_seed: String,
) -> WeResult<AppInfo> {
    let conductor = conductor.lock().await;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    let apps = admin_ws.list_apps(Some(AppStatusFilter::Enabled)).await?;
    let group_app_id = format!("group-{}", network_seed);

    let is_installed = apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&group_app_id);

    if is_installed {
        let response = admin_ws.enable_app(group_app_id).await?;
        return Ok(response.app);
    }

    let agent_key = admin_ws.generate_agent_pub_key().await?;
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

    Ok(app_info)
}
