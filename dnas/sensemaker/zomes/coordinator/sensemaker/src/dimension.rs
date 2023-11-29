use hdk::prelude::*;
use sensemaker_integrity::{Dimension, EntryTypes, LinkTypes};

#[hdk_extern]
pub fn create_dimension(dimension: Dimension) -> ExternResult<Record> {
    let action_hash = create_entry(&EntryTypes::Dimension(dimension.clone()))?;
    let dimension_eh = hash_entry(&EntryTypes::Dimension(dimension.clone()))?;
    let record = get(action_hash.clone(), GetOptions::default())?;
    if let Some(record) = record {
        create_link(
            dimensions_typed_path()?.path_entry_hash()?,
            dimension_eh.clone(),
            LinkTypes::Dimensions,
            (),
        )?;
        Ok(record)
    } else {
        Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "not able to get dimension record after create"
        ))))
    }
}

#[hdk_extern]
pub fn get_dimension(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_dimensions(_: ()) -> ExternResult<Vec<Option<Record>>> {
    get_links(
        dimensions_typed_path()?.path_entry_hash()?,
        LinkTypes::Dimensions,
        None,
    )?
    .into_iter()
    .map(|link| get_dimension(link.target.into_entry_hash()
      .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?
    ))
    .collect::<ExternResult<Vec<Option<Record>>>>()
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateDimensionInput {
    original_action_hash: ActionHash,
    updated_dimension: Dimension,
}

// Commented out per Damien's review
// https://github.com/neighbour-hoods/sensemaker-lite/issues/17

// #[hdk_extern]
// pub fn update_dimension(input: UpdateDimensionInput) -> ExternResult<ActionHash> {
//     update_entry(input.original_action_hash, &input.updated_dimension)
// }

// #[hdk_extern]
// pub fn delete_dimension(action_hash: ActionHash) -> ExternResult<ActionHash> {
//     delete_entry(action_hash)
// }

pub fn dimensions_typed_path() -> ExternResult<TypedPath> {
    Path::from("dimensions").typed(LinkTypes::Dimensions)
}
