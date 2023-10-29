use std::fmt::Display;
use std::path::{Path, PathBuf};
use std::{fs, io::Write};

use holochain::prelude::{ActionHash, ActionHashB64};
use holochain_client::InstalledAppId;
use holochain_types::prelude::{AnyDhtHash, AnyDhtHashB64, AppBundle, DnaHash, DnaHashB64};
use holochain_types::web_app::WebAppBundle;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::error::{WeError, WeResult};

pub type Profile = String;

#[derive(Clone)]
pub struct WeFileSystem {
    pub app_data_dir: PathBuf,
    pub app_config_dir: PathBuf,
    pub app_log_dir: PathBuf,
}

impl WeFileSystem {
    pub fn new(app_handle: &AppHandle, profile: &String) -> WeResult<WeFileSystem> {
        let app_data_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?
            .join(breaking_app_version(app_handle))
            .join(profile);

        let app_config_dir = app_handle
            .path_resolver()
            .app_config_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?
            .join(breaking_app_version(app_handle))
            .join(profile);

        let app_log_dir = app_handle
            .path_resolver()
            .app_log_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the log dir for this app",
            )))?
            .join(breaking_app_version(app_handle))
            .join(profile);

        let fs = WeFileSystem {
            app_data_dir,
            app_config_dir,
            app_log_dir,
        };

        fs.create_initial_directory_structure()?;
        Ok(fs)
    }

    pub fn create_initial_directory_structure(&self) -> WeResult<()> {
        fs::create_dir_all(self.app_data_dir.join("happs"))?;
        fs::create_dir_all(self.app_data_dir.join("apps"))?;
        fs::create_dir_all(self.app_data_dir.join("icons"))?;
        fs::create_dir_all(self.app_data_dir.join("uis"))?;
        Ok(())
    }

    pub fn app_data_dir(&self) -> PathBuf {
        self.app_data_dir.clone()
    }

    pub fn app_config_dir(&self) -> PathBuf {
        self.app_config_dir.clone()
    }

    pub fn app_log_dir(&self) -> PathBuf {
        self.app_log_dir.clone()
    }

    pub fn keystore_dir(&self) -> PathBuf {
        self.app_data_dir.join("keystore")
    }

    pub fn keystore_initialized(&self) -> bool {
        self.keystore_dir()
            .join("lair-keystore-config.yaml")
            .exists()
    }

    pub fn conductor_dir(&self) -> PathBuf {
        self.app_data_dir.join("conductor")
    }

    pub fn happs_store(&self) -> HappsStore {
        HappsStore {
            path: self.app_data_dir.join("happs"),
        }
    }

    pub fn apps_store(&self) -> AppsStore {
        AppsStore {
            path: self.app_data_dir.join("apps"),
        }
    }

    pub fn icon_store(&self) -> IconStore {
        IconStore {
            path: self.app_data_dir.join("icons"),
        }
    }

    pub fn ui_store(&self) -> UiStore {
        UiStore {
            path: self.app_data_dir.join("uis"),
        }
    }
}

pub struct AppsStore {
    path: PathBuf,
}

