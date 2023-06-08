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
    DnaEntry, DnaVersionEntry, Entity, EntityResponse, EntityType, GetEntityInput,
    HappReleaseEntry,
};
use essence::EssenceResponse;
use futures::lock::Mutex;
use hdk::prelude::{
    CellId, EntryHash, ExternIO, FunctionName, HumanTimestamp, MembraneProof, RoleName, Serialize,
    SerializedBytes, Timestamp, UnsafeBytes, ZomeCallUnsigned, ZomeName,
};
use holochain_client::{AgentPubKey, AppInfo, AppWebsocket};
use holochain_manager::versions::holochain_conductor_api_latest::{
    CellInfo, ClonedCell, ProvisionedCell,
};
use holochain_state::nonce::fresh_nonce;
use holochain_types::{
    prelude::{AgentPubKeyB64, EntryHashB64},
    web_app::WebAppBundle,
};
use lair_keystore_manager::{versions::v0_2::LairKeystoreManagerV0_2, LairKeystoreManager};
use serde::Deserialize;

use crate::{
    default_apps::devhub_app_id,
    filesystem::WeFileSystem,
    state::{LaunchedState, WeError, WeResult},
};

#[tauri::command]
pub async fn fetch_icon(
    state: tauri::State<'_, Mutex<LaunchedState>>,
    we_fs: tauri::State<'_, WeFileSystem>,
    happ_release_hash_b64: String,
    gui_release_hash_b64: String,
) -> WeResult<Option<Vec<u8>>> {
    let happ_release_hash =
        EntryHash::from(EntryHashB64::from_b64_str(happ_release_hash_b64.as_str()).unwrap());
    let gui_release_hash =
        EntryHash::from(EntryHashB64::from_b64_str(gui_release_hash_b64.as_str()).unwrap());
    let mut m = state.lock().await;

    internal_fetch_applet_bundle(&mut m, &we_fs, happ_release_hash, gui_release_hash).await?;

    let ui_folder_path = we_fs.webhapps_path().join(happ_release_hash_b64);

    // TODO: change when devhub includes the icon
    let bytes = match fs::read(ui_folder_path.join("icon.png")) {
        Ok(bytes) => Some(bytes),
        Err(_) => None,
    };

    Ok(bytes)
}

pub async fn internal_fetch_applet_bundle(
    m: &mut LaunchedState,
    we_fs: &WeFileSystem,
    happ_release_hash: EntryHash,
    gui_release_hash: EntryHash,
) -> WeResult<Vec<u8>> {
    let happ_release_hash_b64 = EntryHashB64::from(happ_release_hash.clone()).to_string();
    let webhapp_path = we_fs
        .webhapps_path()
        .join(format!("{}.webhapp", happ_release_hash_b64));

    if webhapp_path.exists() {
        return fs::read(webhapp_path).map_err(|err| WeError::IoError(format!("{:?}", err)));
    }

    let bytes = fetch_web_happ(
        m.web_app_manager.app_interface_port(),
        &devhub_app_id(),
        &m.lair_keystore_manager,
        happ_release_hash,
        gui_release_hash,
    )
    .await?;

    let mut file =
        File::create(webhapp_path).map_err(|err| WeError::IoError(format!("{:?}", err)))?;

    file.write_all(bytes.as_slice())
        .map_err(|err| WeError::IoError(format!("{:?}", err)))?;

    // TODO: remove all this when devhub supports icons

    let web_app_bundle = WebAppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
        String::from("Failed to read Web hApp bundle file"),
    )))?;

    let ui_zip_path = we_fs
        .webhapps_path()
        .join(format!("{}.zip", happ_release_hash_b64));

    let ui_folder_path = we_fs
        .webhapps_path()
        .join(format!("{}", happ_release_hash_b64));

    fs::write(
        ui_zip_path.clone(),
        web_app_bundle
            .web_ui_zip_bytes()
            .await
            .map_err(|err| WeError::MrBundleError(format!("{:?}", err)))?
            .clone()
            .as_slice(),
    )
    .map_err(|err| WeError::IoError(format!("{:?}", err)))?;

    let file =
        File::open(ui_zip_path.clone()).map_err(|err| WeError::IoError(format!("{:?}", err)))?;
    unzip_file(file, ui_folder_path)?;

    fs::remove_file(ui_zip_path).map_err(|err| WeError::IoError(format!("{:?}", err)))?;

    Ok(bytes)
}

