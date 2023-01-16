use hdk::prelude::*;
use sensemaker_integrity::{LinkTypes, Properties, RawSensemakerConfig};

use crate::utils::create_entries_from_config;

#[hdk_extern]
pub fn get_configs(_: ()) -> ExternResult<Vec<Option<Record>>> {
    let ca_key: AgentPubKey = Properties::get()?.community_activator.into();

    get_links(ca_key, LinkTypes::CAToSensemakerConfig, None)?
        .into_iter()
        .map(|link| {
            let config_eh: EntryHash = link.target.into();
            get(config_eh, GetOptions::default())
        })
        .collect::<ExternResult<Vec<Option<Record>>>>()
}

#[hdk_extern]
pub fn add_config(config: RawSensemakerConfig) -> ExternResult<EntryHash> {
    // check the format of the config passed from Wizard
    config.clone().check_format()?;
    let my_key = agent_info()?.agent_latest_pubkey;
    if let false = Properties::is_community_activator(my_key.clone())? {
        return Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "only the community activator can create new configurations"
        ))));
    }
    let config_eh = create_entries_from_config(config, my_key)?;
    Ok(config_eh)
}
