use hdi::prelude::{holo_hash::AgentPubKeyB64, *};

use crate::AppletConfigInput;

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct Properties {
    pub sensemaker_config: SensemakerConfig,
    pub applet_configs: Vec<AppletConfigInput>,
}

impl Properties {
    pub fn get() -> ExternResult<Self> {
        let properties = dna_info()?.properties;
        Ok(Properties::try_from(properties).map_err(|err| wasm_error!(err.to_string()))?)
    }
    pub fn is_community_activator(author: AgentPubKey) -> ExternResult<bool> {
        let ca_key = Properties::get()?.sensemaker_config.community_activator;
        Ok(author == ca_key.into())
    }
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct SensemakerConfig {
    pub neighbourhood: String,
    pub community_activator: AgentPubKeyB64,
    pub wizard_version: String,
}
