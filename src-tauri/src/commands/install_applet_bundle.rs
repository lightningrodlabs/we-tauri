use std::{
    collections::{BTreeMap, HashMap},
    fs,
    fs::File,
    io::Write,
    path::PathBuf,
    sync::Arc,
};

use devhub_types::{
    dnarepo_entry_types::DnaVersionPackage,
    encode_bundle,
    happ_entry_types::{GUIReleaseEntry, HappManifest, ResourceRef, WebHappManifest},
    web_asset_entry_types::FilePackage,
    DevHubResponse, DnaEntry, DnaVersionEntry, Entity, EntityResponse, EntityType, GetEntityInput,
    HappReleaseEntry,
};
use essence::EssenceResponse;
use futures::lock::Mutex;
use hc_portal_types::HostEntry;
use hdk::prelude::{
    CellId, EntryHash, ExternIO, FunctionName, HumanTimestamp, MembraneProof, RoleName, Serialize,
    SerializedBytes, Timestamp, UnsafeBytes, ZomeCallUnsigned, ZomeName,
};
use holochain::{
    conductor::Conductor,
    prelude::{
        kitsune_p2p::dependencies::kitsune_p2p_types::dependencies::lair_keystore_api::LairClient,
        AppBundleSource,
    },
};
use holochain_client::{AgentPubKey, AppInfo, AppWebsocket, ConductorApiResult, InstallAppPayload};
use serde::Deserialize;

use crate::{
    default_apps::{appstore_app_id, devhub_app_id},
    filesystem::WeFileSystem,
    launch::get_admin_ws,
    state::{LaunchedState, WeError, WeResult},
};

#[tauri::command]
pub async fn fetch_icon(
    conductor: tauri::State<'_, Mutex<Conductor>>,
    we_fs: tauri::State<'_, WeFileSystem>,
    app_entry_hash_b64: String,
) -> WeResult<String> {
    let app_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(app_entry_hash_b64.as_str()).unwrap());

    if let Some(icon) = we_fs.icon_store().get_icon(&app_entry_hash) {
        return Ok(icon);
    }

    let mut conductor = conductor.lock().await;

    let mut client = AppAgentWebsocket::connect(
        format!("ws://localhost:{}", conductor.list_app_interfaces()?[0]),
        appstore_app_id(),
        conductor.keystore().lair_client(),
    )
    .await?;

    let response: EntityResponse<AppEntry> = client
        .call_zome_fn(
            RoleName::from("appstore"),
            ZomeName::from("appstore_api"),
            FnName::from("get_app"),
            ExternIO::encode(GetEntityInput { id: app_entry_hash }),
        )
        .await?;
    let app_entry = response.as_result()?;

    let result = client
        .call_zome_fn(
            RoleName::from("appstore"),
            ZomeName::from("mere_memore_api"),
            FunctionName::from("retrieve_bytes"),
            ExternIO::encode(response.icon.clone())?,
        )
        .await?;
    let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
    let bytes = bytes.as_result()?;
    let icon_src = String::from_utf8(bytes);

    we_fs.icon_store().store_icon(&app_entry_hash, icon_src)?;

    Ok(bytes)
}

pub async fn internal_fetch_applet_bundle(
    conductor: &Conductor,
    we_fs: &WeFileSystem,
    devhub_dna: DnaHash,
    happ_release_hash: EntryHash,
    gui_release_hash: EntryHash,
) -> WeResult<WebAppBundle> {
    let happ_release_hash_b64 = EntryHashB64::from(happ_release_hash.clone()).to_string();

    if let Some(web_app) = we_fs.webapp_store().get_webapp(&happ_release_hash_b64) {
        return Ok(web_app);
    }

    let bytes = fetch_web_happ(
        conductor.list_app_interfaces()?[0],
        conductor.keystore().lair_client(),
        devhub_dna,
        happ_release_hash,
        gui_release_hash,
    )
    .await?;

    // TODO: remove all this when devhub supports icons

    let web_app_bundle = WebAppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
        String::from("Failed to read Web hApp bundle file"),
    )))?;

    we_fs
        .webapp_store()
        .store_webapp(&happ_release_hash_b64, &web_app_bundle)?;

    Ok(web_app_bundle)
}

