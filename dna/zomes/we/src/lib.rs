pub use hdk::prelude::*;
pub use hdk::prelude::Path;
pub use error::{WeError, WeResult};
pub mod error;
use hc_utils::*;
use std::collections::HashMap;
use holo_hash::{AgentPubKeyB64, EntryHashB64, DnaHashB64};

#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
    // grant unrestricted access to accept_cap_claim so other agents can send us claims
    let mut functions = BTreeSet::new();
    functions.insert((zome_info()?.zome_name, "recv_remote_signal".into()));
    create_cap_grant(CapGrantEntry {
        tag: "".into(),
        // empty access converts to unrestricted
        access: ().into(),
        functions,
    })?;
    Ok(InitCallbackResult::Pass)
}

entry_defs![
    Path::entry_def(),
    Game::entry_def()
];

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GameOutput {
    hash: EntryHashB64,
    content: Game,
}

/// A game
#[hdk_entry(id = "game")]
#[derive(Clone)]
pub struct Game {
    pub name: String,
    dna_hash: DnaHashB64,
    ui_url: String,
    logo_url: String,
    pub meta: HashMap<String, String>,  // usable by the UI for whatever
}

fn get_games_path() -> Path {
    Path::from("games")
}

#[hdk_extern]
fn create_game(input: Game) -> ExternResult<EntryHashB64> {
    let _header_hash = create_entry(&input)?;
    let hash = hash_entry(input.clone())?;
    emit_signal(&SignalPayload::new(hash.clone().into(), Message::NewGame(input)))?;
    let path = get_games_path();
    path.ensure()?;
    let anchor_hash = path.hash()?;
    create_link(anchor_hash, hash.clone(), ())?;
    Ok(hash.into())
}

#[hdk_extern]
fn get_games(_: ()) -> ExternResult<Vec<GameOutput>> {
    let path = get_games_path();
    let games = get_games_inner(path.hash()?)?;
    Ok(games)
}

fn get_games_inner(base: EntryHash) -> WeResult<Vec<GameOutput>> {
    let entries = get_links_and_load_type(base, None)?;
    let mut games = vec![];
    for e in entries {
        games.push(GameOutput {hash: hash_entry(&e)?.into(), content: e});
    }
    Ok(games)
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
    #[serde(tag = "type", content = "content")]
pub enum Message {
    NewGame(Game),
}

#[derive(Serialize, Deserialize, Debug)]
    #[serde(rename_all = "camelCase")]
pub struct SignalPayload {
    game_hash: EntryHashB64,
    message: Message,
}

impl SignalPayload {
    fn new(game_hash: EntryHashB64, message: Message) -> Self {
        SignalPayload {
            game_hash,
            message,
        }
    }
}

#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let sig: SignalPayload = signal.decode()?;
    debug!("Received signal {:?}", sig);
    Ok(emit_signal(&sig)?)
}

/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotifyInput {
    pub folks: Vec<AgentPubKeyB64>,
    pub signal: SignalPayload,
}


#[hdk_extern]
fn notify(input: NotifyInput) -> ExternResult<()> {
    let mut folks : Vec<AgentPubKey> = vec![];
    for a in input.folks.clone() {
        folks.push(a.into())
    }
    debug!("Sending signal {:?} to {:?}", input.signal, input.folks);
    remote_signal(ExternIO::encode(input.signal)?,folks)?;
    Ok(())
}
