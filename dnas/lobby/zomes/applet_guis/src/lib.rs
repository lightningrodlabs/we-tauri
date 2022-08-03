use hdk::prelude::*;


entry_defs![PathEntry::entry_def(), AppletGui::entry_def()];


#[hdk_extern]
pub fn query_applet_gui(devhub_happ_release_hash: EntryHash) -> ExternResult<AppletGui> {

  println!("+_+_+_+_+_+_+_+_+_+_+_+ QUERY APPLET GUI");
  debug!("+_+_+_+_+_+_+_+_+_+_+_+ QUERY APPLET GUI");

  // query source chain
  let filter = ChainQueryFilter::new()
    .entry_type(EntryType::App(
        AppEntryType {
          id: entry_def_index!(AppletGui)?,
          zome_id: zome_info()?.id,
          visibility: EntryVisibility::Private,
        }
      ))
    .include_entries(true);

  let elements = query(filter)?;

  // filter by the right devhub hApp release hash
  // let filtered_elements: Vec<AppletGui> = elements
  // .into_iter()
  // .map(|el| {
  //   let applet_gui: AppletGui = el
  //     .entry()
  //     .to_app_option()?
  //     .ok_or(WasmError::Guest(String::from("There seems to be a bad applet GUI in your source chain.")))?;

  //     applet_gui
  // })
  // .filter(|applet_gui| applet_gui.devhub_happ_release_hash == devhub_happ_release_hash)
  // .collect();

  println!("+_+_+_+_+_+_+_+_+_+_+_+ ELEMENTS: {:?}", elements);


  let mut filtered_guis: Vec<AppletGui> = Vec::new();

  for element in elements.clone() {
    let applet_gui: AppletGui = element
      .entry()
      .to_app_option()?
      .ok_or(WasmError::Guest(String::from("Bad applet GUI")))?;

    if applet_gui.devhub_happ_release_hash == devhub_happ_release_hash {
      filtered_guis.push(applet_gui)
    }
  }

  println!("+_+_+_+_+_+_+_+_+_+_+_+ FILTERED GUIS: {:?}", filtered_guis);

  match filtered_guis.first() {
    Some(gui) => Ok(gui.clone()),
    None => Err(WasmError::Guest(String::from("No Applet GUI found for the given DevHub hApp release hash."))),
  }

}


#[hdk_entry(id = "applet_gui", visibility = "private")]
#[serde(rename_all = "camelCase")]
#[derive(Clone)]
pub struct AppletGui{
  pub devhub_happ_release_hash: EntryHash,
  pub gui: SerializedBytes,
}

#[hdk_extern]
pub fn commit_gui_file(input: AppletGui) -> ExternResult<()> {
  create_entry(&input)?;
  Ok(())
}