#[tauri::command]
pub async fn install_applet_bundle(
    conductor: tauri::State<'_, Mutex<Conductor>>,
    fs: tauri::State<'_, WeFileSystem>,
    app_id: String,
    network_seed: Option<String>,
    membrane_proofs: HashMap<String, Vec<u8>>,
    agent_pub_key: String, // TODO: remove when every applet has a different key
    devhub_dna_hash: String,
    happ_release_hash: String,
    gui_release_hash: String,
) -> WeResult<AppInfo> {
    log::info!("Installing: app_id = {:?}", app_id);

    let mut converted_membrane_proofs: HashMap<String, MembraneProof> = HashMap::new();
    for (dna_slot, proof) in membrane_proofs.iter() {
        converted_membrane_proofs.insert(
            dna_slot.clone(),
            Arc::new(SerializedBytes::from(UnsafeBytes::from(proof.clone()))),
        );
    }

    let pub_key = AgentPubKey::from(AgentPubKeyB64::from_b64_str(agent_pub_key.as_str()).unwrap());
    let host_pub_key = AgentPubKey::from(AgentPubKeyB64::from_b64_str(host.as_str()).unwrap());
    let devhub_dna_hash =
        DnaHash::from(DnaHashB64::from_b64_str(devhub_dna_hash.as_str()).unwrap());
    let happ_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(happ_release_hash.as_str()).unwrap());
    let gui_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(gui_release_hash.as_str()).unwrap());

    let conductor = conductor.lock().await;

    let web_app_bundle = internal_fetch_applet_bundle(
        &conductor,
        &fs,
        devhub_dna_hash,
        happ_release_entry_hash,
        gui_release_entry_hash,
    )
    .await?;

    let admin_ws = get_admin_ws(&conductor).await?;

    let app_info = admin_ws
        .install_app(InstallAppPayload {
            source: AppBundleSource::Bundle(web_app_bundle),
            agent_key: pub_key,
            installed_app_id: Some(happ_release_hash),
            network_seed,
            membrane_proofs,
        })
        .await?;

    log::info!("Installed hApp {}", app_id);

    Ok(app_info)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteCallDetails<Z, F, I>
