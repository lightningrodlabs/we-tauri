use std::string::FromUtf8Error;

use essence::EssenceError;
use holochain::prelude::SerializedBytesError;
use holochain::{conductor::error::ConductorError, prelude::AppBundleError};
use holochain_client::ConductorApiError;
use log::Level;
use serde::{Deserialize, Serialize};
use zip::result::ZipError;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SetupState {
    CreatePassword,
    EnterPassword,
}

// If not initialized: Not Running -->|run| Setup -->|init && launch(password)| Running
// If initialized:     Not Running -->|run| Setup -->|launch(password)| Running

pub fn log_level() -> Level {
    Level::Warn
}

#[derive(Debug, thiserror::Error)]
pub enum WeError {
    #[error("Filesystem error: `{0}`")]
    FileSystemError(String),

    #[error("Applets UI server error: `{0}`")]
    AppletsUIServerError(String),

    #[error("Holochain is not running")]
    NotRunning,

    #[error("ConductorApiError: `{0:?}`")]
    ConductorApiError(ConductorApiError),

    #[error("Database error: `{0}`")]
    DatabaseError(String),

    #[error(transparent)]
    SerializationError(#[from] SerializedBytesError),

    #[error(transparent)]
    AppBundleError(#[from] AppBundleError),

    #[error(transparent)]
    EssenceError(#[from] EssenceError),

    #[error(transparent)]
    ZipError(#[from] ZipError),

    #[error(transparent)]
    FromUtf8Error(#[from] FromUtf8Error),

    #[error(transparent)]
    IoError(#[from] std::io::Error),

    #[error(transparent)]
    MrBundleError(#[from] mr_bundle::error::MrBundleError),

    #[error(transparent)]
    ConductorError(#[from] ConductorError),

    #[error(transparent)]
    TauriError(#[from] tauri::Error),

    #[error("Admin Websocket Error: `{0}`")]
    AdminWebsocketError(String),

    #[error("App Websocket Error: `{0}`")]
    AppWebsocketError(String),

    #[error("Error signing zome call: `{0}`")]
    SignZomeCallError(String),
}

impl From<ConductorApiError> for WeError {
    fn from(value: ConductorApiError) -> Self {
        WeError::ConductorApiError(value)
    }
}

impl serde::Serialize for WeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type WeResult<T> = Result<T, WeError>;
