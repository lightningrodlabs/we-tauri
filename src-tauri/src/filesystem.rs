use std::path::PathBuf;
use std::{fs, io::Write};

use holochain::prelude::{ActionHash, ActionHashB64};
use holochain_client::InstalledAppId;
use holochain_types::web_app::WebAppBundle;
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

        fs::create_dir_all(app_data_dir.join("webhapps"))?;
        fs::create_dir_all(app_data_dir.join("icons"))?;

        Ok(WeFileSystem {
            app_data_dir,
            app_config_dir,
            app_log_dir,
        })
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

    pub fn conductor_dir(&self) -> PathBuf {
        self.app_data_dir.join("conductor")
    }

    pub fn webapp_store(&self) -> WebAppStore {
        WebAppStore {
            path: self.app_data_dir.join("webhapps"),
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

pub struct UiStore {
    path: PathBuf,
}

impl UiStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    pub fn ui_path(&self, installed_app_id: &InstalledAppId) -> PathBuf {
        self.path.join(installed_app_id)
    }

    pub async fn extract_and_store_ui(
        &self,
        installed_app_id: &InstalledAppId,
        web_app: &WebAppBundle,
    ) -> WeResult<()> {
        let ui_bytes = web_app.web_ui_zip_bytes().await?;

        let ui_folder_path = self.ui_path(installed_app_id);

        fs::create_dir_all(&ui_folder_path)?;

        let ui_zip_path = self.path.join("ui.zip");

        fs::write(ui_zip_path.clone(), ui_bytes.into_owned().into_inner())?;

        let file = std::fs::File::open(ui_zip_path.clone())?;
        unzip_file(file, ui_folder_path)?;

        fs::remove_file(ui_zip_path)?;

        Ok(())
    }
}

pub struct WebAppStore {
    path: PathBuf,
}

impl WebAppStore {
    pub fn root_dir(&self) -> PathBuf {
        self.path.clone()
    }

    fn webhapp_path(&self, web_app_action_hash: &ActionHash) -> PathBuf {
        let web_app_action_hash_b64 = ActionHashB64::from(web_app_action_hash.clone()).to_string();
        self.path.join(web_app_action_hash_b64)
    }

    pub fn webhapp_package_path(&self, web_app_action_hash: &ActionHash) -> PathBuf {
        self.webhapp_path(web_app_action_hash)
            .join("package.webhapp")
    }

    pub fn get_webapp(&self, web_app_action_hash: &ActionHash) -> WeResult<Option<WebAppBundle>> {
        let path = self.webhapp_path(web_app_action_hash);

        if path.exists() {
            let bytes = fs::read(self.webhapp_package_path(&web_app_action_hash))?;
            let web_app = WebAppBundle::decode(bytes.as_slice())?;

            return Ok(Some(web_app));
        } else {
            return Ok(None);
        }
    }

    pub async fn store_webapp(
        &self,
        web_app_action_hash: &ActionHash,
        web_app: &WebAppBundle,
    ) -> WeResult<()> {
        let bytes = web_app.encode()?;

        let path = self.webhapp_path(web_app_action_hash);

        fs::create_dir_all(path.clone())?;

        let mut file = std::fs::File::create(self.webhapp_package_path(web_app_action_hash))?;
        file.write_all(bytes.as_slice())?;

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
        0 => {
            match app_version.minor {
                0 => format!("0.0.{}", app_version.patch),
                _ => format!("0.{}.x", app_version.minor),
            }
        },
        _ => format!("{}.x.x", app_version.major)
    }
}