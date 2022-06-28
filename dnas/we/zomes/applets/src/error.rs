use hdk::prelude::*;
use std::convert::Infallible;

#[derive(thiserror::Error, Debug)]
pub enum AppletsError {
    #[error(transparent)]
    Serialization(#[from] SerializedBytesError),
    #[error(transparent)]
    Infallible(#[from] Infallible),
    #[error(transparent)]
    EntryError(#[from] EntryError),
    #[error("Get failed")]
    GetError,
    #[error(transparent)]
    Wasm(#[from] WasmError),
    #[error(transparent)]
    Timestamp(#[from] TimestampError),
}

pub type AppletsResult<T> = Result<T, AppletsError>;

impl From<AppletsError> for WasmError {
    fn from(c: AppletsError) -> Self {
        WasmError::Guest(c.to_string())
    }
}
