use hdk::prelude::*;
use sensemaker_integrity::Method;
use sensemaker_integrity::EntryTypes;

#[hdk_extern]
pub fn get_method(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
  get(entry_hash, GetOptions::default())
}


#[hdk_extern]
pub fn create_method(method: Method) -> ExternResult<EntryHash> {
  create_entry(&EntryTypes::Method(method.clone()))?;
  hash_entry(&EntryTypes::Method(method.clone()))
}


#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateMethodInput {
  original_action_hash: ActionHash,
  updated_method: Method
}

#[hdk_extern]
pub fn update_method(input: UpdateMethodInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_method)
}


#[hdk_extern]
pub fn delete_method(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

