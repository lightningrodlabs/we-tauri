pub use hdi::prelude::*;


#[derive(Clone, Serialize, Deserialize, Debug, SerializedBytes)]
pub struct WeInfo {
    logo_src: String,
    name: String,
    timestamp: u64,
}


#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}
