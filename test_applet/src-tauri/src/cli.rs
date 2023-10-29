//! Definitions of StructOpt options for use in the CLI

// use holochain_types::prelude::InstalledAppId;
// use std::path::Path;
use clap::Parser;
use futures::lock::Mutex;
use holochain_types::web_app::WebAppBundle;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, RunEvent, WindowEvent};
use we_alpha::commands::install_applet_bundle::AppAgentWebsocket;
use we_types::Applet;

use fixt::fixt;
use holochain_cli_sandbox::cmds::{Create, NetworkCmd, NetworkType};
use holochain_client::AdminWebsocket;
use holochain_types::prelude::{ActionHashFixturator, DnaHashFixturator};
use holochain_types::prelude::{
    AppManifest, EntryHash, EntryHashB64, ExternIO, FunctionName, InstallAppPayload, RoleName,
    ZomeName,
};

use uuid::Uuid;

use we_alpha::commands::notification::{IconState, SysTrayIconState};
use we_alpha::error::{LaunchHolochainError, WeResult};
use we_alpha::filesystem::{Profile, UiIdentifier, WeFileSystem};
use we_alpha::{
    applet_iframes::start_applet_uis_server, commands::join_group::join_group, config::WeConfig,
    error::WeError, launch::launch, window::build_main_window,
};

#[derive(Debug, Parser)]
/// Helper for launching holochain apps in a Holochain Launcher environment for testing and development purposes.
///
pub struct WeTestApplet {
    /// Path to .webhapp file to test.
    path: PathBuf,

    /// Install the app with a specific network seed.
    /// This option can currently only be used with the `--reuse-conductors` flag.
    #[arg(long)]
    network_seed: Option<String>,

    /// (flattened)
    #[command(flatten)]
    create: Create,

    /// Explicitly allow to use the official production signaling and/or bootstrap server(s)
    /// NOTE: It is strongly recommended to use local signaling and bootstrap servers during development.
    /// Bootstrap and signaling server for development can be started via `hc run-local-services`.
    #[arg(long)]
    force_production: bool,
}

