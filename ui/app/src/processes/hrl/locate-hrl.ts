import { AdminWebsocket, AppInfo, DnaHash, EntryHash } from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";
import { initAppClient } from "../../utils.js";
import { hrlLocatorZome } from "./hrl_locator.js";

export interface EntryDefLocation {
  integrity_zome: string;
  entry_def: string;
}

export interface DnaLocation {
  appInfo: AppInfo;
  appletHash: EntryHash;
  roleName: string;
}

export const HRL_LOCATOR_COORDINATOR_ZOME = "__hrl_locator";
export const HRL_LOCATOR_GET_FN_NAME = "locate_hrl";

// If it isn't already, install the hrl_locator coordinator zome
// call the function to get the record from the hrl and return its integrity zome and entry def id
// and then call "entry_defs" in the given integrity zome to retrieve the appropriate entry def id
export async function locateHrl(
  adminWebsocket: AdminWebsocket,
  dnaLocation: DnaLocation,
  hrl: Hrl
): Promise<EntryDefLocation | undefined> {
  const client = await initAppClient(dnaLocation.appInfo.installed_app_id);

  let location;
  try {
    location = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: HRL_LOCATOR_COORDINATOR_ZOME,
      payload: hrl[1],
      fn_name: HRL_LOCATOR_GET_FN_NAME,
    });
  } catch (e) {
    //
    await adminWebsocket.updateCoordinators({
      dna_hash: hrl[0],
      ...(await hrlLocatorZome()),
    });

    location = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: HRL_LOCATOR_COORDINATOR_ZOME,
      payload: hrl[1],
      fn_name: HRL_LOCATOR_GET_FN_NAME,
    });
  }

  const integrity_zome = location.integrity_zome;
  const entryDefIndex = location.entry_def_index;

  const entryDefs = await client.callZome({
    role_name: dnaLocation.roleName,
    zome_name: integrity_zome,
    payload: null,
    fn_name: "entry_defs",
  });
  const entry_def = entryDefs.Defs[entryDefIndex].id.App;
  return {
    integrity_zome,
    entry_def,
  };
}
