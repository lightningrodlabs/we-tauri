use hdi::prelude::*;
use std::collections::BTreeMap;

#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Applet(Applet),
    RelatedGroup(RelatedGroup),
    GroupProfile(GroupProfile),
}

#[hdk_link_types]
pub enum LinkTypes {
    AnchorToApplet,
    AppletToExternalAgent,
    AppletToInvitedGroup, // links to "first-order" neighbor groups if an app is being federated
    GroupInfoPath,
    AnchorToGroupProfile,
    AnchorToRelatedGroup,
}

/// An applet insatnce
#[hdk_entry_helper]
#[derive(Clone)]
pub struct Applet {
    // name of the applet as chosen by the person adding it to the group,
    pub custom_name: String,
    pub description: String,

    pub appstore_app_hash: ActionHash,

    pub devhub_dna_hash: DnaHash,
    pub devhub_happ_release_hash: EntryHash,
    pub devhub_gui_release_hash: EntryHash,

    pub network_seed: Option<String>,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleName
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct RelatedGroup {
    pub group_profile: GroupProfile,
    pub network_seed: String,
    pub group_dna_hash: DnaHash,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FederateAppletInput {
    pub applet_hash: EntryHash,
    pub group_dna_hash: EntryHash,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct GroupProfile {
    pub name: String,
    pub logo_src: String,
}