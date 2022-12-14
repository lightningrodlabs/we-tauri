use hdk::prelude::*;
use sensemaker_integrity::{LinkTypes, Properties};

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
