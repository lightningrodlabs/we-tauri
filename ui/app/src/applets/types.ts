import { ActionHash, EntryHash } from "@holochain/client";

export interface Applet {
  custom_name: string; // name of the applet instance as chosen by the person adding it to the group,
  description: string;

  appstore_app_hash: ActionHash;

  network_seed: string | undefined;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
}
