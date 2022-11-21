use hdi::prelude::*;

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct DnaProperties {
  pub community_activator: AgentPubKey,
}

impl DnaProperties {
    pub fn get() -> ExternResult<Self> {
        if let Ok(prop) = zome_info()?.properties.try_into() {
            Ok(prop)
        } else {
            error(String::from("dna property deserialization failed"))
        }
    }
}

pub fn is_community_activator(author: AgentPubKey) -> ExternResult<bool> {
    let ca_key = DnaProperties::get()?.community_activator;
    Ok(author == ca_key)
  }

pub fn error<T>(reason: String) -> ExternResult<T> {
    Err(wasm_error!(WasmErrorInner::Guest(reason)))
}
