use crate::{create_entries_from_applet_config, agent::all_agents_typed_path};
use hdk::prelude::*;
use sensemaker_integrity::{EntryTypes, LinkTypes, Properties};

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    // register agent in NH
    // create a link from all agents path to my pub key
    create_link(
        all_agents_typed_path()?.path_entry_hash()?,
        agent_info()?.agent_latest_pubkey,
        LinkTypes::AllAgentsPath,
        (),
    )?;

    // set up capability grants to allow for remote signals    
    let mut functions = BTreeSet::new();
    functions.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("new primitives signals"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        GrantedFunctions::Listed(functions),
    );

    create_cap_grant(cap_grant_entry)?;

    // check if CA and if true, create config entry and link it from the CA
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
        create_entries_from_applet_config(config)?;
    }
    return Ok(InitCallbackResult::Pass);
}