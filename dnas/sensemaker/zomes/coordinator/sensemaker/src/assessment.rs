use std::collections::BTreeMap;

use hdk::prelude::*;
use holo_hash::EntryHashB64;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::DataSet;
use sensemaker_integrity::Dimension;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::LinkTypes;
use sensemaker_integrity::RangeValue;

use crate::get_dimension;
use crate::utils::entry_from_record;
use crate::utils::fetch_provider_resource;
use crate::utils::flatten_btree_map;
use crate::utils::get_assessments_for_resource_inner;

const ALL_ASSESSED_RESOURCES_BASE: &str = "all_assessed_resources";

#[hdk_extern]
pub fn get_assessment(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetAssessmentsForResourceInput {
    resource_ehs: Vec<EntryHash>,
    dimension_ehs: Vec<EntryHash>,
}


#[derive(Serialize, Deserialize, Debug)]
pub struct AssessmentWithDimensionAndResource {
    assessment: Assessment,
    dimension: Option<Dimension>,
    resource: Option<Record>
}

#[hdk_extern]
pub fn get_assessments_for_resources(
    GetAssessmentsForResourceInput {
        resource_ehs,
        dimension_ehs,
    }: GetAssessmentsForResourceInput,
) -> ExternResult<BTreeMap<EntryHashB64, Vec<Assessment>>> {
    let mut resource_assessments = BTreeMap::<EntryHashB64, Vec<Assessment>>::new();
    for resource_eh in resource_ehs {
        let assessments = get_assessments_for_resource_inner(resource_eh.clone(), dimension_ehs.clone())?;
        resource_assessments.insert(resource_eh.into(), flatten_btree_map(assessments));
    }
    Ok(resource_assessments)
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct CreateAssessmentInput {
    pub value: RangeValue,
    pub dimension_eh: EntryHash,
    pub resource_eh: EntryHash,
    pub resource_def_eh: EntryHash,
    pub maybe_input_dataset: Option<DataSet>,
}

#[hdk_extern]
pub fn create_assessment(CreateAssessmentInput { value, dimension_eh, resource_eh, resource_def_eh, maybe_input_dataset }: CreateAssessmentInput) -> ExternResult<EntryHash> {
    let assessment = Assessment {
        value,
        dimension_eh,
        resource_eh,
        resource_def_eh,
        maybe_input_dataset,
        author: agent_info()?.agent_latest_pubkey,
    };
    create_entry(&EntryTypes::Assessment(assessment.clone()))?;
    let assessment_eh = hash_entry(&EntryTypes::Assessment(assessment.clone()))?;
    let assessment_path = assessment_typed_path(assessment.resource_eh.clone(), assessment.dimension_eh)?;
    // ensure the path components are created so we can fetch child paths later
    assessment_path.clone().ensure()?;
    create_link(
        assessment_path.path_entry_hash()?,
        assessment_eh.clone(),
        LinkTypes::Assessment,
        (),
    )?;
    Ok(assessment_eh)
}

#[hdk_extern]
pub fn get_all_assessments(_:()) -> ExternResult<Vec<AssessmentWithDimensionAndResource>> {
    let base_path = all_assessments_typed_path()?;
    let assessed_resources_typed_paths = base_path.children_paths()?;
    let mut all_assessments: Vec<Vec<AssessmentWithDimensionAndResource>> = vec![];

    // for each resource that has been assessed, crawl all children to get each dimension that it has been assessed along
    for assessed_resource_path in assessed_resources_typed_paths {
        let assessed_dimensions_for_resource_typed_paths = assessed_resource_path.children_paths()?;
        
        // for each dimension that a resource has been assessed, get the assessment
        for assessed_dimension_path in assessed_dimensions_for_resource_typed_paths {
            let assessments = get_links(assessed_dimension_path.path_entry_hash()?, LinkTypes::Assessment, None)?.into_iter().map(|link| {
                let maybe_assessment = get_assessment(EntryHash::from(link.target))?;
                if let Some(record) = maybe_assessment {
                    let assessment = entry_from_record::<Assessment>(record)?;
                    let dimension = match get_dimension(assessment.dimension_eh.clone())? {
                        Some(record) => Some(entry_from_record::<Dimension>(record)?),
                        None => None
                    };
                    // attempt a bridge call to the provider zome to get the resource
                    let resource = fetch_provider_resource(assessment.resource_eh.clone(), assessment.resource_def_eh.clone())?;
                    Ok(Some(AssessmentWithDimensionAndResource {
                        assessment,
                        dimension,
                        resource
                    }))
                }
                else {
                    Ok(None)
                }
            }).collect::<ExternResult<Vec<Option<AssessmentWithDimensionAndResource>>>>()?.into_iter().filter_map(|maybe_assessment| {
                maybe_assessment
            }).collect::<Vec<AssessmentWithDimensionAndResource>>();
            all_assessments.push(assessments);
        }
    }
    Ok(all_assessments.into_iter().flatten().collect())
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
        "{}.{}.{}",
        ALL_ASSESSED_RESOURCES_BASE, resource_eh_string, dimension_eh_string
    ))
    .typed(LinkTypes::Assessment)?)
}

pub fn all_assessments_typed_path() -> ExternResult<TypedPath> {
    Ok(Path::from(ALL_ASSESSED_RESOURCES_BASE)
    .typed(LinkTypes::Assessment)?)
}