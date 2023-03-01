import { DnaHash } from '@holochain/client';
import { Hrl } from '@lightningrodlabs/we-applet';

export type OpenViewParameters =
  | {
      view: "group-peers-status";
      groupDnaHash: DnaHash;
    }
  | {
      view: "group-installable-applets";
      groupDnaHash: DnaHash;
    }
  | {
      view: "group-applet-main";
      groupDnaHash: DnaHash;
    }
  | {
      view: "group-applet-block";
      groupDnaHash: DnaHash;
      appletInstanceHash: EntryHash;
      blockName: string;
    }
  | {
      view: "entry";
      hrl: Hrl;
      context: any;
    };
