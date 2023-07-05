use std::collections::HashMap;

use holochain_client::{AdminWebsocket, InstallAppPayload};
use holochain_types::{prelude::AppBundle, web_app::WebAppBundle};

use crate::{config::WeConfig, filesystem::WeFileSystem, state::WeResult};

pub fn we_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn we_app_id() -> String {
    format!("we-{}", we_version())
}

pub fn devhub_app_id() -> String {
    format!("DevHub-{}", we_version())
}

pub fn appstore_app_id() -> String {
    format!("appstore-{}", we_version())
}

pub fn network_seed(config: &WeConfig) -> String {
    let network_seed = if let Some(network_seed) = &config.network_seed {
        network_seed.clone()
    } else if cfg!(debug_assertions) {
        format!("we-dev")
    } else {
        format!("we")
    };

    format!("{}-{}", we_version(), network_seed)
}

pub async fn install_default_apps_if_necessary(
    config: &WeConfig,
    we_fs: &WeFileSystem,
    admin_ws: &mut AdminWebsocket,
) -> WeResult<()> {
    let apps = admin_ws.list_apps(None).await?;

    let network_seed = network_seed(&config);

    if !apps
        .iter()
        .map(|info| info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&appstore_app_id())
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
                installed_app_id: Some(appstore_app_id()),
                membrane_proofs: HashMap::new(),
            })
            .await?;

        we_fs
            .webapp_store()
            .store_webapp(&appstore_app_id(), &appstore_hub_bundle)
            .await?;

        let we_app_id = we_app_id();
        let we_bundle = AppBundle::decode(include_bytes!("../../workdir/we.happ"))?;

        admin_ws
            .install_app(InstallAppPayload {
                source: holochain_types::prelude::AppBundleSource::Bundle(we_bundle),
                agent_key,
                network_seed: Some(network_seed),
                installed_app_id: Some(we_app_id),
                membrane_proofs: HashMap::new(),
            })
            .await?;
    }

    Ok(())
}
