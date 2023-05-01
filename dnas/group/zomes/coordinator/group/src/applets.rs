use group_integrity::*;
use hdk::prelude::*;

fn get_applets_path() -> Path {
    Path::from("applets")
}

#[hdk_extern]
fn register_applet(applet: Applet) -> ExternResult<EntryHash> {
    let applet_hash = hash_entry(&applet)?;

    create_entry(EntryTypes::Applet(applet))?;

    let path = get_applets_path().typed(LinkTypes::AppletPath)?;
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
fn get_applet(applet_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(applet_hash, GetOptions::default())
}

#[hdk_extern]
fn get_applets(_: ()) -> ExternResult<Vec<Record>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    let get_input = links
        .into_iter()
        .map(|link| {
            GetInput::new(
                AnyDhtHash::from(EntryHash::from(link.target)),
                GetOptions::default(),
            )
        })
        .collect();

    let applet_records = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    Ok(applet_records.into_iter().filter_map(|r| r).collect())
}

#[hdk_extern]
pub fn federate_applet(input: FederateAppletInput) -> ExternResult<ActionHash> {
    create_link(
        input.applet_hash,
        input.group_dna_hash.retype(holo_hash::hash_type::Entry),
        LinkTypes::AppletToInvitedGroup,
        (),
    )
}

#[hdk_extern]
pub fn get_federated_groups(applet_hash: EntryHash) -> ExternResult<Vec<holo_hash::DnaHash>> {
    let links = get_links(applet_hash, LinkTypes::AppletToInvitedGroup, None)?;
    Ok(links
        .iter()
        .map(|link| EntryHash::from(link.target.clone()).retype(holo_hash::hash_type::Dna))
        .collect::<Vec<holo_hash::DnaHash>>())
}
