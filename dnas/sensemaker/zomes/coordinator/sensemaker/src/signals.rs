use hdk::prelude::*;
use sensemaker_integrity::Assessment;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    NewAssessment {
        assessment: Assessment,
    },
}

#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let sig: Signal = signal
        .decode()
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?;
    Ok(emit_signal(&sig)?)
}