use std::string::FromUtf8Error;

use essence::EssenceError;
use holochain::prelude::SerializedBytesError;
use holochain::{conductor::error::ConductorError, prelude::AppBundleError};
use holochain_client::ConductorApiError;
use zip::result::ZipError;

#[derive(Debug, thiserror::Error)]
pub enum WeError {
    #[error("Filesystem error: `{0}`")]
    FileSystemError(String),

    #[error("Failed to serialize or deserialize: `{0}`")]
    SerdeYamlError(String),

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

    #[error("Portal remote call failed: `{0}`")]
    PortalRemoteCallError(String),

    #[error("Fetching mere memory failed: `{0}`")]
    MereMemoryError(String),

    #[error("Failed to convert hash: `{0}`")]
    HashConversionError(String),

    #[error("No available DevHub host(s) found.")]
    NoAvailableHostsError(()),

    #[error("Tauri API error: `{0}`")]
    TauriApiError(#[from] tauri::api::Error),

    #[error("Attempted to call tauri command `{0}` from an unauthorized window")]
    UnauthorizedWindow(String),

    #[error("`{0}`")]
    CustomError(String),
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