impl WeTestApplet {
    /// Run this command
    pub async fn run(self) -> WeResult<()> {
        // holochain_util::pw::pw_set_piped(self.piped);

        match self.create.in_process_lair {
            true => {
                eprintln!("[we-test-applet] ERROR: The --in-process-lair flag is only supported by hc sandbox but not by we-test-applet.");
                panic!("ERROR: The --in-process-lair flag is only supported by hc sandbox but not by hc launch.");
            }
            _ => (),
        }

        // Fail if production signaling server is used unless the --force-production flag is used
        if let Some(NetworkCmd::Network(n)) = self.create.clone().network {
            match n.transport {
                NetworkType::WebRTC { signal_url: s } => {
                    if (s == String::from("ws://signal.holo.host")
                        || s == String::from("wss://signal.holo.host"))
                        && self.force_production == false
                    {
                        eprintln!(
                            r#"
ERROR

You are attempting to use the official production signaling server of holochain.
It is recommended to instead use the `hc run-local-services` command of the holochain CLI to spawn a local bootstrap and signaling server for testing.
If you are sure that you want to use the production signaling server with hc launch, use the --force-production flag.

"#
                        );

                        panic!("Attempted to use production signaling server without explicitly allowing it.");
                    }
                }
                _ => (),
            }

            match n.bootstrap {
                Some(url) => {
                    if (url.to_string() == "https://bootstrap.holo.host")
                        || (url.to_string() == "http://bootstrap.holo.host")
                            && self.force_production == false
                    {
                        eprintln!(
                            r#"
ERROR

You are attempting to use the official production bootstrap server of holochain.
It is recommended to instead use the `hc run-local-services` command of the holochain CLI to spawn a local bootstrap and signaling server for testing.
If you are sure that you want to use the production bootstrap server with hc launch, use the --force-production flag.

"#
                        );

                        panic!("Attempted to use production bootstrap server without explicitly allowing it.");
                    }
                }
                _ => (),
            }
        }

        match self.path.extension() {
            Some(extension) => {
                if extension.to_str().unwrap() != "webhapp" {
                    eprintln!("[we-test-applet] Error: You need to provide a path that points to a .webhapp file.\nRun `we-test-applet --help` for help.");
                    return Err(WeError::CustomError(String::from(
                        "The path provided does not point to a .webhapp file.",
                    )))?;
                }
            }
            None => Err(WeError::CustomError(String::from(
                "The path provided does not point to a .webhapp file.",
            )))?,
        };

        let id = Uuid::new_v4();
        let group_network_seed = id.to_string();

        let id = Uuid::new_v4();
        let applet_network_seed = id.to_string();

        let bytes = fs::read(self.path)?;

        // decoding .webhapp file
        let web_app_bundle = WebAppBundle::decode(&bytes)?;

        we_alpha::tauri_builder()
            .setup(move |app| {
                let app_handle = app.handle();
                let temp_dir = tempdir::TempDir::new("we_test_applet").unwrap();
                let temp_folder = temp_dir.path().to_path_buf();

                let app_data_dir = temp_folder.join("data");
                let app_config_dir = temp_folder.join("config");
                let app_log_dir = temp_folder.join("log");
                fs::create_dir_all(app_data_dir.clone())?;
                fs::create_dir_all(app_config_dir.clone())?;
                fs::create_dir_all(app_log_dir.clone())?;
                let fs = WeFileSystem {
                    app_data_dir,
                    app_config_dir,
                    app_log_dir,
                };

                fs.create_initial_directory_structure()?;

                app.manage(fs.clone());
                app.manage(Profile::from("test-applet"));
                app.manage(Mutex::new(SysTrayIconState {
                    icon_state: IconState::Clean,
                }));

                let window = build_main_window(&app_handle)?;

                let ui_server_port = portpicker::pick_unused_port().expect("No ports free");
                start_applet_uis_server(app_handle.clone(), ui_server_port);

                let config = WeConfig {
                    network_seed: Some(String::from("test_applet")),
                    applets_ui_port: ui_server_port,
                };

                app.manage(config.clone());

                let app_handle = app_handle.clone();
                // Launch holochain
                let result: WeResult<()> = tauri::async_runtime::block_on(async move {
                    let (lair_client, admin_port, app_port) =
                        launch(&app_handle, &config, &fs, String::from("UNSECURE")).await?;

                    // Join a group
                    let app_info = join_group(
                        window,
                        app_handle.state::<Mutex<AdminWebsocket>>(),
                        group_network_seed,
                    )
                    .await?;

                    let mut group_app_client = AppAgentWebsocket::connect(
                        format!("ws://localhost:{}", app_port),
                        app_info.installed_app_id,
                        lair_client.lair_client(),
                    )
                    .await?;

                    let app_bundle = web_app_bundle.happ_bundle().await?;

                    let description = match app_bundle.manifest() {
                        AppManifest::V1(v1) => v1.description.clone().unwrap_or(String::from("")),
                    };

                    let applet = Applet {
                        // name of the applet as chosen by the person adding it to the group,
                        custom_name: app_bundle.manifest().app_name().to_string(),
                        description,

                        appstore_app_hash: fixt!(ActionHash),

                        devhub_dna_hash: fixt!(DnaHash),
                        devhub_happ_entry_action_hash: fixt!(ActionHash),
                        devhub_happ_release_hash: fixt!(ActionHash),
                        initial_devhub_gui_release_hash: None, // headless applets are possible as well

                        network_seed: Some(applet_network_seed.clone()),

                        properties: BTreeMap::new(),
                    };

                    let result = group_app_client
                        .call_zome_fn(
                            RoleName::from("group"),
                            ZomeName::from("group"),
                            FunctionName::from("register_applet"),
                            ExternIO::encode(applet)?,
                        )
                        .await?;
                    let applet_hash: EntryHash = result.decode()?;

                    // Create the applet in the group to get the app id

                    let mut admin_ws =
                        AdminWebsocket::connect(format!("ws://localhost:{}", admin_port))
                            .await
                            .map_err(|err| {
                                LaunchHolochainError::CouldNotConnectToConductor(format!("{}", err))
                            })?;

                    // Install applet in a group
                    let agent_key = admin_ws.generate_agent_pub_key().await?;
                    let app_id = format!("applet#{}", EntryHashB64::from(applet_hash));
                    admin_ws
                        .install_app(InstallAppPayload {
                            source: holochain_types::prelude::AppBundleSource::Bundle(
                                web_app_bundle.happ_bundle().await?,
                            ),
                            agent_key,
                            network_seed: Some(applet_network_seed),
                            installed_app_id: Some(app_id.clone()),
                            membrane_proofs: HashMap::new(),
                        })
                        .await?;
                    admin_ws.enable_app(app_id.clone()).await?;

                    admin_ws.close();

                    fs.ui_store()
                        .extract_and_store_ui(UiIdentifier::Other(app_id.clone()), &web_app_bundle)
                        .await?;

                    Ok(())
                });

                Ok(())
            })
            .build(tauri::generate_context!())
            .expect("error while running tauri application")
            .run(|app_handle, event| {
                match event {
                    // This event is emitted upon pressing the x to close the App window
                    // The app is prevented from exiting to keep it running in the background with the system tray
                    RunEvent::ExitRequested { api, .. } => api.prevent_exit(),

                    // This event is emitted upon quitting the App via cmq+Q on macOS.
                    // Sidecar binaries need to get explicitly killed in this case (https://github.com/holochain/launcher/issues/141)
                    RunEvent::Exit => {
                        tauri::api::process::kill_children();
                    }

                    // also let the window run in the background to have the UI keep listening to notifications
                    RunEvent::WindowEvent { label, event, .. } => {
                        if label == "main" {
                            if let WindowEvent::CloseRequested { api, .. } = event {
                                api.prevent_close();
                                let main_window = app_handle.get_window("main").unwrap();
                                main_window.hide().unwrap();
                            }
                        }
                    }

                    _ => (),
                }
            });

        Ok(())
    }
}

