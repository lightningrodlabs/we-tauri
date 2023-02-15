use hdi::prelude::*;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    AppletGui(AppletGui),
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct AppletGui {
    pub devhub_happ_release_hash: EntryHash,
    pub gui: SerializedBytes,
}
