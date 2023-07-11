use group_integrity::*;
use hdk::prelude::*;

fn get_applets_path() -> Path {
    Path::from("applets")
}

#[hdk_extern]
fn hash_applet(applet: Applet) -> ExternResult<EntryHash> {
   hash_entry(&applet)   
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
fn unregister_applet(applet_hash: EntryHash) -> ExternResult<()> {
    let details = get_details(applet_hash.clone(), GetOptions::default())?;

    let entry_details = match details {
        Some(Details::Entry(d)) => Ok(d),
        _ => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details result".to_string()
        ))),
    }?;

    for a in entry_details.actions {
        delete_entry(a.action_address().clone())?;
    }

    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    for link in links {
        if EntryHash::from(link.target).eq(&applet_hash) {
            delete_link(link.create_link_hash)?;
        }
    }

    Ok(())
}

#[hdk_extern]
fn get_applet(applet_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(applet_hash, GetOptions::default())
}

#[hdk_extern]
fn get_applets(_: ()) -> ExternResult<Vec<EntryHash>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::AnchorToApplet, None)?;

    let entry_hashes = links
        .into_iter()
        .map(|link| EntryHash::from(link.target))
        .collect();

    Ok(entry_hashes)
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
