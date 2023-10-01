use std::{time::Duration, path::PathBuf, collections::HashMap};

use futures::lock::Mutex;
use holochain::{
    conductor::{
        config::{AdminInterfaceConfig, ConductorConfig, KeystoreConfig},
        interface::InterfaceDriver,
    },
    prelude::{
        KitsuneP2pConfig, TransportConfig,
    },
};
use holochain_client::AdminWebsocket;
use holochain_keystore::MetaLairClient;
use tauri::{api::process::{Command, CommandChild, CommandEvent}, Manager};
use url2::Url2;


use crate::{
    config::WeConfig,
    default_apps::install_default_apps_if_necessary,
    error::{WeError, WeResult, LairKeystoreError, LaunchHolochainError, LaunchChildError, InitializeConductorError},
    filesystem::{WeFileSystem, create_dir_if_necessary},
};

pub type AppPort = u16;
pub type AdminPort = u16;

pub async fn launch(
    app_handle: &tauri::AppHandle,
    we_config: &WeConfig,
    fs: &WeFileSystem,
    password: String,
) -> WeResult<(MetaLairClient, AdminPort, AppPort)> {

    let log_level = log::Level::Info;

    // initialize lair keystore if necessary
    if !fs.keystore_initialized() {
        println!("Keystore not initialized. Initializing keystore...");
        create_dir_if_necessary(&fs.keystore_dir())
            .map_err(|e| WeError::FileSystemError(format!("Failed to create lair keystore directory: {:?}", e)))?;
        initialize_keystore(fs.keystore_dir(), password.clone()).await?;
    }

    println!("Launching lair keystore process...");
    // spawn lair keystore process and connect to it
    let lair_url = launch_lair_keystore_process(log_level.clone(), fs.keystore_dir(), password.clone()).await?;
    println!("Launched lair keystore process.");
    let meta_lair_client = holochain_keystore::lair_keystore::spawn_lair_keystore(
        lair_url.clone(),
        sodoken::BufRead::from(password.clone().into_bytes())
        ).await
        .map_err(|e| LairKeystoreError::SpawnMetaLairClientError(format!("{}", e)))?;

    println!("Spawned lair keystore and got MetaLairClient.");


    // write conductor config to file

    let mut config = ConductorConfig::default();
    config.environment_path = fs.conductor_dir().into();
    config.keystore = KeystoreConfig::LairServer { connection_url: lair_url };

    let admin_port = match option_env!("ADMIN_PORT") {
        Some(p) => p.parse().unwrap(),
        None => portpicker::pick_unused_port().expect("No ports free"),
    };

    config.admin_interfaces = Some(vec![AdminInterfaceConfig {
        driver: InterfaceDriver::Websocket {
            port: admin_port.clone(),
        },
    }]);

    let mut network_config = KitsuneP2pConfig::default();
    network_config.bootstrap_service = Some(url2::url2!("https://bootstrap.holo.host")); // replace-me (optional) -- change bootstrap server URL here if desired
    network_config.transport_pool.push(TransportConfig::WebRTC {
        signal_url: String::from("wss://signal.holo.host"),
    });

    config.network = Some(network_config);

    // TODO more graceful error handling
    let config_string = serde_yaml::to_string(&config).expect("Could not convert conductor config to string");

    create_dir_if_necessary(&fs.conductor_dir())?;
    let conductor_config_path = fs.conductor_dir().join("conductor-config.yaml");

    std::fs::write(conductor_config_path.clone(), config_string)
        .expect("Could not write conductor config");

    println!("Wrote conductor config.");

    // NEW_VERSION change holochain version number here if necessary
    let command = Command::new_sidecar("holochain-v0.2.2")
        .map_err(|err| WeError::LaunchHolochainError(
            LaunchHolochainError::SidecarBinaryCommandError(format!("{}", err)))
        )?;

    let _command_child = launch_holochain_process(
        log_level,
        command,
        conductor_config_path,
        password
    ).await?;

    println!("Launched holochain process.");


    std::thread::sleep(Duration::from_millis(100));

    // Try to connect twice. This fixes the os(111) error for now that occurs when the conducor is not ready yet.
    let mut admin_ws = match AdminWebsocket::connect(format!("ws://localhost:{}", admin_port))
    .await
    {
        Ok(ws) => ws,
        Err(_) => {
            log::error!("[HOLOCHAIN] Could not connect to the AdminWebsocket. Starting another attempt in 5 seconds.");
            std::thread::sleep(Duration::from_millis(5000));
            AdminWebsocket::connect(format!("ws://localhost:{}", admin_port))
                .await
                .map_err(|err| LaunchHolochainError::CouldNotConnectToConductor(format!("{}", err)))?
        }
    };

    let app_port = {
        let app_interfaces = admin_ws.list_app_interfaces().await.map_err(|e| {
            LaunchHolochainError::CouldNotConnectToConductor(format!(
            "Could not list app interfaces: {:?}",
            e
            ))
        })?;

        if app_interfaces.len() > 0 {
            app_interfaces[0]
        } else {
            let free_port = portpicker::pick_unused_port().expect("No ports free");

            admin_ws.attach_app_interface(free_port).await.or(Err(
            LaunchHolochainError::CouldNotConnectToConductor("Could not attach app interface".into()),
            ))?;
            free_port
        }
    };

    install_default_apps_if_necessary(app_handle, we_config, &fs,&mut admin_ws).await?;

    app_handle.manage((admin_port, app_port));
    app_handle.manage(Mutex::new(admin_ws));
    app_handle.manage(Mutex::new(meta_lair_client.clone()));

    println!("############\nLaunched holochain with app port {} and admin port {}", app_port, admin_port);

    Ok((meta_lair_client, admin_port, app_port))
}