pub fn unzip_file(reader: File, outpath: PathBuf) -> WeResult<()> {
    let mut archive = match zip::ZipArchive::new(reader) {
        Ok(a) => a,
        Err(e) => {
            return Err(WeError::IoError(format!(
                "Failed to unpack zip archive: {}",
                e
            )))
        }
    };

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let outpath = match file.enclosed_name() {
            Some(path) => outpath.join(path).to_owned(),
            None => continue,
        };

        if (&*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath).unwrap();
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p).unwrap();
                }
            }
            let mut outfile = fs::File::create(&outpath).unwrap();
            std::io::copy(&mut file, &mut outfile).unwrap();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn install_applet_bundle(
    state: tauri::State<'_, Mutex<LaunchedState>>,
    fs: tauri::State<'_, WeFileSystem>,
    app_id: String,
    network_seed: Option<String>,
    membrane_proofs: HashMap<String, Vec<u8>>,
    agent_pub_key: String, // TODO: remove when every applet has a different key
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
    let happ_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(happ_release_hash.as_str()).unwrap());
    let gui_release_entry_hash =
        EntryHash::from(EntryHashB64::from_b64_str(gui_release_hash.as_str()).unwrap());
    let mut m = state.lock().await;

    let bytes =
        internal_fetch_applet_bundle(&mut m, &fs, happ_release_entry_hash, gui_release_entry_hash)
            .await?;

    let web_app_bundle = WebAppBundle::decode(&bytes).or(Err(WeError::FileSystemError(
        String::from("Failed to read Web hApp bundle file"),
    )))?;

    let app_info = m
        .web_app_manager
        .install_web_app(
            app_id.clone(),
            web_app_bundle,
            network_seed,
            converted_membrane_proofs,
            Some(pub_key),
            Some(happ_release_hash),
            Some(gui_release_hash),
        )
        .await
        .map_err(|err| WeError::WebAppManagerError(err))?;

    log::info!("Installed hApp {}", app_id);

    Ok(app_info)
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
    devhub_app_id: &String,
    lair_keystore_manager: &LairKeystoreManagerV0_2,
    happ_release_entry_hash: EntryHash,
    gui_release_entry_hash: EntryHash,
) -> WeResult<Vec<u8>> {
    let mut client = AppAgentClient::connect(
        format!("ws://localhost:{}", app_port),
        devhub_app_id.clone(),
    )
    .await?;

    let result = client
        .call_zome_fn(
            lair_keystore_manager,
            RoleName::from("happs"),
            ZomeName::from("happ_library"),
            FunctionName::from("get_gui_release"),
            ExternIO::encode(GetEntityInput {
                id: gui_release_entry_hash,
            })?,
        )
        .await?;

    let gui_release: EntityResponse<GUIReleaseEntry> = result
        .decode()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let gui_release = gui_release
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let result = client
        .call_zome_fn(
            lair_keystore_manager,
            RoleName::from("happs"),
            ZomeName::from("happ_library"),
            FunctionName::from("get_happ_release"),
            ExternIO::encode(GetEntityInput {
                id: happ_release_entry_hash,
            })?,
        )
        .await?;

    let happ_release: EntityResponse<HappReleaseEntry> = result
        .decode()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let mut happ_release = happ_release
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let mut resources: BTreeMap<String, Vec<u8>> = BTreeMap::new();

    for (i, dna_ref) in happ_release.content.dnas.iter().enumerate() {
        let version_entity: Entity<DnaVersionPackage> = get_dna_package(
            &mut client,
            lair_keystore_manager,
            dna_ref.version.to_owned(),
        )
        .await?;

        let path = format!("./{}.dna", dna_ref.role_name);

        resources.insert(path.clone(), version_entity.content.bytes);
        happ_release.content.manifest.roles[i].dna.bundled = path.clone();
    }

    let package = HappBundle {
        manifest: happ_release.content.manifest,
        resources,
    };

    let happ_pack_bytes =
        encode_bundle(package).map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let result = client
        .call_zome_fn(
            lair_keystore_manager,
            RoleName::from("web_assets"),
            ZomeName::from("web_assets"),
            FunctionName::from("get_file"),
            ExternIO::encode(GetEntityInput {
                id: gui_release.content.web_asset_id,
            })?,
        )
        .await?;

    let web_asset_entity: EntityResponse<FilePackage> = result
        .decode()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let web_asset_entity = web_asset_entity
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let mut resources: BTreeMap<String, Vec<u8>> = BTreeMap::new();

    // add UI resource
    let ui_bytes = web_asset_entity
        .content
        .bytes
        .ok_or(WeError::AppWebsocketError(String::from(
            "Missing GUI asset bytes",
        )))?;
    let ui_ref = String::from("./ui.zip");
    resources.insert(ui_ref.clone(), ui_bytes);

    // add hApp bundle resource
    let happ_ref = String::from("./bundle.happ");
    resources.insert(happ_ref.clone(), happ_pack_bytes);

    let package = WebHappBundle {
        manifest: WebHappManifest {
            manifest_version: String::from("1"),
            name: String::from("happ"),
            ui: ResourceRef { bundled: ui_ref },
            happ_manifest: ResourceRef { bundled: happ_ref },
        },
        resources,
    };

    let happ_pack_bytes =
        encode_bundle(package).map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    Ok(happ_pack_bytes)
}

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
    client: &mut AppAgentClient,
    lair_keystore_manager: &LairKeystoreManagerV0_2,
    dna_version_hash: EntryHash,
) -> WeResult<Entity<DnaVersionPackage>> {
    let result = client
        .call_zome_fn(
            lair_keystore_manager,
            RoleName::from("dnarepo"),
            ZomeName::from("dna_library"),
            FunctionName::from("get_dna_version"),
            ExternIO::encode(GetEntityInput {
                id: dna_version_hash.clone(),
            })?,
        )
        .await?;
    let dna_version: EntityResponse<DnaVersionEntry> = result
        .decode()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let dna_version = dna_version
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let result = client
        .call_zome_fn(
            lair_keystore_manager,
            RoleName::from("dnarepo"),
            ZomeName::from("dna_library"),
            FunctionName::from("get_dna"),
            ExternIO::encode(GetEntityInput {
                id: dna_version.content.for_dna.clone(),
            })?,
        )
        .await?;
    let dna: EntityResponse<DnaEntry> = result
        .decode()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
    let dna = dna
        .as_result()
        .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

    let mut integrity_zomes: Vec<BundleIntegrityZomeInfo> = vec![];
    let mut coordinator_zomes: Vec<BundleZomeInfo> = vec![];
    let mut resources: BTreeMap<String, Vec<u8>> = BTreeMap::new();

    for zome_ref in dna_version.content.integrity_zomes.iter() {
        let result = client
            .call_zome_fn(
                lair_keystore_manager,
                RoleName::from("dnarepo"),
                ZomeName::from("mere_memory"),
                FunctionName::from("retrieve_bytes"),
                ExternIO::encode(zome_ref.resource.clone())?,
            )
            .await?;
        let bytes: EssenceResponse<Vec<u8>, (), ()> = result
            .decode()
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
        let bytes = bytes
            .as_result()
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
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
                lair_keystore_manager,
                RoleName::from("dnarepo"),
                ZomeName::from("mere_memory"),
                FunctionName::from("retrieve_bytes"),
                ExternIO::encode(zome_ref.resource.clone())?,
            )
            .await?;
        let bytes: EssenceResponse<Vec<u8>, (), ()> = result
            .decode()
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
        let bytes = bytes
            .as_result()
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;
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

struct AppAgentClient {
    app_ws: AppWebsocket,
    app_info: AppInfo,
}

impl AppAgentClient {
    pub async fn connect(url: String, app_id: String) -> WeResult<Self> {
        let mut app_ws = AppWebsocket::connect(url)
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?;

        let app_info = app_ws
            .app_info(app_id.clone())
            .await
            .map_err(|err| WeError::AppWebsocketError(format!("{:?}", err)))?
            .ok_or(WeError::NotRunning)?;

        Ok(AppAgentClient { app_ws, app_info })
    }

    pub async fn call_zome_fn(
        &mut self,
        lair_keystore_manager: &LairKeystoreManagerV0_2,
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

        let signed_zome_call = lair_keystore_manager
            .sign_zome_call(zome_call_unsigned)
            .await?;

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
