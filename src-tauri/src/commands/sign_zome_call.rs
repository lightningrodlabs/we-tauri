use futures::lock::Mutex;
use holochain_client::ZomeCall;
use holochain_keystore::MetaLairClient;
use holochain_launcher_utils::zome_call_signing::ZomeCallUnsignedTauri;
use holochain_types::prelude::ZomeCallUnsigned;

use crate::error::{WeError, WeResult};

#[tauri::command]
pub async fn sign_zome_call(
    meta_lair_client: tauri::State<'_, Mutex<MetaLairClient>>,
    zome_call_unsigned: ZomeCallUnsignedTauri,
) -> WeResult<ZomeCall> {
    if cfg!(debug_assertions) {
        println!("### {:?} Called tauri command 'sign_zome_call'.", std::time::SystemTime::now());
    }
    let zome_call_unsigned_converted: ZomeCallUnsigned = zome_call_unsigned.into();

    let keystore = meta_lair_client.lock().await;
    let signed_zome_call = ZomeCall::try_from_unsigned_zome_call(
        &keystore,
        zome_call_unsigned_converted,
    )
    .await
    .map_err(|err| WeError::SignZomeCallError(err.to_string()))?;

    Ok(signed_zome_call)
}
