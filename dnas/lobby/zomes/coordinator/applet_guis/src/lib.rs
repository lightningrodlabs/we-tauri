use applet_guis_integrity::*;
use hdk::prelude::*;

#[hdk_extern]
pub fn query_applet_gui(devhub_happ_release_hash: EntryHash) -> ExternResult<AppletGui> {
    let applet_gui_entry_type: EntryType = UnitEntryTypes::AppletGui.try_into()?;
    // query source chain
    let filter = ChainQueryFilter::new()
        .entry_type(applet_gui_entry_type)
        .include_entries(true);

    let records = query(filter)?;

    // filter by the right devhub hApp release hash
    let mut filtered_guis: Vec<AppletGui> = Vec::new();

    for record in records.clone() {
        let applet_gui: AppletGui = record
            .entry()
            .to_app_option()
            .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?
            .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                "Bad applet GUI"
            ))))?;

        if applet_gui.devhub_happ_release_hash == devhub_happ_release_hash {
            filtered_guis.push(applet_gui)
        }
    }

    match filtered_guis.first() {
        Some(gui) => Ok(gui.clone()),
        None => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "No Applet GUI found for the given DevHub hApp release hash."
        )))),
    }
}

#[hdk_extern]
pub fn commit_gui_file(input: AppletGui) -> ExternResult<()> {
    create_entry(EntryTypes::AppletGui(input))?;
    Ok(())
}
