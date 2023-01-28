use crate::create_entries_from_applet_config;
use hdk::prelude::*;
use sensemaker_integrity::{EntryTypes, LinkTypes, Properties};

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let prop = Properties::get()?;
    let my_key = agent_info()?.agent_latest_pubkey;
    if let false = Properties::is_community_activator(my_key.clone())? {
        return Ok(InitCallbackResult::Pass);
    }

    // create the sensemaker entry from the prop and link it from the community activator
    let sensemaker_eh = hash_entry(prop.sensemaker_config.clone())?;
    create_entry(&EntryTypes::SensemakerConfig(prop.sensemaker_config))?;
    create_link(
        my_key.clone(),
        sensemaker_eh.clone(),
        LinkTypes::CAToSensemakerConfig,
        LinkTag::new("sensemaker"),
    )?;

    // for each config, check the format and creat the config entries with the helper function
    for config in prop.applet_configs {
        config.clone().check_format()?;
        create_entries_from_applet_config(config, None)?;
    }
    return Ok(InitCallbackResult::Pass);
}
