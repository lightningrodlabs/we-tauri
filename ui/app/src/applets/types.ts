import { EntryHash } from "@holochain/client";

export interface Applet {
  custom_name: string; // name of the applet instance as chosen by the person adding it to the group,
  description: string;

  app_entry_hash: EntryHash;

  network_seed: string | undefined;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
}
