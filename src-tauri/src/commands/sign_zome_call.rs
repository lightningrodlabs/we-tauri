use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use holochain_client::ZomeCall;
use holochain_launcher_utils::zome_call_signing::{
    sign_zome_call_with_client, ZomeCallUnsignedTauri,
};
use holochain_types::prelude::ZomeCallUnsigned;

use crate::error::{WeError, WeResult};

#[tauri::command]
pub async fn sign_zome_call(
    conductor: tauri::State<'_, Mutex<ConductorHandle>>,
    zome_call_unsigned: ZomeCallUnsignedTauri,
) -> WeResult<ZomeCall> {
    if cfg!(debug_assertions) {
        println!("### Called tauri command 'sign_zome_call'.");
    }
    let zome_call_unsigned_converted: ZomeCallUnsigned = zome_call_unsigned.into();

    let conductor = conductor.lock().await;
    let signed_zome_call = sign_zome_call_with_client(
        zome_call_unsigned_converted,
        &conductor.keystore().lair_client(),
    )
    .await
    .map_err(|err| WeError::SignZomeCallError(err))?;

    Ok(signed_zome_call)
}
