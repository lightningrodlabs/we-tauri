use hdi::prelude::*;



#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
  #[entry_def(name = "applet_gui", visibility = "private")]
  AppletGui(AppletGui),
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppletGui{
  pub devhub_happ_release_hash: EntryHash,
  pub gui: SerializedBytes,
}

