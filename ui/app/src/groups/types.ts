import { DnaHash, EntryHash } from "@holochain/client";

export interface AppletInstance {
  group_role_name: string; // name of the applet instance as chosen by the person adding it to the group,
  description: string;
  logo_src: string | undefined;

  devhub_happ_release_hash: EntryHash;
  devhub_gui_release_hash: EntryHash;

  properties: Record<string, Uint8Array>; // Segmented by RoleId
  network_seed: Record<string, string | undefined>; // Segmented by RoleId
  dna_hashes: Record<string, DnaHash>; // Segmented by RoleId
}

export interface GroupInfo {
  name: string;
  logo_src: string;
}
