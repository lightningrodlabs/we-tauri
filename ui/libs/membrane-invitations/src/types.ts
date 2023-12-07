import {
  AgentPubKey,
  DnaHash,
  MembraneProof,
  Timestamp,
  SignedActionHashed,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink,
  ActionHash,
} from "@holochain/client";

export type MembraneInvitationsSignal =
  | {
      type: "EntryCreated";
      action: SignedActionHashed<Create>;
      app_entry: EntryTypes;
    }
  | {
      type: "EntryUpdated";
      action: SignedActionHashed<Update>;
      app_entry: EntryTypes;
      original_app_entry: EntryTypes;
    }
  | {
      type: "EntryDeleted";
      action: SignedActionHashed<Delete>;
      original_app_entry: EntryTypes;
    }
  | {
      type: "LinkCreated";
      action: SignedActionHashed<CreateLink>;
      link_type: string;
    }
  | {
      type: "LinkDeleted";
      action: SignedActionHashed<DeleteLink>;
      link_type: string;
    }
  | {
      type: "NewInvitation";
      invitation_action_hash: ActionHash;
      invitation: JoinMembraneInvitation;
    };

export type EntryTypes = { type: "CloneDnaRecipe" } & CloneDnaRecipe;

export interface CloneDnaRecipe {
  original_dna_hash: DnaHash;
  properties: any;
  network_seed: string | undefined;
  resulting_dna_hash: DnaHash;
  custom_content: Uint8Array;
}

export interface JoinMembraneInvitation {
  clone_dna_recipe: CloneDnaRecipe;
  inviter: AgentPubKey;
  invitee: AgentPubKey;
  membrane_proof: MembraneProof | undefined;
  timestamp: Timestamp;
}
