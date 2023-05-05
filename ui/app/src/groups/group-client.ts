import {
  EntryHashMap,
  EntryRecord,
  RecordBag,
} from "@holochain-open-dev/utils";
import {
  ActionHash,
  DnaHash,
  EntryHash,
  AppAgentClient,
  AppAgentCallZomeRequest,
} from "@holochain/client";
import { GroupProfile } from "../../../libs/we-applet/dist";
import { Applet } from "../applets/types";

export class GroupClient {
  constructor(
    public appAgentClient: AppAgentClient,
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

  /** Applets */

  async getApplets(): Promise<Array<EntryHash>> {
    return this.callZome("get_applets", null);
  }

  async getApplet(appletHash: EntryHash): Promise<Applet | undefined> {
    const record = await this.callZome("get_applet", appletHash);
    return new EntryRecord<Applet>(record).entry;
  }

  async registerApplet(applet: Applet): Promise<EntryHash> {
    return this.callZome("register_applet", applet);
  }

  async unregisterApplet(appletHash: EntryHash): Promise<void> {
    return this.callZome("unregister_applet", appletHash);
  }

  async federateApplet(
    appletHash: EntryHash,
    groupDnaHash: DnaHash
  ): Promise<ActionHash> {
    return this.callZome("federate_applet", {
      applet_hash: appletHash,
      group_dna_hash: groupDnaHash,
    });
  }

  async getFederatedGroups(appletHash: EntryHash): Promise<DnaHash[]> {
    return this.callZome("get_federated_groups", appletHash);
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
