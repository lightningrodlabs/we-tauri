pub use hdk::prelude::*;
pub use hdk::prelude::Path;
pub use error::{MembraneError, MembraneResult};
pub mod error;
use holo_hash::{AgentPubKeyB64};

fn get_players_path() -> Path {
    Path::from("players")
}

#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let path = get_players_path();
    path.ensure()?;
    let anchor_hash = path.hash()?;
    create_link(anchor_hash.clone(), EntryHash::from(agent_info()?.agent_latest_pubkey) , ())?;

    Ok(InitCallbackResult::Pass)
}

entry_defs![
    Path::entry_def()
];

fn get_wheres_inner() -> MembraneResult<Vec<AgentPubKeyB64>> {
    let path = get_players_path();
    let links = get_links(path.hash()?, None)?.into_inner();
    let mut output = Vec::with_capacity(links.len());
    for link in links.into_iter().map(|link| link) {
        let key : AgentPubKey = AgentPubKey::from(link.target);
        let player : AgentPubKeyB64 = key.into();
        output.push(player);
    }
    Ok(output)
}

#[hdk_extern]
fn get_players(_: ()) -> ExternResult<Vec<AgentPubKeyB64>> {
    let result = get_wheres_inner()?;
    Ok(result)
}