impl AppsStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    pub fn store_gui_release_info(
        &self,
        installed_app_id: &InstalledAppId,
        info: ReleaseInfo,
    ) -> WeResult<()> {
        let app_dir = &self.path.join(installed_app_id);

        create_dir_if_necessary(app_dir).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to create directory before storing gui release info: {:?}",
                e
            ))
        })?;

        let gui_release_path = app_dir.join("gui-release.yaml");
        // if there is already a gui-release.yaml file, store its contents to a gui-release.previous.yaml file in order to be able
        // to revert upgrades if necessary
        if gui_release_path.exists() {
            let gui_release_dot_previous_path = app_dir.join("gui-release.previous.yaml");

            std::fs::rename(gui_release_path.clone(), gui_release_dot_previous_path)
            .map_err(|e| WeError::FileSystemError(format!("Failed to rename gui-release.yaml file to gui-release.previous.yaml file: {:?}", e)))?;
        }

        let info_value = serde_yaml::to_value(info).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert ResourceLocator of GUI release info to serde_yaml Value: {}",
                e
            ))
        })?;

        let info_string = serde_yaml::to_string(&info_value).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert info of GUI release from serde_yaml Value to string: {}",
                e
            ))
        })?;

        std::fs::write(gui_release_path, info_string).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to write GUI release info to gui-release.yaml file: {:?}",
                e
            ))
        })
    }

    pub fn store_happ_release_info(
        &self,
        installed_app_id: &InstalledAppId,
        info: ReleaseInfo,
    ) -> WeResult<()> {
        let app_dir = &self.path.join(installed_app_id);

        create_dir_if_necessary(app_dir).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to create directory before storing happ release info: {:?}",
                e
            ))
        })?;

        let happ_release_path = app_dir.join("happ-release.yaml");
        // if there is already a gui-release.yaml file, store its contents to a gui-release.previous.yaml file in order to be able
        // to revert upgrades if necessary
        if happ_release_path.exists() {
            let happ_release_dot_previous_path = app_dir.join("happ-release.previous.yaml");

            std::fs::rename(happ_release_path.clone(), happ_release_dot_previous_path)
            .map_err(|e| WeError::FileSystemError(format!("Failed to rename happ-release.yaml file to happ-release.previous.yaml file: {:?}", e)))?;
        }

        let info_value = serde_yaml::to_value(info).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert ResourceLocator of happ release info to serde_yaml Value: {}",
                e
            ))
        })?;

        let info_string = serde_yaml::to_string(&info_value).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert info of happ release from serde_yaml Value to string: {}",
                e
            ))
        })?;

        std::fs::write(happ_release_path, info_string).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to write happ release info to happ-release.yaml file: {:?}",
                e
            ))
        })
    }

    pub fn store_happ_entry_locator(
        &self,
        installed_app_id: &InstalledAppId,
        locator: ResourceLocatorB64,
    ) -> WeResult<()> {
        let app_dir = &self.path.join(installed_app_id);

        create_dir_if_necessary(app_dir).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to create directory before storing HappEntry info: {:?}",
                e
            ))
        })?;

        let happ_entry_path = app_dir.join("happ-entry.yaml");
        // if there is already a gui-release.yaml file, store its contents to a gui-release.previous.yaml file in order to be able
        // to revert upgrades if necessary
        if happ_entry_path.exists() {
            let happ_entry_dot_previous_path = app_dir.join("happ-entry.previous.yaml");

            std::fs::rename(happ_entry_path.clone(), happ_entry_dot_previous_path)
            .map_err(|e| WeError::FileSystemError(format!("Failed to rename happ-entry.yaml file to happ-entry.previous.yaml file: {:?}", e)))?;
        }

        let locator_value = serde_yaml::to_value(locator).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert ResourceLocator of GUI release info to serde_yaml Value: {}",
                e
            ))
        })?;

        let locator_string = serde_yaml::to_string(&locator_value).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to convert info of HappEntry from serde_yaml Value to string: {}",
                e
            ))
        })?;

        std::fs::write(happ_entry_path, locator_string).map_err(|e| {
            WeError::FileSystemError(format!(
                "Failed to write HappEntry info to happ-entry.yaml file: {:?}",
                e
            ))
        })
    }

    pub fn get_gui_release_info(&self, installed_app_id: &InstalledAppId) -> WeResult<ReleaseInfo> {
        let s = fs::read_to_string(self.path.join(installed_app_id).join("gui-release.yaml"))
            .map_err(|e| {
                WeError::FileSystemError(format!(
                    "Failed to read gui-release.yaml file for installed_app_id '{}'. Error: {}",
                    installed_app_id, e
                ))
            })?;
        serde_yaml::from_str::<ReleaseInfo>(s.as_str()).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to deserialize gui-release.yaml for installed_app_id '{}'. Error: {}",
                installed_app_id, e
            ))
        })
    }

    pub fn get_gui_release_hash(
        &self,
        installed_app_id: &InstalledAppId,
    ) -> WeResult<Option<ActionHashB64>> {
        let gui_release_info = self.get_gui_release_info(installed_app_id)?;
        match gui_release_info.resource_locator {
            Some(locator) => Ok(Some(
                ActionHash::try_from(AnyDhtHash::from(locator.resource_hash))
                    .map_err(|e| {
                        WeError::CustomError(format!(
                            "Failed to convert AnyDhtHash to ActionHash: {:?}",
                            e
                        ))
                    })?
                    .into(),
            )),
            None => Ok(None),
        }
    }

    pub fn get_happ_release_info(
        &self,
        installed_app_id: &InstalledAppId,
    ) -> WeResult<ReleaseInfo> {
        let s = fs::read_to_string(self.path.join(installed_app_id).join("happ-release.yaml"))
            .map_err(|e| {
                WeError::FileSystemError(format!(
                    "Failed to read happ-release.yaml file for installed_app_id '{}'. Error: {}",
                    installed_app_id, e
                ))
            })?;
        serde_yaml::from_str::<ReleaseInfo>(s.as_str()).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to deserialize happ-release.yaml for installed_app_id '{}'. Error: {}",
                installed_app_id, e
            ))
        })
    }

    pub fn get_happ_release_hash(
        &self,
        installed_app_id: &InstalledAppId,
    ) -> WeResult<Option<AnyDhtHashB64>> {
        let happ_release_info = self.get_happ_release_info(installed_app_id)?;
        match happ_release_info.resource_locator {
            Some(locator) => Ok(Some(locator.resource_hash)),
            None => Ok(None),
        }
    }

    pub fn get_happ_entry_locator(
        &self,
        installed_app_id: &InstalledAppId,
    ) -> WeResult<ReleaseInfo> {
        let s = fs::read_to_string(self.path.join(installed_app_id).join("happ-entry.yaml"))
            .map_err(|e| {
                WeError::FileSystemError(format!(
                    "Failed to read happ-entry.yaml file for installed_app_id '{}'. Error: {}",
                    installed_app_id, e
                ))
            })?;
        serde_yaml::from_str::<ReleaseInfo>(s.as_str()).map_err(|e| {
            WeError::SerdeYamlError(format!(
                "Failed to deserialize happ-entry.yaml for installed_app_id '{}'. Error: {}",
                installed_app_id, e
            ))
        })
    }

    pub fn get_happ_entry_action_hash(
        &self,
        installed_app_id: &InstalledAppId,
    ) -> WeResult<Option<AnyDhtHashB64>> {
        let happ_entry_info = self.get_happ_release_info(installed_app_id)?;
        match happ_entry_info.resource_locator {
            Some(locator) => Ok(Some(locator.resource_hash)),
            None => Ok(None),
        }
    }
}

