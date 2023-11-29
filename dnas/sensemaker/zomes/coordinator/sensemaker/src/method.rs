use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;
use sensemaker_integrity::Method;
use sensemaker_integrity::Program;
use sensemaker_integrity::RangeValue;

use crate::create_assessment;
use crate::utils::entry_from_record;
use crate::utils::flatten_btree_map;
use crate::utils::get_assessments_for_resource_inner;
use crate::CreateAssessmentInput;

#[hdk_extern]
pub fn get_method(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
fn get_methods(_:()) -> ExternResult<Vec<Record>> {
    let links = get_links(
        methods_typed_path()?.path_entry_hash()?,
        LinkTypes::Method,
        None,
    )?;
    match links.last() {
        Some(_link) => {
            let collected_get_results: ExternResult<Vec<Option<Record>>> = links.into_iter().map(|link| {
                let entry_hash = link.target.into_entry_hash()
                    .ok_or_else(|| wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?;
    
                    get_method(entry_hash)
            }).collect();
    
            // Handle the Result and then filter_map to remove None values
            collected_get_results.map(|maybe_records| {
                maybe_records.into_iter().filter_map(|maybe_record| maybe_record).collect::<Vec<Record>>()
            })
        } 
        None => Ok(vec![])
    }
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueryParams {
    pub dimension_type: String,
    dimension_eh: EntryHash
}

#[hdk_extern]
pub fn get_method_for_dimension(QueryParams{ dimension_type, dimension_eh }: QueryParams) -> ExternResult<Option<Record>> {
    // given an input dimension EH, should return a list of method objects which have the corresponding input.
    // given an output dimension EH, should return a list of method object which have the output dimension.
    // given no filter return all methods
    get(dimension_eh, GetOptions::default())
}

#[hdk_extern]
pub fn create_method(method: Method) -> ExternResult<Record> {
    let action_hash = create_entry(&EntryTypes::Method(method.clone()))?;
    let method_eh = hash_entry(&EntryTypes::Method(method.clone()))?;
    let record = get(action_hash.clone(), GetOptions::default())?;
    if let Some(record) = record {
        create_link(
            methods_typed_path()?.path_entry_hash()?,
            method_eh.clone(),
            LinkTypes::Method,
            (),
        )?;

        Ok(record)
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to get method record after create"
        ))))
    } 
}

#[hdk_extern]
pub fn run_method(input: RunMethodInput) -> ExternResult<Option<Assessment>> {
    let maybe_record = get_method(input.method_eh.clone())?;
    if let Some(record) = maybe_record {
        let method = entry_from_record::<Method>(record)?;
        // get assessments from the input dimensions
        // compute the value - which would be a range value in the dimension that is created
        // for each dimension_eh, get the assessments
        let assessments = get_assessments_for_resource_inner(
            input.resource_eh.clone(),
            method.input_dimension_ehs.clone(),
        )?;
        // now have all assessments with the associated dimension hash
        // stored as a BTreeMap in case its important to know which dimension the assessment is on
        // now check what program it is, and depending on the range value type do math accordingly
        // if doing multiple input dimensions, will want to make sure they are of compatible types for arithmetic.

        let maybe_objective_assessment =
            compute_objective_assessment(method, assessments, input.resource_eh, input.resource_def_eh)?;
        if let Some(objective_assessment) = maybe_objective_assessment {
            // TODO: may want to change `create_assessment` to return the created assessment rather than the hash. For now sticking with this for minimal side-effects.
            let assessment_record = create_assessment(objective_assessment)?;
            Ok(Some(entry_from_record::<Assessment>(assessment_record)?))
        } else {
            Err(wasm_error!(WasmErrorInner::Guest(String::from(
                "Issue With Computation"
            ))))
        }
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Method Not Found"
        ))))
    }
}

fn compute_objective_assessment(
    method: Method,
    assessments: BTreeMap<EntryHash, Vec<Assessment>>,
    resource_eh: EntryHash,
    resource_def_eh: EntryHash,
) -> ExternResult<Option<CreateAssessmentInput>> {
    //
    match method.program {
        Program::Sum => {
            // collapse into vec for easy computation - will have to be more careful if of different types
            let mut is_int: bool = true;
            let flat_assessments = flatten_btree_map(assessments);
            let mut sum: u32 = 0;
            let mut sum_float: f64 = 0.0;
            for assessment in flat_assessments {
                match assessment.value {
                    RangeValue::Integer(value) => {
                        sum = sum + value;
                    },
                    RangeValue::Float(value) => {
                        sum_float = sum_float + value;
                        is_int = false;
                    }
                }
            }
            let assessment_value: RangeValue;
            if is_int {
                assessment_value = RangeValue::Integer(sum);
            }
            else {
                assessment_value = RangeValue::Float(sum_float);
            }
            let assessment = CreateAssessmentInput {
                value: assessment_value,
                dimension_eh: method.output_dimension_eh,
                resource_eh,
                resource_def_eh,
                maybe_input_dataset: None,
            };
            Ok(Some(assessment))
        }
        Program::Average => {
            // collapse into vec for easy computation - will have to be more careful if of different types
            let mut is_int: bool = true;
            let flat_assessments = flatten_btree_map(assessments);
            let mut sum: u32 = 0;
            let mut sum_float: f64 = 0.0;

            for assessment in flat_assessments.clone() {
                match assessment.value {
                    RangeValue::Integer(value) => sum = sum + value,
                    RangeValue::Float(value) => {
                        sum_float = sum_float + value;
                        is_int = false;
                    }, // TODO: complete this
                }
            }
            let assessment_value: RangeValue;

            if is_int {
                let average = sum / flat_assessments.len() as u32;
                assessment_value = RangeValue::Integer(average);
            }
            else {
                let average = sum_float / flat_assessments.len() as f64;
                assessment_value = RangeValue::Float(average);
            }
            let assessment = CreateAssessmentInput {
                value: assessment_value,
                dimension_eh: method.output_dimension_eh,
                resource_eh,
                resource_def_eh,
                maybe_input_dataset: None,
            };
            Ok(Some(assessment))
        },
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RunMethodInput {
    resource_eh: EntryHash,
    resource_def_eh: EntryHash,
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

pub fn methods_typed_path() -> ExternResult<TypedPath> {
    Path::from("methods").typed(LinkTypes::Method)
}