/// Reads the contents of the .hc_live_{n} files in the given path where n is 0 to n_expected
pub fn get_running_ports(path: PathBuf, n_expected: usize) -> Vec<u16> {
    let mut running_ports = Vec::new();

    // get ports of running conductors from .hc_live and if there are none, throw an error.
    for n in 0..n_expected {
        let dot_hc_live_path = path.join(format!(".hc_live_{}", n));

        while !dot_hc_live_path.exists() {
            println!("[hc launch with --reuse-conductors] No *running* sandbox conductor found (yet). Waiting for running sandbox conductor(s)...");
            std::thread::sleep(std::time::Duration::from_secs(2));
        }

        let admin_port = match std::fs::read_to_string(dot_hc_live_path) {
            Ok(p) => p,
            Err(e) => match n {
                0 => {
                    println!("[hc launch] ERROR: No running sandbox conductors found. If you use the --reuse-conductors flag there need to be existing sandbox conductors running.\n {}", e);
                    panic!("ERROR: No running snadbox conductors found. If you use the --reuse-conductors flag there need to be existing sandbox conductors running.\n {}", e);
                }
                _ => {
                    println!("[hc launch] ERROR: Not enough running sandbox conductors found. If you use the --reuse-conductors flag there need to be as many running sandbox conductors as mentioned in the .hc file.\n {}", e);
                    panic!("ERROR: No running snadbox conductors found. If you use the --reuse-conductors flag there need to be as many running sandbox conductors as mentioned in the .hc file.\n {}", e);
                }
            },
        };

        let admin_port = match admin_port.trim().parse::<u16>() {
            Ok(u) => u,
            Err(e) => {
                println!(
                    "[hc launch] ERROR: Failed to convert admin port from String to u16: {}",
                    e
                );
                panic!("Failed to convert admin port from String to u16: {}", e);
            }
        };

        running_ports.push(admin_port);
    }

    running_ports
}
