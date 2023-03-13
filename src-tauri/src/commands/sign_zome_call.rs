use futures::lock::Mutex;
use hdk::prelude::AgentPubKey;
use holochain_launcher_utils::zome_call_signing::ZomeCallUnsignedTauri;
use holochain_types::prelude::ZomeCallUnsigned;
use lair_keystore_manager::*;

use crate::state::{LaunchedState, WeError, WeResult};

#[tauri::command]
pub async fn sign_zome_call(
    state: tauri::State<'_, Mutex<LaunchedState>>,
    provenance: AgentPubKey,
    zome_call_unsigned: ZomeCallUnsignedTauri,
) -> WeResult<ZomeCall> {
    let zome_call_unsigned_converted: ZomeCallUnsigned = zome_call_unsigned.into();

    let mut m = state.lock().await;

    let signed_zome_call = m
        .lair_keystore_manager
        .sign_zome_call(zome_call_unsigned_converted)
        .await?;

    Ok(signed_zome_call)
}
