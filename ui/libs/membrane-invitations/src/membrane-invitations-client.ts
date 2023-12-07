import {
  ActionHashMap,
  ZomeClient,
  EntryRecord,
} from "@holochain-open-dev/utils";
import {
  MembraneProof,
  Record,
  EntryHash,
  ActionHash,
  DnaHash,
  AgentPubKey,
  AppAgentClient,
} from "@holochain/client";
import {
  CloneDnaRecipe,
  JoinMembraneInvitation,
  MembraneInvitationsSignal,
} from "./types";

export class MembraneInvitationsClient extends ZomeClient<MembraneInvitationsSignal> {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName = "membrane_invitations"
  ) {
    super(client, roleName, zomeName);
  }

  public createCloneDnaRecipe(recipe: CloneDnaRecipe): Promise<EntryHash> {
    return this.callZome("create_clone_dna_recipe", recipe);
  }

  public async getCloneRecipesForDna(
    originalDnaHash: DnaHash
  ): Promise<Array<EntryRecord<CloneDnaRecipe>>> {
    const records: Record[] = await this.callZome(
      "get_clone_recipes_for_dna",
      originalDnaHash
    );

    return records.map((r) => new EntryRecord(r));
  }

  public inviteToJoinMembrane(
    cloneDnaRecipe: CloneDnaRecipe,
    invitee: AgentPubKey,
    membraneProof: MembraneProof | undefined
  ): Promise<ActionHash> {
    return this.callZome("invite_to_join_membrane", {
      clone_dna_recipe: cloneDnaRecipe,
      invitee,
      membrane_proof: membraneProof,
    });
  }

  public async getMyInvitations(): Promise<
    ActionHashMap<JoinMembraneInvitation>
  > {
    return new ActionHashMap(await this.callZome("get_my_invitations", null));
  }

  public removeInvitation(invitationLinkHash: ActionHash): Promise<void> {
    return this.callZome("remove_invitation", invitationLinkHash);
  }
}
