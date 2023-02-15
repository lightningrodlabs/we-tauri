use std::collections::BTreeMap;

pub use hdk::prelude::*;
use applets_integrity::*;
use hdk::prelude::holo_hash::*;


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
        LinkTag::new(String::from("AppletToExternalAgent")), // Maybe applet hash?
    )?;

    Ok(applet_hash.into())
}



#[hdk_extern]
pub fn federate_applet(input: FederateAppletInput) -> ExternResult<ActionHash> {
    create_link(
        input.applet_hash,
        input.we_group_dna_hash.retype(hash_type::Entry),
        LinkTypes::AppletToInvitedGroup,
        LinkTag::new(String::from("AppletToInvitedGroup"))
    )
}


#[hdk_extern]
pub fn get_federated_groups(applet_hash: EntryHash) -> ExternResult<Vec<DnaHash>> {
    let links = get_links(
        applet_hash,
         LinkTypes::AppletToInvitedGroup,
          Some(LinkTag::new("AppletToInvitedGroup"))
    )?;
    Ok(links.iter()
        .map(|link| EntryHash::from(link.target.clone()).retype(hash_type::Dna))
        .collect::<Vec<DnaHash>>()
    )

}



#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingApplet {
    applet: Applet,
    agent_pub_key: AgentPubKey,
}

#[hdk_extern]
pub fn get_applets_i_am_playing(_: ()) -> ExternResult<Vec<(EntryHash, PlayingApplet, Vec<DnaHash>)>> {
    let offer_entry_type: EntryType = UnitEntryTypes::Applet.try_into()?;

    let filter = ChainQueryFilter::new()
        .entry_type(offer_entry_type)
        .include_entries(true);
    let query_result = query(filter)?;

    let applets = applets_from_records(query_result)?;

    let filter = ChainQueryFilter::new().action_type(ActionType::CreateLink);
    let create_links = query(filter)?;

    let mut playing_applets: Vec<(EntryHash, PlayingApplet, Vec<DnaHash>)> = Vec::new();


    // let zid = zome_info()?.id;
    // debug!("%*%*%* ZomeId of get_applets_i_am_playing: {:?}", zid);

    for record in create_links {
        if let Action::CreateLink(create_link_action) = record.action() {
            // The conversion to a ScopedLinkType fails if the zome_id of the CreateLink Action is not the same as
            // the zome_id of this zome.
            // if create_link_action.zome_id != zid {
            //     debug!("%*%*%* wrong zome Id!");
            //     debug!("%*%*%* ZomeId of CreateLink Action: {:?}", create_link_action.zome_id);
            //     debug!("%*%*%* LinkType: {:?}", create_link_action.link_type);
            //     debug!("%*%*%* All LinkTypes: AppletPath (0), AnchorToApplet (1), AppletToExternalAgent (2)");
            //     continue;
            // }
            // let link_type = LinkTypes::try_from(ScopedLinkType {
            //     zome_id: create_link_action.zome_id,
            //     zome_type: create_link_action.link_type,
            // })?;
            // if link_type == LinkTypes::AppletToExternalAgent {

            let link_tag = create_link_action.tag.clone();
            if link_tag == LinkTag::new(String::from("AppletToExternalAgent")) {
                // debug!("%*%*%*%*%* SAME LinkTag !!! :)");
                let applet_hash =
                    EntryHash::from(create_link_action.base_address.clone());
                if let Some(applet) = applets.get(&applet_hash) {
                    // check for federation
                    let federated_groups: Vec<DnaHash> = get_federated_groups(applet_hash.clone())?;

                    playing_applets.push(
                        (applet_hash,
                        PlayingApplet {
                            applet: applet.clone(),
                            agent_pub_key: (AgentPubKey::from(
                                EntryHash::from(create_link_action.target_address.clone()),
                            )),
                        },
                        federated_groups,
                        ),
                    );
                }
            }
        }
    }

    // debug!(">>>>> playing_applets: {:?}", playing_applets);
    Ok(playing_applets)
}

#[hdk_extern]
fn get_all_applets(_: ()) -> ExternResult<Vec<(EntryHash, Applet, Vec<DnaHash>)>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    let get_input = links
        .into_iter()
        .map(|link| GetInput::new(AnyDhtHash::from(EntryHash::from(link.target)), GetOptions::default()))
        .collect();

    let applet_records = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    let applets = applets_from_records(applet_records
            .into_iter()
            .filter_map(|e| e)
            .collect()
        )?
        .into_iter()
        .collect::<Vec<(EntryHash, Applet)>>();

    // get federated groups
    let mut federated_applets: Vec<(EntryHash, Applet, Vec<DnaHash>)> = Vec::new();
    for (entry_hash, applet) in applets {
        let federated_groups: Vec<DnaHash> = get_federated_groups(entry_hash.clone())?;
        federated_applets.push((entry_hash, applet, federated_groups));
    }
    Ok(federated_applets)
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
