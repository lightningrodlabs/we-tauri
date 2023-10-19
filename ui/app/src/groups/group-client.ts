import { EntryRecord, HashType, retype } from "@holochain-open-dev/utils";
import {
  ActionHash,
  DnaHash,
  EntryHash,
  AppAgentCallZomeRequest,
  Record,
  AppAgentWebsocket,
  AgentPubKey,
  encodeHashToBase64,
} from "@holochain/client";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import { Applet } from "../applets/types.js";
import { RelatedGroup } from "./types.js";

export class GroupClient {
  constructor(
    public appAgentClient: AppAgentWebsocket,
    public roleName: string,
    public zomeName: string = "group"
  ) {}

  /** GroupProfile */

  async getGroupProfile(): Promise<EntryRecord<GroupProfile> | undefined> {
    const record = await this.callZome("get_group_profile", null);
    return record ? new EntryRecord(record) : undefined;
  }

  async setGroupProfile(groupProfile: GroupProfile): Promise<void> {
    await this.callZome("set_group_profile", groupProfile);
  }

  /** Related Groups */

  async addRelatedGroup(relatedGroup: RelatedGroup): Promise<void> {
    return this.callZome("add_related_group", relatedGroup);
  }

  async getRelatedGroups(): Promise<Array<EntryRecord<RelatedGroup>>> {
    const records: Record[] = await this.callZome("get_related_groups", null);

    return records.map((r) => new EntryRecord(r));
  }

  /** Applets */

  async getGroupApplets(): Promise<Array<EntryHash>> {
    return this.callZome("get_group_applets", null);
  }

  /**
   * Gets all the private Applet entries from the source chain
   * @returns
   */
  async getMyApplets(): Promise<Array<EntryHash>> {
    return this.callZome("get_my_applets", null);
  }

  /**
   * Gets Applet entries that have been advertised by other agents in the
   * group but have never been installed into the local conductor yet.
   * @returns
   */
  async getUnjoinedApplets(): Promise<Array<[EntryHash, AgentPubKey]>> {
    return this.callZome("get_unjoined_applets", null);
  }

  async getArchivedApplets(): Promise<Array<EntryHash>> {
    return this.callZome("get_archived_applets", null);
  }

  async getApplet(appletHash: EntryHash): Promise<Applet | undefined> {
    const record = await this.callZome("get_applet", appletHash);
    if (!record) {
      console.warn(`@group-client: @getApplet: No applet found for hash: ${encodeHashToBase64(appletHash)}`);
      return undefined;
    };
    return new EntryRecord<Applet>(record).entry;
  }

  /**
   * First checks whether the same Applet has already been added to the group by someone
   * else and if not, will advertise it in the group DNA. Then it adds the Applet
   * entry as a private entry to the source chain.
   * @param applet
   */
  async registerApplet(applet: Applet): Promise<EntryHash> {
    return this.callZome("register_applet", applet);
  }

  async hashApplet(applet: Applet): Promise<EntryHash> {
    return this.callZome("hash_applet", applet);
  }

  async archiveApplet(appletHash: EntryHash): Promise<void> {
    return this.callZome("archive_applet", appletHash);
  }

  async unarchiveApplet(appletHash: EntryHash): Promise<void> {
    return this.callZome("unarchive_applet", appletHash);
  }

  async registerAppletFederation(
    appletHash: EntryHash,
    groupDnaHash: DnaHash
  ): Promise<ActionHash> {
    return this.callZome("register_applet_federation", {
      applet_hash: appletHash,
      group_dna_hash: retype(groupDnaHash, HashType.ENTRY),
    });
  }

  async getFederatedGroups(appletHash: EntryHash): Promise<DnaHash[]> {
    const groups: EntryHash[] = await this.callZome(
      "get_federated_groups",
      appletHash
    );

    return groups.map((groupEntryHash) => retype(groupEntryHash, HashType.DNA));
  }

  private callZome(fn_name: string, payload: any) {
    const req: AppAgentCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return this.appAgentClient.callZome(req);
  }
}
