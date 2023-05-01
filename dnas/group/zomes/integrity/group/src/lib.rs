use hdi::prelude::*;
use std::collections::BTreeMap;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Applet(Applet),
    GroupProfile(GroupProfile),
}

#[hdk_link_types]
pub enum LinkTypes {
    AppletPath,
    AnchorToApplet,
    AppletToExternalAgent,
    AppletToInvitedGroup, // links to "first-order" neighbor groups if an app is being federated
    GroupInfoPath,
    AnchorToGroupInfo,
}

/// An applet insatnce
#[hdk_entry_helper]
#[derive(Clone)]
pub struct Applet {
    // name of the applet "instance" as chosen by the person adding it to the group,
    // (is also used as part of the installed_app_id in the conductor)
    pub custom_name: String,
    pub description: String,

    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHash,
    pub devhub_gui_release_hash: EntryHash,

    pub network_seed: Option<String>,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleName
    pub dna_hashes: BTreeMap<String, DnaHash>,         // Segmented by RoleName
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FederateAppletInput {
    pub applet_hash: EntryHash,
    pub group_dna_hash: DnaHash,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct GroupProfile {
    pub name: String,
    pub logo_src: String,
}
