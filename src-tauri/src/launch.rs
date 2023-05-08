use holochain_manager::config::LaunchHolochainConfig;
use holochain_web_app_manager::WebAppManager;
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use tauri::{api::process::Command, };

use crate::{
    default_apps::install_default_apps_if_necessary,
    filesystem::WeFileSystem,
    config::WeConfig,
    state::{holochain_version, log_level, LaunchedState, WeError, WeResult},
};

pub async fn launch(
    config: &WeConfig,
    fs: &WeFileSystem,
    password: String,
    mdns: bool,
) -> WeResult<LaunchedState> {
    let lair_keystore_manager =
        LairKeystoreManagerV0_2::launch(log_level(), fs.keystore_path(), password.clone())
            .await
            .map_err(|err| WeError::LairKeystoreError(err))?;

    let version = holochain_version();
    let version_str = version.to_string();

    let admin_port: u16 = match option_env!("ADMIN_PORT") {
        Some(port) => port.parse().unwrap(),
        None => portpicker::pick_unused_port().expect("No ports free"),
    };

    let mut web_app_manager = WebAppManager::launch(
        version,
        LaunchHolochainConfig {
            log_level: log_level(),
            admin_port,
            command: Command::new_sidecar(format!("holochain-v{}", version_str))
                .map_err(|err| WeError::TauriError(format!("{:?}", err)))?,
            conductor_config_dir: fs.conductor_path(&version),
            environment_path: fs.conductor_path(&version),
            keystore_connection_url: lair_keystore_manager.connection_url(),
            mdns,
        },
        password.clone(),
    )
    .await?;

    install_default_apps_if_necessary(config, &mut web_app_manager).await?;

    Ok(LaunchedState {
        lair_keystore_manager,
        web_app_manager,
    })
}
