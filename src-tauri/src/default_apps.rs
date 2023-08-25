use std::collections::HashMap;

use holochain_client::{AdminWebsocket, InstallAppPayload};
use holochain_types::web_app::WebAppBundle;
use tauri::AppHandle;

use crate::{config::WeConfig, error::WeResult, filesystem::{WeFileSystem, breaking_app_version, UiIdentifier}};


pub fn devhub_app_id(app_handle: &AppHandle) -> String {
    format!("DevHub-{}", breaking_app_version(app_handle))
}

pub fn appstore_app_id(app_handle: &AppHandle) -> String {
    format!("AppStore-{}", breaking_app_version(app_handle))
}

pub fn network_seed(app_handle: &AppHandle, config: &WeConfig) -> String {
    let network_seed = if let Some(network_seed) = &config.network_seed {
        network_seed.clone()
    } else if cfg!(debug_assertions) {
        format!("lightningrodlabs-we-dev")
    } else {
        format!("lightningrodlabs-we")
    };

    format!("{}-{}", breaking_app_version(app_handle), network_seed)
}

pub async fn install_default_apps_if_necessary(
    app_handle: &tauri::AppHandle,
    config: &WeConfig,
    we_fs: &WeFileSystem,
    admin_ws: &mut AdminWebsocket,
) -> WeResult<()> {
    let apps = admin_ws.list_apps(None).await?;

    let network_seed = network_seed(app_handle, &config);

    if !apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&appstore_app_id(&app_handle))
    {
        let agent_key = admin_ws.generate_agent_pub_key().await?;
        let appstore_hub_bundle = WebAppBundle::decode(include_bytes!("../../AppStore.webhapp"))?;

        admin_ws
            .install_app(InstallAppPayload {
                source: holochain_types::prelude::AppBundleSource::Bundle(
                    appstore_hub_bundle.happ_bundle().await?,
                ),
                agent_key: agent_key.clone(),
                network_seed: Some(network_seed.clone()),
                installed_app_id: Some(appstore_app_id(app_handle)),
                membrane_proofs: HashMap::new(),
            })
            .await?;
        admin_ws.enable_app(appstore_app_id(app_handle)).await?;

        we_fs
            .ui_store()
            .extract_and_store_ui(UiIdentifier::Other(appstore_app_id(app_handle)), &appstore_hub_bundle)
            .await?;
    }

    Ok(())
}
