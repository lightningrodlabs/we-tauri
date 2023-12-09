use hdk::prelude::*;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;
use sensemaker_integrity::ResourceDef;

#[hdk_extern]
pub fn get_resource_def(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
fn get_resource_defs(_: ()) -> ExternResult<Vec<Record>> {
    let links = get_links(
        resource_defs_typed_path()?.path_entry_hash()?,
        LinkTypes::ResourceDefs,
        None,
    )?;
    match links.last() {
        Some(_link) => {
            let collected_get_results: ExternResult<Vec<Option<Record>>> = links
                .into_iter()
                .map(|link| {
                    let entry_hash = link.target.into_entry_hash().ok_or_else(|| {
                        wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target")))
                    })?;

                    get_resource_def(entry_hash)
                })
                .collect();

            // Handle the Result and then filter_map to remove None values
            collected_get_results.map(|maybe_records| {
                maybe_records
                    .into_iter()
                    .filter_map(|maybe_record| maybe_record)
                    .collect::<Vec<Record>>()
            })
        }
        None => Ok(vec![]),
    }
}

#[hdk_extern]
pub fn create_resource_def(resource_def: ResourceDef) -> ExternResult<Record> {
    let entry = EntryTypes::ResourceDef(resource_def.clone());
    let action_hash = create_entry(&entry)?;
    let resource_def_eh = hash_entry(&entry)?;
    
    let record = get(action_hash.clone(), GetOptions::default())?;

    if let Some(record) = record {
        create_link(
            resource_defs_typed_path()?.path_entry_hash()?,
            resource_def_eh.clone(),
            LinkTypes::ResourceDefs,
            (),
        )?;
        Ok(record)
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to get resource def record after create"
        ))))
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateResourceDefInput {
    original_action_hash: ActionHash,
    updated_resource_def: ResourceDef,
}

#[hdk_extern]
pub fn update_resource_def(input: UpdateResourceDefInput) -> ExternResult<ActionHash> {
    update_entry(input.original_action_hash, &input.updated_resource_def)
}

#[hdk_extern]
pub fn delete_resource_def(action_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(action_hash)
}

pub fn resource_defs_typed_path() -> ExternResult<TypedPath> {
    // TODO: break up path to prevent hotspots
    Path::from("resource_defs").typed(LinkTypes::ResourceDefs)
}
