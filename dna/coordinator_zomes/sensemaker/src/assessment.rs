use hdk::prelude::*;
use holo_hash::EntryHashB64;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;

#[hdk_extern]
pub fn get_assessment(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn create_assessment(assessment: Assessment) -> ExternResult<EntryHash> {
    create_entry(&EntryTypes::Assessment(assessment.clone()))?;
    let assessment_eh = hash_entry(&EntryTypes::Assessment(assessment.clone()))?;
    create_link(
        assessment_typed_path(assessment.subject_eh, assessment.dimension_eh)?.path_entry_hash()?,
        assessment_eh.clone(),
        LinkTypes::Assessment,
        (),
    )?;
    Ok(assessment_eh)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateAssessmentInput {
    original_action_hash: ActionHash,
    updated_assessment: Assessment,
}

#[hdk_extern]
pub fn update_assessment(input: UpdateAssessmentInput) -> ExternResult<ActionHash> {
    update_entry(input.original_action_hash, &input.updated_assessment)
}

#[hdk_extern]
pub fn delete_assessment(action_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(action_hash)
}

pub fn assessment_typed_path(
    resource_eh: EntryHash,
    dimension_eh: EntryHash,
) -> ExternResult<TypedPath> {
    let resource_eh_string = EntryHashB64::from(resource_eh).to_string();
    let dimension_eh_string = EntryHashB64::from(dimension_eh).to_string();
    Ok(Path::from(format!(
        "all_assessed_resources.{}.{}",
        resource_eh_string, dimension_eh_string
    ))
    .typed(LinkTypes::Assessment)?)
}
