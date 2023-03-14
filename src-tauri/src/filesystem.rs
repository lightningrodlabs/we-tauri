use std::path::PathBuf;

use holochain_manager::versions::HolochainVersion;
use tauri::AppHandle;

use crate::state::{WeError, WeResult};

pub struct WeFileSystem {
    pub app_data_dir: PathBuf,
    pub app_config_dir: PathBuf,
}

impl WeFileSystem {
    pub fn new(app_handle: &AppHandle) -> WeResult<WeFileSystem> {
        let mut app_data_dir =
            app_handle
                .path_resolver()
                .app_data_dir()
                .ok_or(WeError::FileSystemError(String::from(
                    "Could not resolve the data dir for this app",
                )))?;
        let mut app_config_dir =
            app_handle
                .path_resolver()
                .app_config_dir()
                .ok_or(WeError::FileSystemError(String::from(
                    "Could not resolve the data dir for this app",
                )))?;
        if cfg!(debug_assertions) {
            app_data_dir.pop();

            let admin_port: String = match option_env!("ADMIN_PORT") {
                Some(port) => port.parse().unwrap(),
                None => "".to_string(),
            };
            app_data_dir.push(format!("we-dev-{}", admin_port));

            app_config_dir.pop();

            let admin_port: String = match option_env!("ADMIN_PORT") {
                Some(port) => port.parse().unwrap(),
                None => "".to_string(),
            };
            app_config_dir.push(format!("we-dev-{}", admin_port));
        }

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
}
