use holochain::conductor::{
    config::{AdminInterfaceConfig, ConductorConfig, KeystoreConfig},
    interface::InterfaceDriver,
    Conductor, ConductorHandle,
};
use holochain_client::AdminWebsocket;

use crate::{
    config::WeConfig,
    default_apps::install_default_apps_if_necessary,
    filesystem::WeFileSystem,
    state::{WeError, WeResult},
};

fn vec_to_locked(mut pass_tmp: Vec<u8>) -> std::io::Result<sodoken::BufRead> {
    match sodoken::BufWrite::new_mem_locked(pass_tmp.len()) {
        Err(e) => {
            pass_tmp.fill(0);
            Err(e.into())
        }
        Ok(p) => {
            {
                let mut lock = p.write_lock();
                lock.copy_from_slice(&pass_tmp);
                pass_tmp.fill(0);
            }
            Ok(p.to_read())
        }
    }
}

pub async fn launch(
    we_config: &WeConfig,
    fs: &WeFileSystem,
    password: String,
    mdns: bool,
) -> WeResult<ConductorHandle> {
    let mut config = ConductorConfig::default();
    config.environment_path = fs.conductor_path().into();
    config.keystore = KeystoreConfig::LairServerInProc {
        lair_root: Some(fs.keystore_path()),
    };
    if let Some(admin_port) = option_env!("ADMIN_PORT") {
        config.admin_interfaces = Some(vec![AdminInterfaceConfig {
            driver: InterfaceDriver::Websocket {
                port: admin_port.parse().unwrap(),
            },
        }])
    }

    // TODO: set the DHT arc depending on whether this is mobile

    let conductor = Conductor::builder()
        .config(config)
        .passphrase(Some(vec_to_locked(password.into_bytes())?))
        .build()
        .await?;

    let mut admin_ws = get_admin_ws(&conductor).await?;
    conductor
        .clone()
        .add_app_interface(either::Either::Left(0))
        .await?;

    install_default_apps_if_necessary(we_config, &fs, &mut admin_ws).await?;

    Ok(conductor)
}

pub async fn get_admin_ws(conductor: &Conductor) -> WeResult<AdminWebsocket> {
    let admin_ws = AdminWebsocket::connect(format!(
        "ws://localhost:{}",
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Can't find admin ports")
    ))
    .await
    .map_err(|err| {
        WeError::AdminWebsocketError(format!("Could not connect to the admin interface: {}", err))
    })?;

    Ok(admin_ws)
}
