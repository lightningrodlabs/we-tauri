use holochain::{
    conductor::{
        config::{AdminInterfaceConfig, ConductorConfig, KeystoreConfig},
        interface::InterfaceDriver,
        Conductor, ConductorHandle,
    },
    prelude::{
        kitsune_p2p::dependencies::kitsune_p2p_types::config::KitsuneP2pTuningParams,
        KitsuneP2pConfig, ProxyConfig, TransportConfig,
    },
};
use holochain_client::AdminWebsocket;

use crate::{
    config::WeConfig,
    default_apps::install_default_apps_if_necessary,
    error::{WeError, WeResult},
    filesystem::WeFileSystem,
};

// fn vec_to_locked(mut pass_tmp: Vec<u8>) -> std::io::Result<holochain::prelude::dependencies::kitsune_p2p_types::dependencies::lair_keystore_api::dependencies::sodoken::BufRead>{
//     match holochain::prelude::dependencies::kitsune_p2p_types::dependencies::lair_keystore_api::dependencies::sodoken::BufWrite::new_mem_locked(pass_tmp.len()) {
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
    app_handle: &tauri::AppHandle,
    we_config: &WeConfig,
    fs: &WeFileSystem,
    password: String,
) -> WeResult<ConductorHandle> {
    let mut config = ConductorConfig::default();
    config.environment_path = fs.conductor_dir().into();
    config.keystore = KeystoreConfig::LairServerInProc {
        lair_root: Some(fs.keystore_dir()),
    };
    let admin_port = match option_env!("ADMIN_PORT") {
        Some(p) => p.parse().unwrap(),
        None => portpicker::pick_unused_port().expect("No ports free"),
    };
    let mut network_config = KitsuneP2pConfig::default();
    network_config.bootstrap_service = Some(url2::url2!("https://bootstrap.holo.host"));

    let tuning_params = KitsuneP2pTuningParams::default();

    network_config.tuning_params = tuning_params;

    network_config.transport_pool.push(TransportConfig::Proxy {
      sub_transport: Box::new(TransportConfig::Quic {
        bind_to: None,
        override_host: None,
        override_port: None,
      }),
      proxy_config: ProxyConfig::RemoteProxyClient {
        proxy_url:  url2::url2!("kitsune-proxy://f3gH2VMkJ4qvZJOXx0ccL_Zo5n-s_CnBjSzAsEHHDCA/kitsune-quic/h/137.184.142.208/p/5788/--")
      },
    });

    config.admin_interfaces = Some(vec![AdminInterfaceConfig {
        driver: InterfaceDriver::Websocket { port: admin_port },
    }]);
    config.network = Some(network_config);

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

    install_default_apps_if_necessary(app_handle, we_config, &fs, &mut admin_ws).await?;

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
