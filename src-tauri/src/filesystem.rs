use std::fs;
use std::path::PathBuf;

use holochain_manager::versions::HolochainVersion;
use tauri::AppHandle;

use crate::state::{WeError, WeResult};

pub struct WeFileSystem {
    pub app_data_dir: PathBuf,
    pub app_config_dir: PathBuf,
}

impl WeFileSystem {
    pub fn new(app_handle: &AppHandle, profile: &String) -> WeResult<WeFileSystem> {
        let app_data_dir =
            app_handle
                .path_resolver()
                .app_data_dir()
                .ok_or(WeError::FileSystemError(String::from(
                    "Could not resolve the data dir for this app",
                )))?.join(profile);
        let app_config_dir =
            app_handle
                .path_resolver()
                .app_config_dir()
                .ok_or(WeError::FileSystemError(String::from(
                    "Could not resolve the data dir for this app",
                )))?.join(profile);

        fs::create_dir_all(app_data_dir.join("webhapps"))
            .map_err(|err| WeError::IoError(format!("{:?}", err)))?;

        Ok(WeFileSystem {
            app_data_dir,
            app_config_dir,
        })
    }

    pub fn keystore_path(&self) -> PathBuf {
        self.app_data_dir.join("keystore")
    }

    pub fn conductor_path(&self, holochain_version: &HolochainVersion) -> PathBuf {
        self.app_data_dir
            .join("conductor")
            .join(holochain_version.to_string())
    }

    pub fn webhapps_path(&self) -> PathBuf {
        self.app_data_dir.join("webhapps")
    }
}
