use std::path::PathBuf;

use holochain_manager::versions::HolochainVersion;

pub fn keystore_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("keystore")
}

pub fn conductor_path(root_dir: &PathBuf, holochain_version: &HolochainVersion) -> PathBuf {
    root_dir
        .join("conductor")
        .join(holochain_version.to_string())
}
