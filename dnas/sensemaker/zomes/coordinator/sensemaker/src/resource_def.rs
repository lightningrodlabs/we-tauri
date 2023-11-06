use hdk::prelude::*;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::ResourceDef;

#[hdk_extern]
pub fn get_resource_def(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn create_resource_def(resource_def: ResourceDef) -> ExternResult<Record> {
    let action_hash = create_entry(&EntryTypes::ResourceDef(resource_def.clone()))?;
    let record = get(action_hash.clone(), GetOptions::default())?;
    if let Some(record) = record {
        Ok(record)
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to get method record after create"
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
