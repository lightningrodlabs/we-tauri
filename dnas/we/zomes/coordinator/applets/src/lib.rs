use std::collections::BTreeMap;

use hdk::prelude::holo_hash::{AgentPubKeyB64, EntryHashB64};
pub use hdk::prelude::*;
use applets_integrity::*;



fn get_applets_path() -> Path {
    Path::from("applets")
}

#[hdk_extern]
fn create_applet(input: RegisterAppletInput) -> ExternResult<EntryHash> {
    let applet_hash = register_applet(input)?;

    let path = get_applets_path()
        .typed(LinkTypes::AppletPath)?;
    path.ensure()?;
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash,
        applet_hash.clone(),
        LinkTypes::AnchorToApplet,
        (),
    )?;

    Ok(applet_hash)
}


#[hdk_extern]
pub fn commit_gui_file(input: AppletGui) -> ExternResult<EntryHashB64> {
    create_entry(EntryTypes::AppletGui(input))?;
    Ok(hash_entry(&input)?.into())
}

#[hdk_extern]
pub fn register_applet(input: RegisterAppletInput) -> ExternResult<EntryHash> {
    create_entry(EntryTypes::Applet(input.applet))?;

    let applet_hash = hash_entry(input.applet)?;

    create_link(
        applet_hash.clone(),
        input.applet_agent_pub_key,
        LinkTypes::AppletToExternalAgent,
        (), // Maybe applet hash?
    )?;

    Ok(applet_hash.into())
}

#[hdk_extern]
pub fn query_applet_gui(gui_hash: EntryHashB64) -> ExternResult<AppletGui> {
    let record = get(EntryHash::from(gui_hash), GetOptions::default())?.ok_or(
        wasm_error!(WasmErrorInner::Guest(String::from("We don't have committed this applet gui"))),
    )?;

    let applet_gui: AppletGui = record
        .entry()
        .to_app_option()
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("Bad applet GUI"))))?;

    Ok(applet_gui)
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingApplet {
    applet: Applet,
    agent_pub_key: AgentPubKeyB64,
}

#[hdk_extern]
pub fn get_applets_i_am_playing(_: ()) -> ExternResult<BTreeMap<EntryHashB64, PlayingApplet>> {
    let offer_entry_type: EntryType = UnitEntryTypes::Applet.try_into()?;

    let filter = ChainQueryFilter::new()
        .entry_type(offer_entry_type)
        .include_entries(true);
    let query_result = query(filter)?;

    let applets = applets_from_records(query_result)?;

    let filter = ChainQueryFilter::new().action_type(ActionType::CreateLink);
    let create_links = query(filter)?;

    let mut playing_applets: BTreeMap<EntryHashB64, PlayingApplet> = BTreeMap::new();

    for record in create_links {
        if let Action::CreateLink(create_link_action) = record.action() {
            if create_link_action.link_type == LinkType::from(LinkTypes::AppletToExternalAgent) {
                let applet_hash =
                    EntryHashB64::from(EntryHash::from(create_link_action.base_address.clone()));
                if let Some(applet) = applets.get(&applet_hash) {
                    playing_applets.insert(
                        applet_hash,
                        PlayingApplet {
                            applet: applet.clone(),
                            agent_pub_key: AgentPubKeyB64::from(AgentPubKey::from(
                                EntryHash::from(create_link_action.target_address.clone()),
                            )),
                        },
                    );
                }
            }
        }
    }

    debug!(">>>>> playing_applets: {:?}", playing_applets);
    Ok(playing_applets)
}

#[hdk_extern]
fn get_all_applets(_: ()) -> ExternResult<BTreeMap<EntryHashB64, Applet>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    let get_input = links
        .into_iter()
        .map(|link| GetInput::new(link.target.into(), GetOptions::default()))
        .collect();

    let applet_records = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    applets_from_records(applet_records.into_iter().filter_map(|e| e).collect())
}

fn applets_from_records(applets_records: Vec<Record>) -> ExternResult<BTreeMap<EntryHashB64, Applet>> {
    let applets: BTreeMap<EntryHashB64, Applet> = applets_records
        .into_iter()
        .map(|record| {
            let applet: Applet = record
                .entry()
                .to_app_option()
                .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?
                .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("There is no applet entry"))))?;

            Ok((
                EntryHashB64::from(record.action().entry_hash().unwrap().clone()),
                applet,
            ))
        })
        .collect::<ExternResult<BTreeMap<EntryHashB64, Applet>>>()?;

    Ok(applets)
}