where
    Z: Into<ZomeName>,
    F: Into<FunctionName>,
    I: Serialize + core::fmt::Debug,
{
    pub dna: DnaHash,
    pub zome: Z,
    pub function: F,
    pub payload: I,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct FetchWebHappRemoteCallInput {
    host: AgentPubKey,
    call: RemoteCallDetails<String, String, GetWebHappPackageInput>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebHappBundle {
    pub manifest: WebHappManifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HappBundle {
    pub manifest: HappManifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}
#[derive(Debug, Serialize)]
pub struct GetWebHappPackageInput {
    pub name: String,
    pub happ_release_id: EntryHash,
    pub gui_release_id: EntryHash,
}
async fn fetch_web_happ(
    app_port: u16,
    lair_client: LairClient,
    devhub_dna: DnaHash,
    happ_release_entry_hash: EntryHash,
    gui_release_entry_hash: EntryHash,
) -> WeResult<Vec<u8>> {
    let mut client = AppAgentWebsocket::connect(
        format!("ws://localhost:{}", app_port),
        appstore_app_id(),
        lair_client,
    )
    .await?;

    let payload = GetWebHappPackageInput {
        name,
        happ_release_id: happ_release_entry_hash,
        gui_release_id: gui_release_entry_hash,
    };

    let hosts = get_available_hosts(&mut client, devhub_dna).await?;

    for host in hosts {
        if let Ok(web_app_bytes) = get_webhapp_from_host(&mut client, &devhub_dna, host).await {
            return Ok(web_app_bytes);
        }
    }

    return Err(WeError::AppWebsocketError(String::from(
        "Couldn't fetch the webhapp from any of the hosts",
    )));
}

fn get_webhapp_from_host(
    app_store_client: &mut AppAgentWebsocket,
    devhub_dna: &DnaHash,
    host: &AgentPubKey,
) -> WeResult<Vec<u8>> {
    let input = FetchWebHappRemoteCallInput {
        host,
        call: RemoteCallDetails {
            dna: devhub_dna.clone(),
            zome: String::from("happ_library"),
            function: String::from("get_webhapp_package"),
            payload,
        },
    };
    let result = client
        .call_zome_fn(
            RoleName::from("portal"),
            ZomeName::from("portal_api"),
            FunctionName::from("custom_remote_call"),
            ExternIO::encode(input)?,
        )
        .await?;

    let response: DevHubResponse<DevHubResponse<Vec<u8>>> = result.decode()?;

    let inner_response = match response {
        DevHubResponse::Success(pack) => pack.payload,
        DevHubResponse::Failure(error) => {
            return Err(WeError::AppWebsocketError(format!(
                "Received ErrorPayload: {:?}",
                error.payload
            )));
        }
    };

    let bytes = inner_response
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    Ok(bytes)
}

fn get_available_hosts(
    app_store_client: &mut AppAgentWebsocket,
    devhub_dna: DnaHash,
) -> WeResult<Vec<AgentPubKey>> {
    let hosts: DevHubResponse<Vec<Entity<HostEntry>>> = app_store_client
        .call_zome_fn(
            RoleName::from("portal"),
            ZomeName::from("portal_api"),
            FnName::from("get_hosts_for_zome_function"),
            ExternIO::encode(DnaZomeFunction {
                dna: devhub_dna,
                zome: ZomeName::from("happ_library"),
                function: FnName::from("get_webhapp_package"),
            })?,
        )
        .await?;

    let hosts = hosts.as_result()?;
    let hosts = hosts.into_iter().map(|e| e.content.author).collect();

    let mut handles = Vec::new();

    for host in hosts {
        let client = app_store_client.clone();
        handles.push(tauri::async_runtime::spawn(|| {
            is_host_available(&mut client, devhub_dna, host)
        }));
    }

    let mut available_hosts = Vec::new();

    for (i, handle) in handles.into_iter().enumerate() {
        if let Ok(true) = handle.await {
            available_hosts.push(hosts[i]);
        }
    }

    Ok(available_hosts)
}

async fn is_host_available(
    app_store_client: &mut AppAgentWebsocket,
    devhub_dna: &DnaHash,
    host: &AgentPubKey,
) -> WeResult<bool> {
    let response: EssenceResponse<_> = app_store_client
        .call_zome_fn(
            RoleName::from("portal"),
            ZomeName::from("portal_api"),
            FnName::from("ping"),
            ExternIO::encode(host.clone())?,
        )
        .await?
        .decode()?;

    response.as_result().map(|| true)
}

// ------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyRef {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleIntegrityZomeInfo {
    pub name: String,
    pub bundled: String,

    // Optional fields
    pub hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleZomeInfo {
    pub name: String,
    pub bundled: String,
    pub dependencies: Vec<DependencyRef>,

    // Optional fields
    pub hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manifest {
    pub manifest_version: String,
    pub name: String,
    pub integrity: IntegrityZomes,
    pub coordinator: CoordinatorZomes,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IntegrityZomes {
    origin_time: HumanTimestamp,
    zomes: Vec<BundleIntegrityZomeInfo>,

    // Optional fields
    pub network_seed: Option<String>,
    pub properties: Option<BTreeMap<String, serde_yaml::Value>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CoordinatorZomes {
    zomes: Vec<BundleZomeInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bundle {
    pub manifest: Manifest,
    pub resources: BTreeMap<String, Vec<u8>>,
}
async fn get_dna_package(
    client: &mut AppAgentWebsocket,
    dna_version_hash: EntryHash,
) -> WeResult<Entity<DnaVersionPackage>> {
    let result = client
        .call_zome_fn(
            RoleName::from("dnarepo"),
            ZomeName::from("dna_library"),
            FunctionName::from("get_dna_version"),
            ExternIO::encode(GetEntityInput {
                id: dna_version_hash.clone(),
            })?,
        )
        .await?;
    let dna_version: EntityResponse<DnaVersionEntry> = result.decode()?;
    let dna_version = dna_version.as_result()?;

    let result = client
        .call_zome_fn(
            RoleName::from("dnarepo"),
            ZomeName::from("dna_library"),
            FunctionName::from("get_dna"),
            ExternIO::encode(GetEntityInput {
                id: dna_version.content.for_dna.clone(),
            })?,
        )
        .await?;
    let dna: EntityResponse<DnaEntry> = result.decode()?;
    let dna = dna.as_result()?;

    let mut integrity_zomes: Vec<BundleIntegrityZomeInfo> = vec![];
    let mut coordinator_zomes: Vec<BundleZomeInfo> = vec![];
    let mut resources: BTreeMap<String, Vec<u8>> = BTreeMap::new();

    for zome_ref in dna_version.content.integrity_zomes.iter() {
        let result = client
            .call_zome_fn(
                RoleName::from("dnarepo"),
                ZomeName::from("mere_memory"),
                FunctionName::from("retrieve_bytes"),
                ExternIO::encode(zome_ref.resource.clone())?,
            )
            .await?;
        let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
        let bytes = bytes.as_result()?;
        let path = format!("./{}.wasm", zome_ref.name);

        integrity_zomes.push(BundleIntegrityZomeInfo {
            name: zome_ref.name.clone(),
            bundled: path.clone(),
            hash: None,
        });

        resources.insert(path, bytes);
    }

    for zome_ref in dna_version.content.zomes.iter() {
        let result = client
            .call_zome_fn(
                RoleName::from("dnarepo"),
                ZomeName::from("mere_memory"),
                FunctionName::from("retrieve_bytes"),
                ExternIO::encode(zome_ref.resource.clone())?,
            )
            .await?;
        let bytes: EssenceResponse<Vec<u8>, (), ()> = result.decode()?;
        let bytes = bytes.as_result()?;
        let path = format!("./{}.wasm", zome_ref.name);

        coordinator_zomes.push(BundleZomeInfo {
            name: zome_ref.name.clone(),
            bundled: path.clone(),
            hash: None,
            dependencies: zome_ref
                .dependencies
                .iter()
                .map(|name| DependencyRef {
                    name: name.to_owned(),
                })
                .collect(),
        });

        resources.insert(path, bytes);
    }

    let bundle = Bundle {
        manifest: Manifest {
            manifest_version: "1".into(),
            name: dna.content.name,
            integrity: IntegrityZomes {
                origin_time: dna_version.content.origin_time.clone(),
                network_seed: dna_version.content.network_seed.clone(),
                properties: dna_version.content.properties.clone(),
                zomes: integrity_zomes,
            },
            coordinator: CoordinatorZomes {
                zomes: coordinator_zomes,
            },
        },
        resources,
    };

    let dna_pack_bytes =
        encode_bundle(bundle).map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let package = dna_version.content.to_package(dna_pack_bytes);

    Ok(Entity {
        id: dna_version.id,
        action: dna_version.action,
        address: dna_version.address,
        ctype: EntityType::new("dna_version", "package"),
        content: package,
    })
}

#[derive(Clone)]
struct AppAgentWebsocket {
    app_ws: AppWebsocket,
    app_info: AppInfo,
    lair_client: LairClient,
}

impl AppAgentWebsocket {
    pub async fn connect(url: String, app_id: String, lair_client: LairClient) -> WeResult<Self> {
        let mut app_ws = AppWebsocket::connect(url)
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

        let app_info = app_ws
            .app_info(app_id.clone())
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?
            .ok_or(WeError::NotRunning)?;

        Ok(AppAgentWebsocket {
            app_ws,
            app_info,
            lair_client,
        })
    }

    pub async fn call_zome_fn(
        &mut self,
        role_name: RoleName,
        zome_name: ZomeName,
        fn_name: FunctionName,
        payload: ExternIO,
    ) -> WeResult<ExternIO> {
        let cell_id = self.get_cell_id_from_role_name(&role_name)?;

        let agent_pub_key = self.app_info.agent_pub_key.clone();

        let (nonce, expires_at) = fresh_nonce(Timestamp::now())
            .map_err(|err| WeError::DatabaseError(format!("{:?}", err)))?;

        let zome_call_unsigned = ZomeCallUnsigned {
            provenance: agent_pub_key,
            cell_id,
            zome_name,
            fn_name,
            payload,
            cap_secret: None,
            expires_at,
            nonce,
        };

        let signed_zome_call =
            sign_zome_call_with_client(zome_call_unsigned_converted, &self.lair_client)
                .await
                .map_err(|err| WeError::SignZomeCallError(err))?;

        let result = self
            .app_ws
            .call_zome(signed_zome_call)
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

        Ok(result)
    }

    fn get_cell_id_from_role_name(&self, role_name: &RoleName) -> WeResult<CellId> {
        if is_clone_id(role_name) {
            let base_role_name = get_base_role_name_from_clone_id(role_name);

            let Some(role_cells) = self.app_info.cell_info.get(&base_role_name) else {
               return Err(WeError::AppWebsocketError(format!("No cell found with role_name {}", role_name)));
            };

            let maybe_clone_cell: Option<ClonedCell> =
                role_cells.into_iter().find_map(|cell| match cell {
                    CellInfo::Cloned(cloned_cell) => {
                        if cloned_cell.clone_id.0.eq(role_name) {
                            Some(cloned_cell.clone())
                        } else {
                            None
                        }
                    }
                    _ => None,
                });

            let clone_cell = maybe_clone_cell.ok_or(WeError::AppWebsocketError(format!(
                "No clone cell found with clone id {}",
                role_name
            )))?;
            return Ok(clone_cell.cell_id);
        } else {
            let Some(role_cells) = self.app_info.cell_info.get(role_name) else {
               return Err(WeError::AppWebsocketError(format!("No cell found with role_name {}", role_name)));
            };

            let maybe_provisioned: Option<ProvisionedCell> =
                role_cells.into_iter().find_map(|cell| match cell {
                    CellInfo::Provisioned(provisioned_cell) => Some(provisioned_cell.clone()),
                    _ => None,
                });

            let provisioned_cell = maybe_provisioned.ok_or(WeError::AppWebsocketError(format!(
                "No clone cell found with role id {}",
                role_name
            )))?;
            return Ok(provisioned_cell.cell_id);
        }
    }
}

fn is_clone_id(role_name: &RoleName) -> bool {
    role_name.as_str().contains(".")
}

fn get_base_role_name_from_clone_id(role_name: &RoleName) -> RoleName {
    RoleName::from(
        role_name
            .as_str()
            .split(".")
            .into_iter()
            .map(|s| s.to_string())
            .collect::<Vec<String>>()
            .first()
            .unwrap(),
    )
}