/// Stores ui assets by gui release hash
pub struct UiStore {
    path: PathBuf,
}

#[derive(Clone, Debug)]
pub enum UiIdentifier {
    GuiReleaseHash(ActionHashB64),
    Other(String),
}

impl Into<String> for UiIdentifier {
    fn into(self) -> String {
        match self {
            UiIdentifier::GuiReleaseHash(hashb64) => hashb64.to_string(),
            UiIdentifier::Other(string) => string,
        }
    }
}

impl std::fmt::Display for UiIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            UiIdentifier::GuiReleaseHash(hashb64) => write!(f, "{}", hashb64.to_string()),
            UiIdentifier::Other(string) => write!(f, "{}", string),
        }
    }
}

impl UiStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    pub fn assets_dir(&self, ui_identifier: UiIdentifier) -> PathBuf {
        self.path.join(ui_identifier.to_string())
    }

    pub fn get_gui_version(&self, ui_identifier: UiIdentifier) -> Option<String> {
        let assets_dir = self.assets_dir(ui_identifier);
        match fs::read_to_string(assets_dir.join(".guiVersion")) {
            Ok(string) => Some(string),
            Err(e) => None,
        }
    }

    pub fn store_ui(
        &self,
        ui_identifier: UiIdentifier,
        bytes: Vec<u8>,
        gui_version: Option<String>,
    ) -> WeResult<()> {
        let assets_dir = self.assets_dir(ui_identifier);

        fs::create_dir_all(&assets_dir)?;

        let ui_zip_path = self.path.join("ui.zip");

        fs::write(ui_zip_path.clone(), bytes)?;

        let file = std::fs::File::open(ui_zip_path.clone())?;
        unzip_file(file, assets_dir.clone())?;

        fs::remove_file(ui_zip_path)?;

        if let Some(version) = gui_version {
            fs::write(assets_dir.join(".guiVersion"), version)?;
        }

        Ok(())
    }

    pub async fn extract_and_store_ui(
        &self,
        ui_identifier: UiIdentifier,
        web_app: &WebAppBundle,
    ) -> WeResult<()> {
        let ui_bytes = web_app.web_ui_zip_bytes().await?;

        let assets_dir = self.assets_dir(ui_identifier);

        fs::create_dir_all(&assets_dir)?;

        let ui_zip_path = self.path.join("ui.zip");

        fs::write(ui_zip_path.clone(), ui_bytes.into_owned().into_inner())?;

        let file = std::fs::File::open(ui_zip_path.clone())?;
        unzip_file(file, assets_dir)?;

        fs::remove_file(ui_zip_path)?;

        Ok(())
    }
}

pub struct HappsStore {
    path: PathBuf,
}

#[derive(Clone, Debug)]
pub enum HappIdentifier {
    HappReleaseHash(ActionHashB64),
    Other(String),
}

