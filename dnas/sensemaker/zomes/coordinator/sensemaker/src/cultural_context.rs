use std::cmp::Ordering;
use std::collections::BTreeMap;

use hdk::prelude::*;
use sensemaker_integrity::Assessment;
use sensemaker_integrity::CulturalContext;
use sensemaker_integrity::EntryTypes;
use sensemaker_integrity::OrderingKind;

use crate::utils::entry_from_record;
use crate::utils::flatten_btree_map;
use crate::utils::get_assessments_for_resource_inner;
use crate::utils::reduce_assessments_to_latest;

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
    updated_cultural_context: CulturalContext,
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

        for (dimension_eh, ordering_kind) in cultural_context.order_by.clone() {
            dimension_ehs.push(dimension_eh.clone());
            dimension_ordering_kind.insert(dimension_eh, ordering_kind);
        }
        let mut all_resource_assessments: BTreeMap<
            EntryHash,
            BTreeMap<EntryHash, Vec<Assessment>>,
        > = BTreeMap::new();
        let mut unordered_context_result: Vec<(EntryHash, BTreeMap<EntryHash, Vec<Assessment>>)> =
            Vec::new();
        for resource_eh in compute_context_input.resource_ehs {
            // we should really only be using one assessment per dimension per resource, since these are objective dimensions
            // for now going to just take the last one, but we will need to clarify exactly how to handle these situations
            let resource_assessments =
                get_assessments_for_resource_inner(resource_eh.clone(), dimension_ehs.clone())?;
            all_resource_assessments.insert(resource_eh.clone(), resource_assessments.clone());

            // check the assessments against all thresholds?
            // flatten the assessment map and compare
            let assessments = reduce_assessments_to_latest(flatten_btree_map(resource_assessments.clone()));

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
                unordered_context_result.push((resource_eh, resource_assessments))
            }
        }
        return Ok(order_resources(
            unordered_context_result,
            cultural_context.order_by,
        )?);
        // return Ok(context_result);
    } else {
        // TODO: better handling of this case
        return Ok(vec![]);
    }
}

pub fn order_resources(
    unordered_context_result: Vec<(EntryHash, BTreeMap<EntryHash, Vec<Assessment>>)>,
    order_by: Vec<(EntryHash, OrderingKind)>,
) -> ExternResult<Vec<EntryHash>> {
    // get things into a format that can be ordered more easily
    // for each dimension type, make an ordered list, return just the one
    // want Vec<(EntryHash, Assessment)> for each dimension so then can order it based on the ordering kind
    let mut ordered_by_dimension: BTreeMap<EntryHash, Vec<EntryHash>> = BTreeMap::new();
    for (dimension_eh, ordering_kind) in order_by.clone() {
        let mut unordered_for_dimension = Vec::new();
        for (resource_eh, resource_assessments) in unordered_context_result.clone() {
            let maybe_assessments = resource_assessments.get(&dimension_eh);
            if let Some(assessments) = maybe_assessments {
                let maybe_last_assessment = assessments.last();
                if let Some(last_assessment) = maybe_last_assessment {
                    unordered_for_dimension.push((resource_eh, last_assessment.clone()))
                }
            }
        }
        let ordered_for_dimension = order_by_dimension(unordered_for_dimension, ordering_kind)?;
        ordered_by_dimension.insert(dimension_eh, ordered_for_dimension);
    }
    // for now we take the last (dimension_eh, ordering_kind) pair for simplicity
    // in future will probably want to return something like `BTreeMap<DimensionEntryHash, Vec<ResourceEntryHash>>`
    // so have an ordered list of resources for each dimension passed in

    let maybe_dim_order_pair = order_by.last();
    if let Some(dim_order_pair) = maybe_dim_order_pair {
        let (dimension_eh, _) = dim_order_pair;
        let maybe_ordered_on_dim = ordered_by_dimension.get(dimension_eh);
        if let Some(ordered_on_dim) = maybe_ordered_on_dim {
            Ok(ordered_on_dim.clone())
        } else {
            Ok(vec![])
        }
    }
    // TODO: better error handling
    else {
        Ok(vec![])
    }
}

pub fn order_by_dimension(
    mut unordered_for_dimension: Vec<(EntryHash, Assessment)>,
    ordering_kind: OrderingKind,
) -> ExternResult<Vec<EntryHash>> {
    let mut comparison_error = wasm_error!(WasmErrorInner::Guest(String::from("")));
    let mut comparison_errored = false;
    match ordering_kind {
        OrderingKind::Biggest => {
            unordered_for_dimension.sort_by(|(_, a_assessment), (_, b_assessment)| {
                match b_assessment.value.compare(a_assessment.clone().value) {
                    Ok(ordering) => ordering,
                    Err(wasm_error) => {
                        comparison_errored = true;
                        comparison_error = wasm_error;
                        Ordering::Equal
                    }
                }
            });
            if comparison_errored {
                Err(comparison_error)
            } else {
                Ok(unordered_for_dimension
                    .into_iter()
                    .map(|(resource_eh, _)| resource_eh)
                    .collect())
            }
        }
        OrderingKind::Smallest => {
            unordered_for_dimension.sort_by(|(_, a_assessment), (_, b_assessment)| {
                match a_assessment.value.compare(b_assessment.clone().value) {
                    Ok(ordering) => ordering,
                    Err(wasm_error) => {
                        comparison_errored = true;
                        comparison_error = wasm_error;
                        Ordering::Equal
                    }
                }
            });
            if comparison_errored {
                Err(comparison_error)
            } else {
                Ok(unordered_for_dimension
                    .into_iter()
                    .map(|(resource_eh, _)| resource_eh)
                    .collect())
            }
        }
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
