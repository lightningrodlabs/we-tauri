use futures::lock::Mutex;
use holochain::conductor::Conductor;
use holochain_launcher_utils::zome_call_signing::{
    sign_zome_call_with_client, ZomeCallUnsignedTauri,
};
use holochain_types::prelude::ZomeCallUnsigned;

use crate::state::WeResult;

#[tauri::command]
pub async fn sign_zome_call(
    conductor: tauri::State<'_, Mutex<Conductor>>,
    zome_call_unsigned: ZomeCallUnsignedTauri,
) -> WeResult<ZomeCall> {
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