impl Into<String> for HappIdentifier {
    fn into(self) -> String {
        match self {
            HappIdentifier::HappReleaseHash(hashb64) => hashb64.to_string(),
            HappIdentifier::Other(string) => string,
        }
    }
}

impl std::fmt::Display for HappIdentifier {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            HappIdentifier::HappReleaseHash(hashb64) => write!(f, "{}", hashb64.to_string()),
            HappIdentifier::Other(string) => write!(f, "{}", string),
        }
    }
}

impl HappsStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    pub fn happ_package_path(&self, happ_identifier: HappIdentifier) -> PathBuf {
        self.path.join(format!("{}.happ", happ_identifier))
    }

    pub fn get_happ(&self, happ_identifier: HappIdentifier) -> WeResult<Option<AppBundle>> {
        let path = self.happ_package_path(happ_identifier);

        if path.exists() {
            let bytes = fs::read(path)?;
            let happ = AppBundle::decode(bytes.as_slice())?;

            return Ok(Some(happ));
        } else {
            return Ok(None);
        }
    }

    pub async fn store_happ(
        &self,
        happ_identifier: HappIdentifier,
        happ_bytes: Vec<u8>,
    ) -> WeResult<()> {
        let mut file = std::fs::File::create(self.happ_package_path(happ_identifier))?;
        file.write_all(happ_bytes.as_slice())?;
        Ok(())
    }
}

pub struct IconStore {
    path: PathBuf,
}

impl IconStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    fn icon_path(&self, app_action_hash: &ActionHash) -> PathBuf {
        self.path
            .join(ActionHashB64::from(app_action_hash.clone()).to_string())
    }

    pub fn store_icon(&self, app_action_hash: &ActionHash, icon_src: String) -> WeResult<()> {
        fs::write(self.icon_path(app_action_hash), icon_src.as_bytes())?;

        Ok(())
    }

    pub fn get_icon(&self, app_action_hash: &ActionHash) -> WeResult<Option<String>> {
        let icon_path = self.icon_path(app_action_hash);
        if icon_path.exists() {
            let icon = fs::read_to_string(icon_path)?;
            return Ok(Some(icon));
        } else {
            return Ok(None);
        }
    }
}

pub fn unzip_file(reader: std::fs::File, outpath: PathBuf) -> WeResult<()> {
    let mut archive = zip::ZipArchive::new(reader)?;

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

/// Returns a string considering the relevant part of the version regarding breaking changes
/// Examples:
/// 3.2.0 becomes 3.x.x
/// 0.2.2 becomes 0.2.x
/// 0.0.5 becomes 0.0.5
/// 0.2.3-alpha.2 remains 0.2.3-alpha.2 --> pre-releases always get their own storage location since we have to assume breaking changes
pub fn breaking_app_version(app_handle: &AppHandle) -> String {
    let app_version = app_handle.package_info().version.clone();

    if app_version.pre.is_empty() == false {
        return app_version.to_string();
    }

    match app_version.major {
        0 => match app_version.minor {
            0 => format!("0.0.{}", app_version.patch),
            _ => format!("0.{}.x", app_version.minor),
        },
        _ => format!("{}.x.x", app_version.major),
    }
}

pub fn create_dir_if_necessary(path: &PathBuf) -> WeResult<()> {
    if !path_exists(path) {
        fs::create_dir_all(path)?;
    }

    Ok(())
}

pub fn path_exists(path: &PathBuf) -> bool {
    Path::new(path).exists()
}

//// NOTE: This is not necessarily an HRL. For example UI's stored on the
/// DevHub need to be accessed via the `happs` cell despite being actually
/// stored in the `web_assets` cell. The DevHub is making a bridge call
/// internally.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ResourceLocator {
    pub dna_hash: DnaHash,
    pub resource_hash: AnyDhtHash,
}

impl Into<ResourceLocatorB64> for ResourceLocator {
    fn into(self) -> ResourceLocatorB64 {
        ResourceLocatorB64 {
            dna_hash: DnaHashB64::from(self.dna_hash),
            resource_hash: AnyDhtHashB64::from(self.resource_hash),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ResourceLocatorB64 {
    pub dna_hash: DnaHashB64,
    pub resource_hash: AnyDhtHashB64,
}

impl Into<ResourceLocator> for ResourceLocatorB64 {
    fn into(self) -> ResourceLocator {
        ResourceLocator {
            dna_hash: DnaHash::from(self.dna_hash),
            resource_hash: AnyDhtHash::from(self.resource_hash),
        }
    }
}

/// Info about happ or gui release
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReleaseInfo {
    pub resource_locator: Option<ResourceLocatorB64>,
    pub version: Option<String>,
}
