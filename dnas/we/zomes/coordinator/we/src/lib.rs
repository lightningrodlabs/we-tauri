pub mod error;

pub use error::{WeError, WeResult};
use hdk::prelude::*;
use we_integrity::WeInfo;


#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
    // grant unrestricted access to accept_cap_claim so other agents can send us claims
    let mut functions = BTreeSet::new();
    functions.insert((zome_info()?.name, "recv_remote_signal".into()));
    create_cap_grant(CapGrantEntry {
        tag: "".into(),
        // empty access converts to unrestricted
        access: ().into(),
        functions: GrantedFunctions::Listed(functions),
    })?;
    Ok(InitCallbackResult::Pass)
}


#[hdk_extern]
fn get_info(_: ()) -> ExternResult<WeInfo> {
    let dna_info = dna_info()?;
    debug!("dna_info: {:?}", dna_info);
    let properties = WeInfo::try_from(dna_info.properties)
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?;
    Ok(properties)
}
/*
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type", content = "content")]
pub enum Message {
    NewApplet(Applet),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignalPayload {
    applet_hash: EntryHashB64,
    message: Message,
    federated_groups: Vec<DnaHash>,
}

impl SignalPayload {
    fn new(applet_hash: EntryHashB64, message: Message, federated_groups: Vec<DnaHash>) -> Self {
        SignalPayload { applet_hash, message, federated_groups }
    }
}

#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let sig: SignalPayload = signal.decode()?;
    debug!("Received signal {:?}", sig);
    Ok(emit_signal(&sig)?)
}

/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotifyInput {
    pub folks: Vec<AgentPubKeyB64>,
    pub signal: SignalPayload,
}

#[hdk_extern]
fn notify(input: NotifyInput) -> ExternResult<()> {
    let mut folks: Vec<AgentPubKey> = vec![];
    for a in input.folks.clone() {
        folks.push(a.into())
    }
    debug!("Sending signal {:?} to {:?}", input.signal, input.folks);
    remote_signal(ExternIO::encode(input.signal)?, folks)?;
    Ok(())
}
 */