use crate::utils::create_entries_from_config;
use hdk::prelude::*;
use sensemaker_integrity::Properties;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let prop = Properties::get()?;
    let my_key = agent_info()?.agent_latest_pubkey;
    if let false = Properties::is_community_activator(my_key.clone())? {
        return Ok(InitCallbackResult::Pass);
    }
    if let Some(config) = prop.config {
        // check the format of the config passed from Wizard
        config.clone().check_format()?;
        create_entries_from_config(config, my_key)?;
    } else {
        return Ok(InitCallbackResult::Pass);
    }
    return Ok(InitCallbackResult::Pass);
}
