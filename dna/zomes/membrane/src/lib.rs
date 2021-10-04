pub use hdk::prelude::*;
pub use hdk::prelude::Path;
pub use error::{MembraneError, MembraneResult};
pub mod error;
use holo_hash::{AgentPubKeyB64};
use std::collections::BTreeMap;

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

type Players = BTreeMap<AgentPubKeyB64, BTreeMap<String, String>>;

fn get_who_cell() -> MembraneResult<Option<CellId>> {
    //Ok(CellId::new(agent_info()?.agent_latest_pubkey))
    Ok(None)
}

fn get_who_zome_name() -> ZomeName {
    "hc_zome_membrane".into()
}

#[hdk_extern]
fn get_agent_data(_: AgentPubKey) -> ExternResult<BTreeMap<String, String>> {
    let mut result = BTreeMap::new();
    result.insert("nickname".into(), "zippy".into());
    Ok(result)
}

fn get_players_inner() -> MembraneResult<Players> {
    let path = get_players_path();
    let links = get_links(path.hash()?, None)?.into_inner();
    let mut keys = Vec::with_capacity(links.len());
    for link in links.into_iter().map(|link| link) {
        let key : AgentPubKey = AgentPubKey::from(link.target);
        keys.push(key);
    }

    let mut players = Players::new();
    for key in keys {
        let player : AgentPubKeyB64 = key.clone().into();
        match call::<AgentPubKey>(get_who_cell()?, get_who_zome_name(), "get_agent_data".into(), None, key )? {
            ZomeCallResponse::Ok(x) => {
                players.insert(player, x.decode()?);
            },
            _ => ()
        };
    }
    Ok(players)
}

#[hdk_extern]
fn get_players(_: ()) -> ExternResult<Players> {
    let result = get_players_inner()?;
    Ok(result)
}
