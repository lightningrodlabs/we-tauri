use std::collections::BTreeMap;

use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct AppletConfig {
    pub name: String,
    // pub ranges: Vec<EntryHash>, // leaving out ranges since this is not an entry and is just part of the dimension
    pub dimensions: BTreeMap<String,EntryHash>,
    // the base_type field in ResourceType needs to be bridged call
    pub resource_types: BTreeMap<String,EntryHash>,
    pub methods: BTreeMap<String,EntryHash>,
    pub cultural_contexts: BTreeMap<String,EntryHash>,
}