enum LaunchHolochainProcessState {
    Pending,
    InitializeConductorError(InitializeConductorError),
    Success,
}

pub async fn launch_holochain_process(
    log_level: log::Level,
    command: Command,
    conductor_config_path: PathBuf,
    password: String,
) -> WeResult<CommandChild> {
    let mut envs = HashMap::new();
    envs.insert(String::from("RUST_LOG"), String::from(log_level.as_str()));
    envs.insert(String::from("WASM_LOG"), String::from(log_level.as_str()));

    let (mut holochain_rx, mut holochain_child) = command
        .args(&[
        "-c",
        conductor_config_path.into_os_string().to_str().unwrap(),
        "-p",
        ])
        .envs(envs)
        .spawn()
        .map_err(|err| {
        WeError::LaunchHolochainError(LaunchHolochainError::LaunchChildError(LaunchChildError::FailedToExecute(format!("{}", err))))
        })?;


    let mut launch_state = LaunchHolochainProcessState::Pending;


    holochain_child
        .write(password.as_bytes())
        .map_err(|err| LaunchHolochainError::ErrorWritingPassword(format!("{:?}", err)))?;
    holochain_child
        .write("\n".as_bytes())
        .map_err(|err| LaunchHolochainError::ErrorWritingPassword(format!("{:?}", err)))?;


    let mut fatal_error = false;

    // this loop will end in still pending when the conductor crashes before being ready
    // read events such as stdout
    while let Some(event) = holochain_rx.recv().await {


        match event.clone() {
        CommandEvent::Stdout(line) => {
            log::info!("[HOLOCHAIN] {}", line);
            if line == String::from("Conductor ready.") {
            launch_state = LaunchHolochainProcessState::Success;
            break;
            }
        },
        CommandEvent::Stderr(line) => {

            log::info!("[HOLOCHAIN] {}", line);

            // Windows error handling:
            // --------------------------------------
            #[cfg(target_family="windows")]
            if line.contains("websocket_error_from_network=Io") && line.contains("ConnectionReset") {
            launch_state = LaunchHolochainProcessState::InitializeConductorError(
                InitializeConductorError::AddressAlreadyInUse(
                String::from("Could not initialize Conductor from configuration: Address already in use")
                )
            );
            break;
            }
            // --------------------------------------

            // UNIX error handling:
            // --------------------------------------
            #[cfg(target_family="unix")]
            if line.contains("FATAL PANIC PanicInfo") {
            fatal_error = true;
            }
            #[cfg(target_family="unix")]
            if line.contains("Well, this is embarrassing") { // This line occurs below FATAL PANIC but may potentially also appear without FATAL PANIC PanicInfo
            fatal_error = true;
            }
            #[cfg(target_family="unix")]
            if line.contains("Could not initialize Conductor from configuration: InterfaceError(WebsocketError(Io(Os") && line.contains("Address already in use") {
            launch_state = LaunchHolochainProcessState::InitializeConductorError(
                InitializeConductorError::AddressAlreadyInUse(
                String::from("Could not initialize Conductor from configuration: Address already in use")
                )
            );
            break;
            }
            #[cfg(target_family="unix")]
            if fatal_error == true && line.contains("DatabaseError(SqliteError(SqliteFailure(Error { code: NotADatabase, extended_code: 26 }, Some(\"file is not a database\"))))") {
            launch_state = LaunchHolochainProcessState::InitializeConductorError(
                InitializeConductorError::SqliteError(
                String::from("DatabaseError(SqliteError(SqliteFailure(Error { code: NotADatabase, extended_code: 26 }, Some(\"file is not a database\"))))")
                )
            );
            break;
            }
            // if no known error was found between the line saying "FATAL PANIC ..." or "Well, this is embarrassing" and
            // the line saying "Thank you kindly" it is an unknown error
            #[cfg(target_family="unix")]
            if fatal_error == true && line.contains("Thank you kindly!"){
            launch_state = LaunchHolochainProcessState::InitializeConductorError(
                InitializeConductorError::UnknownError(
                String::from("Unknown error when trying to initialize conductor. See log file for details.")
                )
            );
            }
        },
        // --------------------------------------
        _ => {
            log::info!("[HOLOCHAIN] {:?}", event);
        },
        };

    };

    log::info!("Launched holochain");


    tauri::async_runtime::spawn(async move {
        // read events such as stdout
        while let Some(event) = holochain_rx.recv().await {
        match event.clone() {
            CommandEvent::Stdout(line) => log::info!("[HOLOCHAIN] {}", line),
            CommandEvent::Stderr(line) => log::info!("[HOLOCHAIN] {}", line),
            _ => log::info!("[HOLOCHAIN] {:?}", event),
        };
        }
    });


    match launch_state {
        LaunchHolochainProcessState::Success => {
        log::info!("LaunchHolochainProcessState::Success");
        Ok(holochain_child)
        },
        LaunchHolochainProcessState::InitializeConductorError(e) => {
        log::info!("LaunchHolochainProcessState::InitializeConductorError");
        Err(WeError::LaunchHolochainError(LaunchHolochainError::CouldNotInitializeConductor(e)))
        },
        LaunchHolochainProcessState::Pending => {
        log::info!("LaunchHolochainProcessState::Pending");
        Err(WeError::LaunchHolochainError(LaunchHolochainError::ImpossibleError("LaunchHolochainProcessState still pending after launching the holochain process.".into())))
        }
    }

}


