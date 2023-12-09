use hdk::prelude::*;
use sensemaker_integrity::{EntryTypes, LinkTypes, Range};

#[hdk_extern]
pub fn create_range(range: Range) -> ExternResult<Record> {
    let action_hash = create_entry(&EntryTypes::Range(range.clone()))?;
    let range_eh = hash_entry(&EntryTypes::Range(range.clone()))?;

    let record = get(action_hash.clone(), GetOptions::default())?;
    if let Some(record) = record {
        create_link(
            ranges_typed_path()?.path_entry_hash()?,
            range_eh.clone(),
            LinkTypes::Ranges,
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
pub fn get_range(entry_hash: EntryHash) -> ExternResult<Option<Record>> {
    get(entry_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_ranges(_: ()) -> ExternResult<Vec<Option<Record>>> {
    get_links(
        ranges_typed_path()?.path_entry_hash()?,
        LinkTypes::Ranges,
        None,
    )?
    .into_iter()
    .map(|link| get_range(link.target.into_entry_hash()
      .ok_or(wasm_error!(WasmErrorInner::Guest(String::from("Invalid link target"))))?
    ))
    .collect::<ExternResult<Vec<Option<Record>>>>()
}

// TODO: revisit for potential hotspot
fn ranges_typed_path() -> ExternResult<TypedPath> {
    Path::from("ranges").typed(LinkTypes::Dimensions)
}
