use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct ResourceType {
    pub name: String,
    pub base_types: Vec<AppEntryType>,
    pub dimension_ehs: Vec<EntryHash>,
}
