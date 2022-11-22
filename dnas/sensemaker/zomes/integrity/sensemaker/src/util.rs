use hdi::prelude::{holo_hash::AgentPubKeyB64, *};

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct Properties {
    pub community_activator: AgentPubKeyB64,
}

impl Properties {
    pub fn get() -> ExternResult<Self> {
        let properties = dna_info()?.properties;
        debug!("properties, {:?}", properties);
        Ok(Properties::try_from(properties).map_err(|err| wasm_error!(err.to_string()))?)
    }
}

pub fn is_community_activator(author: AgentPubKey) -> ExternResult<bool> {
    let ca_key = Properties::get()?.community_activator;
    Ok(author == ca_key.into())
}
