use std::path::PathBuf;
use std::{fs, io::Write};

use hdk::prelude::{ActionHash, EntryHash};
use holochain::prelude::{ActionHashB64, EntryHashB64};
use holochain_client::InstalledAppId;
use holochain_types::web_app::WebAppBundle;
use tauri::AppHandle;

use crate::{
    default_apps::we_version,
    state::{WeError, WeResult},
};

pub struct WeFileSystem {
    pub app_data_dir: PathBuf,
    pub app_config_dir: PathBuf,
}

impl WeFileSystem {
    pub fn new(app_handle: &AppHandle, profile: &String) -> WeResult<WeFileSystem> {
        let app_data_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?
            .join(we_version())
            .join(profile);
        let app_config_dir = app_handle
            .path_resolver()
            .app_config_dir()
            .ok_or(WeError::FileSystemError(String::from(
                "Could not resolve the data dir for this app",
            )))?
            .join(we_version())
            .join(profile);

        fs::create_dir_all(app_data_dir.join("webhapps"))?;
        fs::create_dir_all(app_data_dir.join("icons"))?;

        Ok(WeFileSystem {
            app_data_dir,
            app_config_dir,
        })
    }

    pub fn keystore_path(&self) -> PathBuf {
        self.app_data_dir.join("keystore")
    }

    pub fn conductor_path(&self) -> PathBuf {
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
}

pub struct WebAppStore {
    path: PathBuf,
}

impl WebAppStore {
    fn webhapp_path(&self, installed_app_id: &InstalledAppId) -> PathBuf {
        self.path.join(installed_app_id)
    }

    pub fn webhapp_package_path(&self, installed_app_id: &InstalledAppId) -> PathBuf {
        self.webhapp_path(installed_app_id).join("package.webhapp")
    }

    pub fn webhapp_ui_path(&self, installed_app_id: &InstalledAppId) -> PathBuf {
        self.webhapp_path(installed_app_id).join("ui")
    }

    pub fn get_webapp(&self, installed_app_id: &InstalledAppId) -> WeResult<Option<WebAppBundle>> {
        let path = self.webhapp_path(installed_app_id);

        if path.exists() {
            let bytes = fs::read(self.webhapp_package_path(&installed_app_id))?;
            let web_app = WebAppBundle::decode(bytes.as_slice())?;

            return Ok(Some(web_app));
        } else {
            return Ok(None);
        }
    }

    pub async fn store_webapp(
        &self,
        installed_app_id: &InstalledAppId,
        web_app: &WebAppBundle,
    ) -> WeResult<()> {
        let bytes = web_app.encode()?;

        let path = self.webhapp_path(installed_app_id);

        fs::create_dir_all(path.clone())?;

        let mut file = std::fs::File::create(self.webhapp_package_path(installed_app_id))?;
        file.write_all(bytes.as_slice())?;

        let ui_bytes = web_app.web_ui_zip_bytes().await?;

        let ui_folder_path = self.webhapp_ui_path(installed_app_id);

        fs::create_dir_all(&ui_folder_path)?;

        let ui_zip_path = path.join("ui.zip");

        fs::write(ui_zip_path.clone(), ui_bytes.into_owned().into_inner())?;

        let file = std::fs::File::open(ui_zip_path.clone())?;
        unzip_file(file, ui_folder_path)?;

        fs::remove_file(ui_zip_path)?;

        Ok(())
    }
}

pub struct IconStore {
    path: PathBuf,
}

impl IconStore {
    fn icon_path(&self, app_entry_hash: &ActionHash) -> PathBuf {
        self.path
            .join(ActionHashB64::from(app_entry_hash.clone()).to_string())
    }

    pub fn store_icon(&self, app_entry_hash: &ActionHash, icon_src: String) -> WeResult<()> {
        fs::write(self.icon_path(app_entry_hash), icon_src.as_bytes())?;

        Ok(())
    }

    pub fn get_icon(&self, app_entry_hash: &ActionHash) -> WeResult<Option<String>> {
        let icon_path = self.icon_path(app_entry_hash);
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
