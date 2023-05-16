use hdk::prelude::*;
use sensemaker_integrity::LinkTypes;

const ALL_AGENTS_PATH: &str = "all_agents";

pub fn all_agents_typed_path() -> ExternResult<TypedPath> {
    Ok(Path::from(format!("{}", ALL_AGENTS_PATH)).typed(LinkTypes::AllAgentsPath)?)
}

#[hdk_extern]
pub fn get_all_agents(_: ()) -> ExternResult<Vec<AgentPubKey>> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;
    let all_agents_path = all_agents_typed_path()?;
    let all_agents_links = get_links(
        all_agents_path.path_entry_hash()?, 
        LinkTypes::AllAgentsPath,
        None,
    )?;
    let all_agents: Vec<AgentPubKey> = all_agents_links
        .into_iter()
        .map(|link| EntryHash::from(link.target).into())
        .collect();
    let all_other_agents = all_agents
        .iter()
        .filter(|agent| agent.clone() != &my_pub_key)
        .cloned()
        .collect();
    Ok(all_other_agents)
}