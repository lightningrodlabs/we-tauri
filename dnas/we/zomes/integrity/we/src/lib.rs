pub use hdi::prelude::*;


#[derive(Clone, Serialize, Deserialize, Debug, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct WeInfo {
    logo_src: String,
    name: String,
    network_seed: String,
}


#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
  Ok(ValidateCallbackResult::Valid)
}
