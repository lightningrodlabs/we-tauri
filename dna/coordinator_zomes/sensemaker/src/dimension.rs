use hdk::prelude::*;
use sensemaker_integrity::Dimension;
use sensemaker_integrity::EntryTypes;

#[hdk_extern]
pub fn get_dimension(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
  get(entry_hash, GetOptions::default())
}


#[hdk_extern]
pub fn create_dimension(dimension: Dimension) -> ExternResult<EntryHash> {
  create_entry(&EntryTypes::Dimension(dimension.clone()))?;
  hash_entry(&EntryTypes::Dimension(dimension.clone()))
}


#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateDimensionInput {
  original_action_hash: ActionHash,
  updated_dimension: Dimension
}

#[hdk_extern]
pub fn update_dimension(input: UpdateDimensionInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_dimension)
}


#[hdk_extern]
pub fn delete_dimension(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

