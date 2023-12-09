//! ## hc_zome_membrane_invitations

use std::collections::BTreeMap;
use std::sync::Arc;

use hdk::prelude::holo_hash::*;
use hdk::prelude::*;

use membrane_invitations_integrity::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let mut functions = BTreeSet::new();
    functions.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("ping pong signals"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        GrantedFunctions::Listed(functions),
    );

    create_cap_grant(cap_grant_entry)?;
    Ok(InitCallbackResult::Pass)
}

#[hdk_extern]
pub fn create_clone_dna_recipe(clone_dna_recipe: CloneDnaRecipe) -> ExternResult<EntryHash> {
    let hash = hash_entry(&clone_dna_recipe)?;

    create_entry(EntryTypes::CloneDnaRecipe(clone_dna_recipe.clone()))?;

    create_link(
        dnahash_to_linkable(clone_dna_recipe.original_dna_hash),
        hash.clone(),
        LinkTypes::DnaHashToRecipe,
        (),
    )?;

    Ok(hash)
}

#[hdk_extern]
pub fn get_clone_recipes_for_dna(original_dna_hash: DnaHash) -> ExternResult<Vec<Record>> {
    let links = get_links(
        dnahash_to_linkable(original_dna_hash),
        LinkTypes::DnaHashToRecipe,
        None,
    )?;
    let get_inputs = links
        .iter()
        .filter_map(|link| link.target.to_owned().into_any_dht_hash())
        .map(|entry_hash| GetInput::new(entry_hash, GetOptions::default()))
        .collect();

    let records = HDK.with(|hdk| hdk.borrow().get(get_inputs))?;

    let clones = records.into_iter().filter_map(|r| r).collect();

    Ok(clones)
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    NewInvitation {
        invitation_action_hash: ActionHash,
        invitation: JoinMembraneInvitation,
    },
    LinkCreated {
        action: SignedActionHashed,
        link_type: LinkTypes,
    },
    LinkDeleted {
        action: SignedActionHashed,
        link_type: LinkTypes,
    },
    EntryCreated {
        action: SignedActionHashed,
        app_entry: EntryTypes,
    },
    EntryUpdated {
        action: SignedActionHashed,
        app_entry: EntryTypes,
        original_app_entry: EntryTypes,
    },
    EntryDeleted {
        action: SignedActionHashed,
        original_app_entry: EntryTypes,
    },
}

#[hdk_extern]
pub fn invite_to_join_membrane(input: InviteToJoinMembraneInput) -> ExternResult<ActionHash> {
    let tag: LinkTag = match input.membrane_proof.clone() {
        None => LinkTag::new(vec![]),
        Some(mp) => LinkTag::new(mp.bytes().clone()),
    };

    let clone_dna_recipe_hash = hash_entry(&input.clone_dna_recipe)?;

    let invitee_pub_key = input.invitee;

    // create link from invitee to the clone dna recipe
    let action_hash = create_link(
        invitee_pub_key.clone(),
        EntryHash::from(clone_dna_recipe_hash),
        LinkTypes::InviteeToRecipe,
        tag,
    )?;

    let invitation = JoinMembraneInvitation {
        invitee: invitee_pub_key.clone().into(),
        clone_dna_recipe: input.clone_dna_recipe,
        inviter: agent_info()?.agent_initial_pubkey,
        membrane_proof: input.membrane_proof,
        timestamp: sys_time()?,
    };

    let signal = Signal::NewInvitation {
        invitation,
        invitation_action_hash: action_hash.clone(),
    };

    let encoded_signal =
        ExternIO::encode(signal).map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?;

    remote_signal(encoded_signal, vec![invitee_pub_key])?;

    Ok(action_hash)
}

#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let sig: Signal = signal
        .decode()
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?;
    Ok(emit_signal(&sig)?)
}

