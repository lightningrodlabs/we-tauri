use hdk::prelude::*;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::ResourceDef;

#[hdk_extern]
pub fn get_resource_type(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn create_resource_type(resource_type: ResourceDef) -> ExternResult<EntryHash> {
    create_entry(&EntryTypes::ResourceDef(resource_type.clone()))?;
    hash_entry(&EntryTypes::ResourceDef(resource_type.clone()))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateResourceDefInput {
    original_action_hash: ActionHash,
    updated_resource_type: ResourceDef,
}

#[hdk_extern]
pub fn update_resource_type(input: UpdateResourceDefInput) -> ExternResult<ActionHash> {
    update_entry(input.original_action_hash, &input.updated_resource_type)
}

#[hdk_extern]
pub fn delete_resource_type(action_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(action_hash)
}
