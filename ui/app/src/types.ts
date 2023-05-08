import { EntryHash } from "@holochain/client";

export interface AppletBundleMetadata {
  title: string;
  subtitle: string | undefined;
  description: string;
  devhubHappReleaseHash: EntryHash;
  devhubGuiReleaseHash: EntryHash;
}
