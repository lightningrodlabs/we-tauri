use holochain::conductor::Conductor;
use holochain_client::AdminWebsocket;
use holochain_conductor_api::conductor::{ConductorConfig, KeystoreConfig};

use crate::{
    config::WeConfig,
    default_apps::install_default_apps_if_necessary,
    filesystem::WeFileSystem,
    state::{log_level, WeError, WeResult},
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
    config: &WeConfig,
    fs: &WeFileSystem,
    password: String,
    mdns: bool,
) -> WeResult<Conductor> {
    let admin_port: u16 = match option_env!("ADMIN_PORT") {
        Some(port) => port.parse().unwrap(),
        None => portpicker::pick_unused_port().expect("No ports free"),
    };

    let mut config = ConductorConfig::default();

    // TODO: set the DHT arc depending on whether this is mobile

    let conductor = Conductor::builder()
        .config(config)
        .passphrase(Some(vec_to_locked(password.into_bytes())?))
        .build()
        .await?;

    let mut admin_ws = get_admin_ws(&conductor).await?;

    conductor.add_app_interface(either::Either::Left(0)).await?;

    install_default_apps_if_necessary(config, &fs, &mut admin_ws).await?;

    Ok(conductor)
}

pub async fn get_admin_ws(conductor: &Conductor) -> WeResult<AdminWebsocket> {
    let admin_ws = AdminWebsocket::connect(format!(
        "ws://localhost:{}",
        conductor
            .get_arbitrary_admin_websocket_port()
            .expect("Can't find admin ports")
    ))
    .await?;

    Ok(admin_ws)
}
