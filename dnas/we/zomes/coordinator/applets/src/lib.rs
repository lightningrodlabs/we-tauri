use std::collections::BTreeMap;

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
pub fn register_applet(input: RegisterAppletInput) -> ExternResult<EntryHash> {
    create_entry(EntryTypes::Applet(input.applet.clone()))?;

    let applet_hash = hash_entry(input.applet)?;

    create_link(
        applet_hash.clone(),
        input.applet_agent_pub_key,
        LinkTypes::AppletToExternalAgent,
        (), // Maybe applet hash?
    )?;

    Ok(applet_hash.into())
}



#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingApplet {
    applet: Applet,
    agent_pub_key: AgentPubKey,
}

#[hdk_extern]
pub fn get_applets_i_am_playing(_: ()) -> ExternResult<Vec<(EntryHash, PlayingApplet)>> {
    let offer_entry_type: EntryType = UnitEntryTypes::Applet.try_into()?;

    let filter = ChainQueryFilter::new()
        .entry_type(offer_entry_type)
        .include_entries(true);
    let query_result = query(filter)?;

    let applets = applets_from_records(query_result)?;

    let filter = ChainQueryFilter::new().action_type(ActionType::CreateLink);
    let create_links = query(filter)?;

    let mut playing_applets: Vec<(EntryHash, PlayingApplet)> = Vec::new();



    for record in create_links {
        if let Action::CreateLink(create_link_action) = record.action() {
            let link_type = LinkTypes::try_from(ScopedLinkType {
                zome_id: create_link_action.zome_id,
                zome_type: create_link_action.link_type,
            })?;
            if link_type == LinkTypes::AppletToExternalAgent {
                let applet_hash =
                    EntryHash::from(create_link_action.base_address.clone());
                if let Some(applet) = applets.get(&applet_hash) {
                    playing_applets.push(
                        (applet_hash,
                        PlayingApplet {
                            applet: applet.clone(),
                            agent_pub_key: (AgentPubKey::from(
                                EntryHash::from(create_link_action.target_address.clone()),
                            )),
                        }
                        ),
                    );
                }
            }
        }
    }

    debug!(">>>>> playing_applets: {:?}", playing_applets);
    Ok(playing_applets)
}

#[hdk_extern]
fn get_all_applets(_: ()) -> ExternResult<Vec<(EntryHash, Applet)>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    let get_input = links
        .into_iter()
        .map(|link| GetInput::new(link.target.into(), GetOptions::default()))
        .collect();

    let applet_records = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    Ok(
        applets_from_records(applet_records
            .into_iter()
            .filter_map(|e| e)
            .collect()
        )?
        .into_iter()
        .collect::<Vec<(EntryHash, Applet)>>()
    )
}

fn applets_from_records(applets_records: Vec<Record>) -> ExternResult<BTreeMap<EntryHash, Applet>> {
    let applets: BTreeMap<EntryHash, Applet> = applets_records
        .into_iter()
        .map(|record| {
            let applet: Applet = record
                .entry()
                .to_app_option()
                .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?
                .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("There is no applet entry"))))?;

            Ok((
                record.action().entry_hash().unwrap().clone(),
                applet,
            ))
        })
        .collect::<ExternResult<BTreeMap<EntryHash, Applet>>>()?;

    Ok(applets)
}