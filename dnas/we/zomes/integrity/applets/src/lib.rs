use std::collections::BTreeMap;
use hdi::prelude::*;
use hdi::prelude::holo_hash::DnaHash;


#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    #[entry_def(name = "applet", visibility = "public")]
    Applet(Applet),
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
    pub custom_name: String, // name of the applet instance as chosen by the person adding it to the group,

    pub title: String, // title of the applet in the devhub
    pub description: String,
    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHash,
    // pub gui_file_hash: EntryHash, // not required since the GUI is a private entry

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub network_seed: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHash>,      // Segmented by RoleId
}


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
    agent_pub_key: AgentPubKey,
}