import {
  ActionType,
  AdminWebsocket,
  AppEntryDef,
  AppInfo,
  DnaHash,
  EntryHash,
  NewEntryAction,
  Record,
} from "@holochain/client";
import { Hrl } from "@lightningrodlabs/we-applet";
import { findAppForDnaHash, initAppClient } from "../../utils";
import { updateCoordinators } from "../update-coordinators";
import { hrlLocatorZome } from "./hrl_locator";

export interface EntryTypeLocation {
  integrity_zome_name: string;
  entry_type: string;
}

export interface DnaLocation {
  groupDnaHash: DnaHash;

  appletInstanceHash: EntryHash;
  appInfo: AppInfo;
  roleName: string;
}

export const HRL_LOCATOR_COORDINATOR_ZOME = "__hrl_locator";
export const HRL_LOCATOR_GET_FN_NAME = "get_record";

export const ENTRY_TYPE_LOCATOR_COORDINATOR_ZOME = "__entry_type_locator";

// If it isn't already, install the hrl_locator coordinator zome
// and then get the record for the given hrl calling the given dna
export async function getRecord(
  adminWebsocket: AdminWebsocket,
  dnaLocation: DnaLocation,
  hrl: Hrl
): Promise<Record | undefined> {
  const client = await initAppClient(dnaLocation.appInfo.installed_app_id);

  let record: Record | undefined;
  try {
    record = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: HRL_LOCATOR_COORDINATOR_ZOME,
      payload: hrl,
      fn_name: HRL_LOCATOR_GET_FN_NAME,
    });
  } catch (e) {
    //
    await updateCoordinators(adminWebsocket, {
      dna_hash: hrl[0],
      ...(await hrlLocatorZome()),
    });

    record = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: HRL_LOCATOR_COORDINATOR_ZOME,
      payload: hrl,
      fn_name: HRL_LOCATOR_GET_FN_NAME,
    });
  }

  return record;
}

// If it isn't already, install the entry_type_locator coordinator zome
// and then call it with the given Hrl, returning its integrity zome name and its entry type
export async function locateHrlInDna(
  adminWs: AdminWebsocket,
  dnaLocation: DnaLocation,
  hrl: Hrl
): Promise<EntryTypeLocation> {
  const record = await getRecord(adminWs, dnaLocation, hrl);
  if (!record) throw new Error("Could not locate HRL");

  // TODO: should we support HRL pointing to CreateLinks?
  const action = record.signed_action.hashed.content;
  if (!(action.type === ActionType.Create || action.type === ActionType.Update))
    throw new Error("The given HRL doesn't resolve to an entry or action");
  const newEntryAction: NewEntryAction = action;

  const app_entry_type = newEntryAction.entry_type["App"] as
    | AppEntryDef
    | undefined;
  if (!app_entry_type)
    throw new Error("The given HRL does not resolve to an app entry type");

  const client = await initAppClient(dnaLocation.appInfo.installed_app_id);

  let integrity_zome_name, entry_type;
  try {
    const result = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: `${ENTRY_TYPE_LOCATOR_COORDINATOR_ZOME}_${app_entry_type.zome_index}`,
      payload: hrl,
      fn_name: "locate_entry_type",
    });
    integrity_zome_name = result.integrity_zome_name;
    entry_type = result.entry_type;
  } catch (e) {
    //
    await updateCoordinators(adminWs, {
      dna_hash: hrl[0],
      ...(await hrlLocatorZome()),
      // app_entry_type.zome_index
    });
    const result = await client.callZome({
      role_name: dnaLocation.roleName,
      zome_name: `${ENTRY_TYPE_LOCATOR_COORDINATOR_ZOME}_${app_entry_type.zome_index}`,
      payload: hrl,
      fn_name: "locate_entry_type",
    });
    integrity_zome_name = result.integrity_zome_name;
    entry_type = result.entry_type;
  }

  return {
    entry_type,
    integrity_zome_name,
  };
}