#[hdk_extern]
pub fn get_my_invitations(_: ()) -> ExternResult<Vec<(ActionHash, JoinMembraneInvitation)>> {
    let agent_info = agent_info()?;

    let links = get_links(
        agent_info.agent_initial_pubkey.clone(),
        LinkTypes::InviteeToRecipe,
        None,
    )?;

    let recipes = get_clone_dna_recipes(&links)?;

    let mut my_invitations: Vec<(ActionHash, JoinMembraneInvitation)> = Vec::new();

    for link in links {
        if let Some(recipe) = recipes.get(
            &EntryHash::try_from(link.target)
                .map_err(|err| wasm_error!(WasmErrorInner::from(err)))?,
        ) {
            let membrane_proof = match link.tag.0.len() > 0 {
                true => Some(Arc::new(SerializedBytes::from(UnsafeBytes::from(
                    link.tag.0,
                )))),
                false => None,
            };

            // Remove this get when the link struct includes author
            if let Some(record) = get(link.create_link_hash.clone(), GetOptions::default())? {
                let invitation = JoinMembraneInvitation {
                    clone_dna_recipe: recipe.clone(),
                    inviter: record.action().author().clone(),
                    invitee: agent_info.agent_initial_pubkey.clone(),
                    membrane_proof,
                    timestamp: link.timestamp,
                };
                my_invitations.push((link.create_link_hash, invitation));
            }
        }
    }

    Ok(my_invitations)
}

fn get_clone_dna_recipes(links: &Vec<Link>) -> ExternResult<BTreeMap<EntryHash, CloneDnaRecipe>> {
    let get_inputs = links
        .iter()
        .filter_map(|link| link.target.to_owned().into_any_dht_hash())
        .map(|entry_hash| GetInput::new(entry_hash, GetOptions::default()))
        .collect();

    let records = HDK.with(|hdk| hdk.borrow().get(get_inputs))?;

    let clones: BTreeMap<EntryHash, CloneDnaRecipe> = records
        .into_iter()
        .filter_map(|r| r)
        .filter_map(|record| {
            let recipe: Option<CloneDnaRecipe> = record.entry().to_app_option().unwrap_or(None);
            recipe.map(|r| (record.action().entry_hash().unwrap().clone(), r))
        })
        .collect();

    Ok(clones)
}

#[hdk_extern]
pub fn remove_invitation(invitation_link_hash: ActionHash) -> ExternResult<()> {
    delete_link(invitation_link_hash.into())?;
    Ok(())
}
#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
    for action in committed_actions {
        if let Err(err) = signal_action(action) {
            error!("Error signaling new action: {:?}", err);
        }
    }
}
fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
    match action.hashed.content.clone() {
        Action::CreateLink(create_link) => {
            if let Ok(Some(link_type)) =
                LinkTypes::from_type(create_link.zome_index, create_link.link_type)
            {
                emit_signal(Signal::LinkCreated { action, link_type })?;
            }
            Ok(())
        }
        Action::DeleteLink(delete_link) => {
            let record = get(delete_link.link_add_address.clone(), GetOptions::default())?.ok_or(
                wasm_error!(WasmErrorInner::Guest(
                    "Failed to fetch CreateLink action".to_string()
                )),
            )?;
            match record.action() {
                Action::CreateLink(create_link) => {
                    if let Ok(Some(link_type)) =
                        LinkTypes::from_type(create_link.zome_index, create_link.link_type)
                    {
                        emit_signal(Signal::LinkDeleted { action, link_type })?;
                    }
                    Ok(())
                }
                _ => {
                    return Err(wasm_error!(WasmErrorInner::Guest(
                        "Create Link should exist".to_string()
                    )));
                }
            }
        }
        Action::Create(_create) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                emit_signal(Signal::EntryCreated { action, app_entry })?;
            }
            Ok(())
        }
        Action::Update(update) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                if let Ok(Some(original_app_entry)) =
                    get_entry_for_action(&update.original_action_address)
                {
                    emit_signal(Signal::EntryUpdated {
                        action,
                        app_entry,
                        original_app_entry,
                    })?;
                }
            }
            Ok(())
        }
        Action::Delete(delete) => {
            if let Ok(Some(original_app_entry)) = get_entry_for_action(&delete.deletes_address) {
                emit_signal(Signal::EntryDeleted {
                    action,
                    original_app_entry,
                })?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}
fn get_entry_for_action(action_hash: &ActionHash) -> ExternResult<Option<EntryTypes>> {
    let record = match get_details(action_hash.clone(), GetOptions::default())? {
        Some(Details::Record(record_details)) => record_details.record,
        _ => {
            return Ok(None);
        }
    };
    let entry = match record.entry().as_option() {
        Some(entry) => entry,
        None => {
            return Ok(None);
        }
    };
    let (zome_index, entry_index) = match record.action().entry_type() {
        Some(EntryType::App(AppEntryDef {
            zome_index,
            entry_index,
            ..
        })) => (zome_index, entry_index),
        _ => {
            return Ok(None);
        }
    };
    Ok(EntryTypes::deserialize_from_type(
        zome_index.clone(),
        entry_index.clone(),
        entry,
    )?)
}