pub async fn launch_lair_keystore_process(
    log_level: log::Level,
    keystore_data_dir: PathBuf,
    password: String,
) -> Result<Url2, LairKeystoreError> {
    let mut envs = HashMap::new();
    envs.insert(String::from("RUST_LOG"), String::from(log_level.as_str()));

    let mut keystore_path = keystore_data_dir.clone();

    println!("Launching keystore for path: {:?}", keystore_path);

    // On Unix systems, there is a limit to the path length of a domain socket. Create a symlink to the lair directory from the tempdir
    // instead and overwrite the connectionUrl in the lair-keystore-config.yaml
    if cfg!(target_family="unix") {
        let uid = nanoid::nanoid!(13);
        let src_path = std::env::temp_dir().join(format!("lair.{}", uid));
        symlink::symlink_dir(keystore_path, src_path.clone())
            .map_err(|e| LairKeystoreError::ErrorCreatingSymLink(e.to_string()))?;
        keystore_path = src_path;

        // overwrite connectionUrl in lair-keystore-config.yaml to symlink directory
        // 1. read to string
        let mut lair_config_string = std::fs::read_to_string(keystore_path.join("lair-keystore-config.yaml"))
            .map_err(|e| LairKeystoreError::ErrorReadingLairConfig(e.to_string()))?;

        // 2. filter out the line with the connectionUrl
        let connection_url_line = lair_config_string.lines().filter(|line| line.contains("connectionUrl:")).collect::<String>();

        // 3. replace the part unix:///home/[user]/.local/share/holochain-launcher/profiles/default/lair/0.2/socket?k=[some_key]
        //    with unix://[path to tempdir]/socket?k=[some_key]
        let split_byte_index = connection_url_line.rfind("socket?").unwrap();
        let socket = &connection_url_line.as_str()[split_byte_index..];
        let tempdir_connection_url = match url::Url::parse(&format!(
            "unix://{}",
            keystore_path.join(socket).to_str().unwrap(),
        )) {
            Ok(url) => url,
            Err(e) => return Err(LairKeystoreError::OtherError(format!("Failed to parse URL for symlink lair path: {}", e))),
        };

        let new_line = &format!("connectionUrl: {}\n", tempdir_connection_url);

        // 4. Replace the existing connectionUrl line with that new line
        lair_config_string = LinesWithEndings::from(lair_config_string.as_str()).map(|line| {
        if line.contains("connectionUrl:") {
            new_line
        } else {
            line
        }
        }).collect::<String>();

        // 5. Overwrite the lair-keystore-config.yaml with the modified content
        std::fs::write(keystore_data_dir.join("lair-keystore-config.yaml"), lair_config_string)
            .map_err(|e| LairKeystoreError::ErrorWritingLairConfig(e.to_string()))?;
    }


    println!("Launching lair sidecar binary...");

    // NEW_VERSION Check whether lair-keystore version needs to get updated
    let (mut lair_rx, mut command_child) = Command::new_sidecar("lair-keystore-v0.3.0")
        .or(Err(LairKeystoreError::LaunchChildError(
            LaunchChildError::BinaryNotFound,
        )))?
        .args(&["server", "-p"])
        .current_dir(keystore_path.clone())
        .envs(envs.clone())
        .spawn()
        .map_err(|err| {
            LairKeystoreError::LaunchChildError(LaunchChildError::FailedToExecute(format!("{:?}", err)))
    })?;

    println!("Writing password...");


    tauri::async_runtime::spawn(async move {
        std::thread::sleep(Duration::from_millis(10));
        command_child
            .write(password.as_bytes())
            .expect("Could not write password");
    });

    println!("Password written...");


    let mut started = false;
    while !started {
        if let Some(event) = lair_rx.recv().await {
            match event.clone() {
                CommandEvent::Stdout(line) => {
                    log::info!("[LAIR] {}", line);
                    if line.contains("lair-keystore running") {
                    started = true;
                    }
                }
                CommandEvent::Stderr(line) => {
                    log::error!("[LAIR] {}", line);
                    if line.contains("InternalSodium") {
                    return Err(LairKeystoreError::IncorrectPassword);
                    }
                }
                _ => {
                    log::info!("[LAIR] {:?}", event);
                }
            }
        }
    }

    tauri::async_runtime::spawn(async move {
        // read events such as stdout
        while let Some(event) = lair_rx.recv().await {
            match event.clone() {
                CommandEvent::Stdout(line) => log::info!("[LAIR] {}", line),
                CommandEvent::Stderr(line) => log::error!("[LAIR] {}", line),
                _ => log::info!("[LAIR] {:?}", event),
            }
        }
    });

    println!("Trying to print lair version...");


    // NEW_VERSION Check whether lair-keystore version needs to get updated
    let output = Command::new_sidecar("lair-keystore-v0.3.0")
        .or(Err(LairKeystoreError::LaunchChildError(
            LaunchChildError::BinaryNotFound,
        )))?
        .args(&["url"])
        .current_dir(keystore_path)
        .envs(envs.clone())
        .output()
        .map_err(|err| {
            LairKeystoreError::LaunchChildError(LaunchChildError::FailedToExecute(format!("{:?}", err)))
    })?;

    if output.stderr.len() > 0 {
        return Err(LairKeystoreError::LaunchChildError(
            LaunchChildError::FailedToExecute(output.stderr),
        ));
    }

    let url = Url2::parse(output.stdout);

    println!("Launched lair keystore at url {}", url);

    log::info!("Launched lair-keystore");

    Ok(url)
}


