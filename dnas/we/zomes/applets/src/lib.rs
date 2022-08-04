use std::collections::BTreeMap;

use hdk::prelude::holo_hash::{DnaHash};
pub use hdk::prelude::*;

enum AppletLinkType {
    ExternalAgentToApplet = 0,
}

impl From<AppletLinkType> for LinkType {
    fn from(hdk_link_type: AppletLinkType) -> Self {
        Self(hdk_link_type as u8)
    }
}

entry_defs![PathEntry::entry_def(), Applet::entry_def()];

/// A applet
#[hdk_entry(id = "applet")]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct Applet {
    pub name: String,
    pub description: String,
    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHash,
    // pub gui_file_hash: EntryHash,                // not required since the GUI is a private entry

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub uid: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHash>,      // Segmented by RoleId
}

fn get_applets_path() -> Path {
    Path::from("applets")
}

#[hdk_extern]
fn create_applet(input: RegisterAppletInput) -> ExternResult<EntryHash> {
    let applet_hash = register_applet(input)?;

    let path = get_applets_path();
    path.ensure()?;
    let anchor_hash = path.path_entry_hash()?;
    create_link(
        anchor_hash,
        applet_hash.clone(),
        HdkLinkType::Any,
        (),
    )?;

    Ok(applet_hash)
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegisterAppletInput {
    pub applet_agent_pub_key: AgentPubKey,
    pub applet: Applet,
}



#[hdk_extern]
pub fn register_applet(input: RegisterAppletInput) -> ExternResult<EntryHash> {
    create_entry(&input.applet)?;

    let applet_hash = hash_entry(input.applet)?;

    create_link(
        applet_hash.clone(),
        AgentPubKey::from(input.applet_agent_pub_key),
        AppletLinkType::ExternalAgentToApplet,
        (), // Maybe applet hash?
    )?;

    Ok(applet_hash.into())
}



#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayingApplet {
    applet: Applet,
    agent_pub_key: AgentPubKey,
}

#[hdk_extern]
pub fn get_applets_i_am_playing(_: ()) -> ExternResult<Vec<(EntryHash, PlayingApplet)>> {
    let offer_entry_type = EntryType::App(AppEntryType::new(
        entry_def_index!(Applet)?,
        zome_info()?.id,
        EntryVisibility::Public,
    ));
    let filter = ChainQueryFilter::new()
        .entry_type(offer_entry_type)
        .include_entries(true);
    let query_result = query(filter)?;

    let applets = applets_from_elements(query_result)?;

    let filter = ChainQueryFilter::new().header_type(HeaderType::CreateLink);
    let create_links = query(filter)?;

    let mut playing_applets: Vec<(EntryHash, PlayingApplet)> = Vec::new();

    for element in create_links {
        if let Header::CreateLink(create_link_header) = element.header() {
            if create_link_header.link_type == AppletLinkType::ExternalAgentToApplet.into() {
                let applet_hash =
                    EntryHash::from(create_link_header.base_address.clone());
                if let Some(applet) = applets.get(&applet_hash) {
                    playing_applets.push(
                        (applet_hash,
                        PlayingApplet {
                            applet: applet.clone(),
                            agent_pub_key: AgentPubKey::from(
                                EntryHash::from(create_link_header.target_address.clone()),
                            ),
                        },
                    ));
                }
            }
        }
    }

    debug!(">>>>> playing_applets: {:?}", playing_applets);
    Ok(playing_applets)
}



#[hdk_extern]
fn get_all_applets(_: ()) -> ExternResult<Vec<(EntryHash, Applet)>> {
    let path = get_applets_path();

    let links = get_links(path.path_entry_hash()?, None)?;

    let get_input = links
        .into_iter()
        .map(|link| GetInput::new(link.target.into(), GetOptions::default()))
        .collect();

    let applet_elements = HDK.with(|hdk| hdk.borrow().get(get_input))?;

    Ok(
        applets_from_elements(applet_elements
            .into_iter()
            .filter_map(|e| e)
            .collect()
        )?
        .into_iter()
        .collect::<Vec<(EntryHash, Applet)>>()
    )
}


fn applets_from_elements(applets_elements: Vec<Element>) -> ExternResult<BTreeMap<EntryHash, Applet>> {
    let applets: BTreeMap<EntryHash, Applet> = applets_elements
        .into_iter()
        .map(|element| {
            let applet: Applet = element
                .entry()
                .to_app_option()?
                .ok_or(WasmError::Guest(String::from("There is no applet entry")))?;

            Ok((
                element.header().entry_hash().unwrap().clone(),
                applet,
            ))
        })
        .collect::<ExternResult<BTreeMap<EntryHash, Applet>>>()?;

    Ok(applets)
}
