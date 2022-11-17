use hdk::prelude::*;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::EntryTypes;

#[hdk_extern]
pub fn get_assessment(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
  get(entry_hash, GetOptions::default())
}


#[hdk_extern]
pub fn create_assessment(assessment: Assessment) -> ExternResult<EntryHash> {
  create_entry(&EntryTypes::Assessment(assessment.clone()))?;
  hash_entry(&EntryTypes::Assessment(assessment.clone()))
}


#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateAssessmentInput {
  original_action_hash: ActionHash,
  updated_assessment: Assessment
}

#[hdk_extern]
pub fn update_assessment(input: UpdateAssessmentInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_assessment)
}


#[hdk_extern]
pub fn delete_assessment(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

