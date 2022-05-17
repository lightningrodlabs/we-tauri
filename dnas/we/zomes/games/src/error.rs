use hdk::prelude::*;
use std::convert::Infallible;

#[derive(thiserror::Error, Debug)]
pub enum GamesError {
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

pub type GamesResult<T> = Result<T, GamesError>;

impl From<GamesError> for WasmError {
    fn from(c: GamesError) -> Self {
        WasmError::Guest(c.to_string())
    }
}
