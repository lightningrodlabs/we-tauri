use hdk::prelude::*;

#[hdk_extern]
pub fn get_record(hash: AnyDhtHash) -> ExternResult<Option<Record>> {
    get(hash, GetOptions::default())
}
