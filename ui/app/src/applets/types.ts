import { EntryHash } from "@holochain/client";

export interface AppletGui {
  devhub_happ_release_hash: EntryHash;
  gui: Uint8Array;
}
