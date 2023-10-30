//! Definitions of StructOpt options for use in the CLI

// use holochain_types::prelude::InstalledAppId;
// use std::path::Path;
use clap::Parser;
use futures::lock::Mutex;
use holochain_types::web_app::WebAppBundle;
use std::collections::{BTreeMap, HashMap};
use std::env::temp_dir;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, RunEvent};
use we_alpha::commands::install_applet_bundle::AppAgentWebsocket;
use we_types::{Applet, GroupProfile};

use fixt::fixt;
use holochain_cli_sandbox::cmds::{Network, NetworkCmd, NetworkType};
use holochain_client::AdminWebsocket;
use holochain_types::prelude::{
    ActionHashB64, ActionHashFixturator, AnyDhtHash, AnyDhtHashB64, DnaHashB64Fixturator,
    DnaHashFixturator,
};
use holochain_types::prelude::{
    AppManifest, EntryHash, EntryHashB64, ExternIO, FunctionName, InstallAppPayload, RoleName,
    ZomeName,
};

use uuid::Uuid;

use we_alpha::commands::notification::{IconState, SysTrayIconState};
use we_alpha::error::{LaunchHolochainError, WeResult};
use we_alpha::filesystem::{Profile, ReleaseInfo, ResourceLocatorB64, UiIdentifier, WeFileSystem};
use we_alpha::{
    applet_iframes::start_applet_uis_server, commands::join_group::join_group, config::WeConfig,
    error::WeError, launch::launch, window::build_main_window,
};

#[derive(Debug, Parser)]
/// Helper for launching holochain apps in a Holochain Launcher environment for testing and development purposes.
///
pub struct WeTestApplets {
    /// Path to multiple applets .webhapp files to install in the group to test with.
    #[clap( num_args = 1.., value_delimiter = ' ')]
    applets_paths: Vec<PathBuf>,

    /// Install the group and the applets with this network seed.
    #[arg(long)]
    network_seed: String,

    /// (flattened)
    #[command(subcommand)]
    network: NetworkCmd,

    /// Explicitly allow to use the official production signaling and/or bootstrap server(s)
    /// NOTE: It is strongly recommended to use local signaling and bootstrap servers during development.
    /// Bootstrap and signaling server for development can be started via `hc run-local-services`.
    #[arg(long)]
    force_production: bool,
}

