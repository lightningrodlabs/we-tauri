use std::collections::HashMap;

use holochain_client::AdminWebsocket;
use holochain_types::{prelude::AppBundle, web_app::WebAppBundle};
use holochain_web_app_manager::WebAppManager;

use crate::state::{WeError, WeResult};

pub fn we_app_id() -> String {
    format!("we-{}", env!("CARGO_PKG_VERSION"))
}

pub async fn install_default_apps_if_necessary(manager: &mut WebAppManager) -> WeResult<()> {
    let apps = manager
        .list_apps()
        .await
        .map_err(|err| WeError::WebAppManagerError(err))?;

    // let version: String = manager.holochain_manager.version.manager().hdi_version().into();
    let holochain_version: String = manager.holochain_manager.version.into();

    let network_seed = if cfg!(debug_assertions) {
        let agent_id = option_env!("ADMIN_PORT").unwrap_or("");
        Some(format!("we-dev-{}2", agent_id))
    } else {
        let agent_id = option_env!("ADMIN_PORT").unwrap_or("");
        Some(format!("we{}", agent_id))
    };

    let devhub_app_id = format!("DevHub-{}", holochain_version);

    if apps
        .iter()
        .map(|info| info.installed_app_info.installed_app_id.clone())
        .collect::<Vec<String>>()
        .contains(&devhub_app_id)
        == false
    {
        let mut admin_ws =
            AdminWebsocket::connect(format!("ws://localhost:{}", manager.admin_interface_port()))
                .await
                .map_err(|err| WeError::AdminWebsocketError(format!("{:?}", err)))?;

        let pubkey = admin_ws
            .generate_agent_pub_key()
            .await
            .map_err(|err| WeError::AdminWebsocketError(format!("{:?}", err)))?;
        let dev_hub_bundle = WebAppBundle::decode(include_bytes!("../../DevHub.webhapp"))
            .map_err(|err| WeError::MrBundleError(format!("{:?}", err)))?;

        manager
            .install_web_app(
                devhub_app_id,
                dev_hub_bundle,
                network_seed.clone(),
                HashMap::new(),
                Some(pubkey.clone()),
                None,
                None,
            )
            .await
            .map_err(|err| WeError::WebAppManagerError(err))?;

        let we_app_id = we_app_id();
        let we_bundle = AppBundle::decode(include_bytes!("../../workdir/we.happ"))
            .map_err(|err| WeError::MrBundleError(format!("{:?}", err)))?;

        manager
            .install_app(
                we_app_id,
                we_bundle,
                network_seed,
                HashMap::new(),
                Some(pubkey.clone()),
                None,
            )
            .await
            .map_err(|err| WeError::WebAppManagerError(err))?;
    }

    Ok(())
}
