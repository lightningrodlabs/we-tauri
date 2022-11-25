use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::CulturalContext;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::OrderingKind;

use crate::utils::entry_from_record;
use crate::utils::flatten_btree_map;
use crate::utils::get_assessments_for_resource;

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

#[derive(Serialize, Deserialize, Debug)]
pub struct ComputeContextInput {
  resource_ehs: Vec<EntryHash>,
  context_eh: EntryHash,
  can_publish_result: bool,
}

#[hdk_extern]
pub fn compute_context(compute_context_input: ComputeContextInput) -> ExternResult<Vec<EntryHash>> {
  // get the context entry
  // for each entry hash, get the objective dimensions along which to check threshold
  let maybe_record = get_cultural_context(compute_context_input.context_eh)?;
  if let Some(record) = maybe_record {
    let cultural_context = entry_from_record::<CulturalContext>(record)?;

    let mut dimension_ehs: Vec<EntryHash> = Vec::new();
    
    // this is for convenience, so that we know which order is associated with which dimension
    let mut dimension_ordering_kind: BTreeMap<EntryHash, OrderingKind> = BTreeMap::new();

    for (dimension_eh, ordering_kind) in cultural_context.order_by {
      dimension_ehs.push(dimension_eh.clone());
      dimension_ordering_kind.insert(dimension_eh, ordering_kind);
    }
    let mut all_resource_assessments: BTreeMap<EntryHash, BTreeMap<EntryHash, Vec<Assessment>>> = BTreeMap::new();
    let mut context_result: Vec<EntryHash> = Vec::new();
    for resource_eh in compute_context_input.resource_ehs {
      let resource_assessments = get_assessments_for_resource(resource_eh.clone(), dimension_ehs.clone())?;
      all_resource_assessments.insert(resource_eh.clone(), resource_assessments.clone());
      
      // check the assessments against all thresholds?
      // flatten the assessment map and compare
      let assessments = flatten_btree_map(resource_assessments);
      
      // for each assessment, check against each threshold
      // TODO: clarify the exact comparison logic between multiple assessments and thresholds
      let mut meets_threshold = true;
      for assessment in assessments {
        for threshold in cultural_context.thresholds.clone() {
          if !assessment.value.meets_threshold(threshold)? {
            meets_threshold = false; 
          }
        }
      }
      if meets_threshold {
        // TODO: will also need to add a relevant value to be able to order as well
        context_result.push(resource_eh)
      }
    }

    return Ok(context_result);


  }
  else {
    return Ok(vec![]);
  }
}

#[hdk_extern]
pub fn update_cultural_context(input: UpdateCulturalContextInput) -> ExternResult<ActionHash> {
  update_entry(input.original_action_hash, &input.updated_cultural_context)
}


#[hdk_extern]
pub fn delete_cultural_context(action_hash: ActionHash) -> ExternResult<ActionHash> {
  delete_entry(action_hash)
}