pub async fn initialize_keystore(keystore_dir: PathBuf, password: String) -> Result<(), LairKeystoreError> {
// NEW_VERSION Check whether lair-keystore version needs to get updated
    let (mut lair_rx, mut command_child) = Command::new_sidecar("lair-keystore-v0.3.0")
        .or(Err(LairKeystoreError::LaunchChildError(
        LaunchChildError::BinaryNotFound,
        )))?
        .args(&["init", "-p"])
        .current_dir(keystore_dir)
        .spawn()
        .map_err(|err| LaunchChildError::FailedToExecute(format!("{:?}", err)))?;

    tauri::async_runtime::spawn(async move {
        std::thread::sleep(Duration::from_millis(10));
        command_child
            .write(password.as_bytes())
            .expect("Could not write password");
    });

    let mut started = false;
    while !started {
        if let Some(event) = lair_rx.recv().await {
            match event.clone() {
                CommandEvent::Stdout(line) => {
                    log::info!("[LAIR] {}", line);
                    if line.contains("lair-keystore init connection_url") {
                        started = true;
                    }
                }
                CommandEvent::Stderr(line) => {
                    log::error!("[LAIR] {}", line);
                    if line.contains("InternalSodium") {
                        return Err(LairKeystoreError::IncorrectPassword);
                    }
                }
                _ => {
                    log::info!("[LAIR] {:?}", event);
                }
            }
        }
    }

    Ok(())
}


/// Iterator yielding every line in a string. The line includes newline character(s).
/// https://stackoverflow.com/questions/40455997/iterate-over-lines-in-a-string-including-the-newline-characters
struct LinesWithEndings<'a> {
    input: &'a str,
}

impl<'a> LinesWithEndings<'a> {
    pub fn from(input: &'a str) -> LinesWithEndings<'a> {
        LinesWithEndings {
            input: input,
        }
    }
}

impl<'a> Iterator for LinesWithEndings<'a> {
    type Item = &'a str;

    #[inline]
    fn next(&mut self) -> Option<&'a str> {
        if self.input.is_empty() {
            return None;
        }
        let split = self.input.find('\n').map(|i| i + 1).unwrap_or(self.input.len());
        let (line, rest) = self.input.split_at(split);
        self.input = rest;
        Some(line)
    }
}