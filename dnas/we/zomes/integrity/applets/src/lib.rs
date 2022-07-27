use std::collections::BTreeMap;

use hdi::prelude::holo_hash::{AgentPubKeyB64, DnaHashB64, EntryHashB64};
use hdi::prelude::*;

enum AppletLinkType {
    AppletToExternalAgent = 0,
}

impl From<AppletLinkType> for LinkType {
    fn from(hdk_link_type: AppletLinkType) -> Self {
        Self(hdk_link_type as u8)
    }
}


#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def(name = "applet", visibility = "public")]
    Applet(Applet),
    #[entry_def(name = "applet_gui", visibility = "private")]
    AppletGui(AppletGui),
}


#[hdk_link_types]
pub enum LinkTypes {
    AppletPath,
    AnchorToApplet,
    AppletToExternalAgent,
}




/// A applet
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct Applet {
    pub name: String,
    pub description: String,
    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHashB64,
    pub gui_file_hash: EntryHashB64,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub uid: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHashB64>,      // Segmented by RoleId
}


#[hdk_entry_helper]
pub struct AppletGui(SerializedBytes);

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegisterAppletInput {
    pub applet_agent_pub_key: AgentPubKey,
    pub applet: Applet,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingApplet {
    applet: Applet,
    agent_pub_key: AgentPubKeyB64,
}