pub mod error;

use std::collections::BTreeMap;

use hdk::prelude::holo_hash::{AgentPubKeyB64, DnaHashB64, EntryHashB64};
pub use hdk::prelude::*;

enum GameLinkType {
    ExternalAgentToGame = 0,
}

impl From<GameLinkType> for LinkType {
    fn from(hdk_link_type: GameLinkType) -> Self {
        Self(hdk_link_type as u8)
    }
}

entry_defs![PathEntry::entry_def(), Game::entry_def()];

/// A game
#[hdk_entry(id = "game")]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub name: String,
    pub description: String,
    pub logo_src: String,

    pub devhub_webhapp_hash: EntryHashB64,
    pub devhub_gui_hash: EntryHashB64,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub uid: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHashB64>,      // Segmented by RoleId
}

fn get_games_path() -> Path {
    Path::from("games")
}

#[hdk_extern]
fn create_game(input: Game) -> ExternResult<EntryHashB64> {
    let _header_hash = create_entry(&input)?;
    let hash = hash_entry(input.clone())?;

    let path = get_games_path();
    path.ensure()?;
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash.into(),
        hash.clone().into(),
        GameLinkType::ExternalAgentToGame,
        (),
    )?;

    Ok(hash.into())
}

#[hdk_entry(id = "game_gui", visibility = "private")]
pub struct GameGui(SerializedBytes);

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegisterGameInput {
    pub game_agent_pub_key: AgentPubKeyB64,
    pub game: Game,
    pub gui_file: GameGui,
}
#[hdk_extern]
pub fn register_game(input: RegisterGameInput) -> ExternResult<()> {
    create_entry(input.gui_file)?;
    create_entry(&input.game)?;

    let game_hash = hash_entry(input.game)?;

    create_link(
        EntryHash::from(AgentPubKey::from(input.game_agent_pub_key)),
        game_hash.into(),
        HdkLinkType::Any,
        (), // Maybe game hash?
    )?;

    Ok(())
}

#[hdk_extern]
pub fn query_game_gui(gui_hash: EntryHashB64) -> ExternResult<GameGui> {
    let element = get(EntryHash::from(gui_hash), GetOptions::default())?.ok_or(
        WasmError::Guest(String::from("We don't have committed this game gui")),
    )?;

    let game_gui: GameGui = element
        .entry()
        .to_app_option()?
        .ok_or(WasmError::Guest(String::from("Bad game GUI")))?;

    Ok(game_gui)
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingGame {
    game: Game,
    agent_pub_key: AgentPubKeyB64,
}

#[hdk_extern]
pub fn get_games_i_am_playing(_: ()) -> ExternResult<BTreeMap<EntryHashB64, PlayingGame>> {
    let offer_entry_type = EntryType::App(AppEntryType::new(
        entry_def_index!(Game)?,
        zome_info()?.id,
        EntryVisibility::Private,
    ));
    let filter = ChainQueryFilter::new()
        .entry_type(offer_entry_type)
        .include_entries(true);
    let query_result = query(filter)?;

    let games = games_from_elements(query_result)?;

    let filter = ChainQueryFilter::new().header_type(HeaderType::CreateLink);
    let create_links = query(filter)?;

    let mut playing_games: BTreeMap<EntryHashB64, PlayingGame> = BTreeMap::new();

    for element in create_links {
        if let Header::CreateLink(create_link_header) = element.header() {
            if create_link_header.link_type == GameLinkType::ExternalAgentToGame.into() {
                let game_hash =
                    EntryHashB64::from(EntryHash::from(create_link_header.target_address.clone()));
                if let Some(game) = games.get(&game_hash) {
                    playing_games.insert(
                        game_hash,
                        PlayingGame {
                            game: game.clone(),
                            agent_pub_key: AgentPubKeyB64::from(AgentPubKey::from(
                                EntryHash::from(create_link_header.base_address.clone()),
                            )),
                        },
                    );
                }
            }
        }
    }

    Ok(playing_games)
}

#[hdk_extern]
fn get_all_games(_: ()) -> ExternResult<BTreeMap<EntryHashB64, Game>> {
    let path = get_games_path();

    let links = get_links(path.path_entry_hash()?.into(), None)?;

    let get_input = links
        .into_iter()
        .map(|link| GetInput::new(link.target.into(), GetOptions::default()))
        .collect();

    let game_elements = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    games_from_elements(game_elements.into_iter().filter_map(|e| e).collect())
}

fn games_from_elements(games_elements: Vec<Element>) -> ExternResult<BTreeMap<EntryHashB64, Game>> {
    let games: BTreeMap<EntryHashB64, Game> = games_elements
        .into_iter()
        .map(|element| {
            let game: Game = element
                .entry()
                .to_app_option()?
                .ok_or(WasmError::Guest(String::from("There is no game entry")))?;

            Ok((
                EntryHashB64::from(element.header().entry_hash().unwrap().clone()),
                game,
            ))
        })
        .collect::<ExternResult<BTreeMap<EntryHashB64, Game>>>()?;

    Ok(games)
}
