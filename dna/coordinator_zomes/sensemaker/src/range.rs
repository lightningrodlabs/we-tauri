use hdk::prelude::*;
use sensemaker_integrity::Range;
use sensemaker_integrity::EntryTypes;

#[hdk_extern]
pub fn get_range(action_hash: ActionHash) -> ExternResult<Option<Record>> {
  get(action_hash, GetOptions::default())
}


#[hdk_extern]
pub fn create_range(range: Range) -> ExternResult<ActionHash> {
  create_entry(&EntryTypes::Range(range.clone()))
}


#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateRangeInput {
  original_action_hash: ActionHash,
  updated_range: Range
}

#[hdk_extern]
pub fn update_range(input: UpdateRangeInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_range)
}


#[hdk_extern]
pub fn delete_range(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

