use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;
use sensemaker_integrity::Method;
use sensemaker_integrity::Program;
use sensemaker_integrity::RangeValue;

use crate::assessment_typed_path;
use crate::create_assessment;
use crate::get_assessment;
use crate::utils::entry_from_record;

#[hdk_extern]
pub fn get_method(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn create_method(method: Method) -> ExternResult<EntryHash> {
    create_entry(&EntryTypes::Method(method.clone()))?;
    hash_entry(&EntryTypes::Method(method.clone()))
}

#[hdk_extern]
pub fn run_method(input: RunMethodInput) -> ExternResult<Option<EntryHash>> {
    let maybe_record = get_method(input.method_eh.clone())?;
    if let Some(record) = maybe_record {
        let method = entry_from_record::<Method>(record)?;
        // get assessments from the input dimensions
        // compute the value - which would be a range value in the dimension that is created
        // for each dimension_eh, get the assessments
        let mut assessments: BTreeMap<EntryHash, Vec<Assessment>> = BTreeMap::new();
        for dimension_eh in method.clone().input_dimension_ehs {
            let mut dimension_assessments: Vec<Assessment> = Vec::new();
            let links = get_links(
                assessment_typed_path(input.resource_eh.clone(), dimension_eh.clone())?
                    .path_entry_hash()?,
                LinkTypes::Assessment,
                None,
            )?;
            for link in links {
                let maybe_assessment = get_assessment(EntryHash::from(link.target))?;
                if let Some(record) = maybe_assessment {
                    let assessment = entry_from_record::<Assessment>(record)?;
                    dimension_assessments.push(assessment)
                }
            }
            assessments.insert(dimension_eh.clone(), dimension_assessments);
        }
        // now have all assessments with the associated dimension hash
        // stored as a BTreeMap in case its important to know which dimension the assessment is on
        // now check what program it is, and depending on the range value type do math accordingly
        // if doing multiple input dimensions, will want to make sure they are of compatible types for arithmetic.

        let maybe_objective_assessment = compute_objective_assessment(method, assessments, input.resource_eh)?;
        if let Some(objective_assessment) = maybe_objective_assessment {
            Ok(Some(create_assessment(objective_assessment)?))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

fn compute_objective_assessment(
    method: Method,
    assessments: BTreeMap<EntryHash, Vec<Assessment>>,
    subject_eh: EntryHash,
) -> ExternResult<Option<Assessment>> {
    //
    match method.program {
        Program::Sum => {
            // collapse into vec for easy computation - will have to be more careful if of different types
            let flat_assessments = assessments
                .values()
                .map(|assessment_vec| assessment_vec.clone())
                .collect::<Vec<Vec<Assessment>>>()
                .into_iter()
                .flatten()
                .collect::<Vec<Assessment>>();
            let mut sum: u32 = 0;
            for assessment in flat_assessments {
                match assessment.value {
                    RangeValue::Integer(value) => sum = sum + value,
                }
            }
            let assessment = Assessment {
                value: RangeValue::Integer(sum),
                dimension_eh: method.output_dimension_eh,
                subject_eh,
                maybe_input_dataset: None,
            };
            Ok(Some(assessment))
        }
        Program::Average => Ok(None),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RunMethodInput {
    resource_eh: EntryHash,
    method_eh: EntryHash,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateMethodInput {
    original_action_hash: ActionHash,
    updated_method: Method,
}

#[hdk_extern]
pub fn update_method(input: UpdateMethodInput) -> ExternResult<ActionHash> {
    update_entry(input.original_action_hash, &input.updated_method)
}

#[hdk_extern]
pub fn delete_method(action_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(action_hash)
}
