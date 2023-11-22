use std::{env::temp_dir, fs, path::PathBuf};

use futures::lock::Mutex;
use std::collections::{BTreeMap, HashMap};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use we_types::{Applet, GroupProfile};

use fixt::fixt;
use holochain_client::AdminWebsocket;
use holochain_types::prelude::{
    ActionHashB64, ActionHashFixturator, AnyDhtHash, AnyDhtHashB64, DnaHashB64Fixturator,
    DnaHashFixturator,
};
use holochain_types::prelude::{
    AppManifest, EntryHash, EntryHashB64, ExternIO, FunctionName, InstallAppPayload, RoleName,
    ZomeName,
};
use holochain_types::web_app::WebAppBundle;

use crate::commands::join_group::inner_join_group;
use crate::config::WeConfig;
use crate::error::{LaunchHolochainError, WeError};
use crate::filesystem::{ReleaseInfo, ResourceLocatorB64, UiIdentifier};
use crate::window::build_main_window;
use crate::{
    commands::{install_applet_bundle::AppAgentWebsocket, join_group::join_group},
    error::WeResult,
    filesystem::{Profile, WeFileSystem},
    launch::launch,
};

pub async fn launch_test_applets_agent(
    app_handle: AppHandle,
    applets_paths: Vec<PathBuf>,
) -> WeResult<()> {
    let temp_dir = temp_dir();
    let id = Uuid::new_v4();
    let profile: Profile = id.to_string();
    let temp_folder = temp_dir.join(&profile);
    println!("Using temporary directory: {:?}", temp_folder);
    if temp_folder.exists() {
        fs::remove_dir_all(temp_folder.clone())?;
    }
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

    let config = app_handle.state::<WeConfig>();
    // Launch holochain
    let (lair_client, admin_port, app_port) =
        launch(&app_handle, &config, &fs, String::from("UNSECURE")).await?;
    println!("Joining group...");

    let network_seed = config.network_seed.clone();

    let window = build_main_window(&app_handle)?;
    // Join a group
    let app_info = inner_join_group(
        app_handle.state::<Mutex<AdminWebsocket>>(),
        network_seed.clone().unwrap_or(String::from("")),
    )
    .await?;
    println!("Joined group, {:?}", app_info.installed_app_id);

    let mut group_app_client = AppAgentWebsocket::connect(
        format!("ws://127.0.0.1:{}", app_port),
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
                logo_src: format!(r#"data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>account-group</title><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" /></svg>"#),
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

            network_seed: network_seed.clone(),

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

        let mut admin_ws = AdminWebsocket::connect(format!("ws://127.0.0.1:{}", admin_port))
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
                network_seed: network_seed.clone(),
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
