import { DnaHash } from "@holochain/client";
import { GroupProfile } from "@lightningrodlabs/we-applet";

export interface RelatedGroup {
  group_profile: GroupProfile;
  network_seed: string;
  resulting_dna_hash: DnaHash;
}
