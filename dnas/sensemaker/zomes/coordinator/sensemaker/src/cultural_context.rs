use hdk::prelude::*;
use sensemaker_integrity::CulturalContext;
use sensemaker_integrity::EntryTypes;

#[hdk_extern]
pub fn get_cultural_context(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
  get(entry_hash, GetOptions::default())
}


#[hdk_extern]
pub fn create_cultural_context(cultural_context: CulturalContext) -> ExternResult<EntryHash> {
  create_entry(&EntryTypes::CulturalContext(cultural_context.clone()))?;
  hash_entry(&EntryTypes::CulturalContext(cultural_context.clone()))
}


#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCulturalContextInput {
  original_action_hash: ActionHash,
  updated_cultural_context: CulturalContext
}

#[hdk_extern]
pub fn update_cultural_context(input: UpdateCulturalContextInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_cultural_context)
}


#[hdk_extern]
pub fn delete_cultural_context(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