impl WeTestApplets {
    /// Run this command
    pub fn run(self) -> WeResult<()> {
        let network = self.network.into_inner();
        // Fail if production signaling server is used unless the --force-production flag is used

        match network.transport.clone() {
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

        match network.bootstrap.clone() {
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

        let id = Uuid::new_v4();
        let we_test_applet_id = id.to_string();

        we_alpha::tauri_builder()
            .setup(move |app| {
                let app_handle = app.handle();
                tauri::async_runtime::block_on(async move {
                    setup_agent(
                        app_handle,
                        format!("test_applet_{}", we_test_applet_id),
                        network,
                        self.network_seed,
                        self.applets_paths,
                    )
                    .await
                })?;
                Ok(())
            })
            .build(tauri::generate_context!())
            .expect("error while running tauri application")
            .run(|_app_handle, event| {
                match event {
                    // This event is emitted upon quitting the App via cmq+Q on macOS.
                    // Sidecar binaries need to get explicitly killed in this case (https://github.com/holochain/launcher/issues/141)
                    RunEvent::Exit => {
                        tauri::api::process::kill_children();
                    }

                    _ => (),
                }
            });
        Ok(())
    }
}

async fn setup_agent(
    app_handle: AppHandle,
    profile: Profile,
    network: Network,
    network_seed: String,
    applets_paths: Vec<PathBuf>,
) -> WeResult<()> {
    let temp_dir = temp_dir();
    let temp_folder = temp_dir.join(&profile);
    println!("Using temporary directory: {:?}", temp_folder);
    fs::create_dir_all(temp_folder.clone())?;
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

    app_handle.manage(fs.clone());
    app_handle.manage(profile);
    app_handle.manage(Mutex::new(SysTrayIconState {
        icon_state: IconState::Clean,
    }));

    let window = build_main_window(&app_handle)?;

    let ui_server_port = portpicker::pick_unused_port().expect("No ports free");
    start_applet_uis_server(app_handle.clone(), ui_server_port);

    let config = WeConfig {
        network_seed: Some(String::from("test_applet")),
        applets_ui_port: ui_server_port,
    };

    app_handle.manage(config.clone());

    // Launch holochain
    let (lair_client, admin_port, app_port) = launch(
        &app_handle,
        &config,
        &fs,
        String::from("UNSECURE"),
        network.bootstrap,
        match network.transport {
            NetworkType::WebRTC { signal_url } => Some(signal_url),
            _ => None,
        },
    )
    .await?;
    println!("Joining group...");

    // Join a group
    let app_info = join_group(
        window,
        app_handle.state::<Mutex<AdminWebsocket>>(),
        network_seed.clone(),
    )
    .await?;
    println!("Joined group, {:?}", app_info);

    let mut group_app_client = AppAgentWebsocket::connect(
        format!("ws://localhost:{}", app_port),
        app_info.installed_app_id,
        lair_client.lair_client(),
    )
    .await?;

    group_app_client
        .call_zome_fn(
            RoleName::from("group"),
            ZomeName::from("group"),
            FunctionName::from("set_group_profile"),
            ExternIO::encode(GroupProfile {
                name: String::from("Test Applet Group"),
                logo_src: String::from(""),
            })?,
        )
        .await?;

    for path in applets_paths {
        match path.extension() {
            Some(extension) => {
                if extension.to_str().unwrap() != "webhapp" {
                    eprintln!("[we-test-applets] Error: You need to provide a path that points to a .webhapp file.\nRun `we-test-applets --help` for help.");
                    return Err(WeError::CustomError(format!(
                        "The path {:?} does not point to a .webhapp file.",
                        path
                    )))?;
                }
            }
            None => Err(WeError::CustomError(format!(
                "The path {:?} does not point to a .webhapp file.",
                path
            )))?,
        };
        // decoding .webhapp file
        let bytes = fs::read(path)?;
        let web_app_bundle = WebAppBundle::decode(&bytes)?;
        let app_bundle = web_app_bundle.happ_bundle().await?;
        let description = match app_bundle.manifest() {
            AppManifest::V1(v1) => v1.description.clone().unwrap_or(String::from("")),
        };
        let applet_name = app_bundle.manifest().app_name().to_string();
        let applet = Applet {
            // name of the applet as chosen by the person adding it to the group,
            custom_name: applet_name.clone(),
            description,

            appstore_app_hash: fixt!(ActionHash),

            devhub_dna_hash: fixt!(DnaHash),
            devhub_happ_entry_action_hash: fixt!(ActionHash),
            devhub_happ_release_hash: fixt!(ActionHash),
            initial_devhub_gui_release_hash: None, // headless applets are possible as well

            network_seed: Some(network_seed.clone()),

            properties: BTreeMap::new(),
        };
        println!("Registering applet {:?}", applet_name);

        let result = group_app_client
            .call_zome_fn(
                RoleName::from("group"),
                ZomeName::from("group"),
                FunctionName::from("register_applet"),
                ExternIO::encode(applet)?,
            )
            .await?;
        let applet_hash: EntryHash = result.decode()?;
        println!("Registered applet {:?}", applet_name);

        // Create the applet in the group to get the app id

        let mut admin_ws = AdminWebsocket::connect(format!("ws://localhost:{}", admin_port))
            .await
            .map_err(|err| LaunchHolochainError::CouldNotConnectToConductor(format!("{}", err)))?;

        // Install applet in a group
        let agent_key = admin_ws.generate_agent_pub_key().await?;
        let app_id = format!("applet#{}", EntryHashB64::from(applet_hash.clone()));
        println!("Installing applet {:?}", applet_name);
        admin_ws
            .install_app(InstallAppPayload {
                source: holochain_types::prelude::AppBundleSource::Bundle(app_bundle),
                agent_key,
                network_seed: Some(network_seed.clone()),
                installed_app_id: Some(app_id.clone()),
                membrane_proofs: HashMap::new(),
            })
            .await?;
        println!("Installed applet {:?}", applet_name);

        admin_ws.enable_app(app_id.clone()).await?;

        admin_ws.close();

        let mock_gui_release_hash = fixt!(ActionHash);

        fs.ui_store()
            .extract_and_store_ui(
                UiIdentifier::GuiReleaseHash(ActionHashB64::from(mock_gui_release_hash.clone())),
                &web_app_bundle,
            )
            .await?;
        fs.apps_store().store_happ_release_info(
            &app_id,
            ReleaseInfo {
                version: None,
                resource_locator: Some(ResourceLocatorB64 {
                    dna_hash: fixt!(DnaHashB64),
                    resource_hash: AnyDhtHashB64::from(AnyDhtHash::from(fixt!(ActionHash))),
                }),
            },
        )?;
        fs.apps_store().store_gui_release_info(
            &app_id,
            ReleaseInfo {
                version: None,
                resource_locator: Some(ResourceLocatorB64 {
                    dna_hash: fixt!(DnaHashB64),
                    resource_hash: AnyDhtHashB64::from(AnyDhtHash::from(mock_gui_release_hash)),
                }),
            },
        )?;
    }
    Ok(())
}
