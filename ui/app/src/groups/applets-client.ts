import { EntryRecord, RecordBag } from "@holochain-open-dev/utils";
import {
  ActionHash,
  DnaHash,
  EntryHash,
  AppAgentClient,
  AppAgentCallZomeRequest,
} from "@holochain/client";
import { AppletInstance } from "./types";

export class AppletsClient {
  constructor(
    public appAgentClient: AppAgentClient,
    public roleName: string,
    public zomeName: string = "applets"
  ) {}

  async getAppletsInstances(): Promise<RecordBag<AppletInstance>> {
    return this.callZome("get_applets_instances", null);
  }

  async getAppletInstance(
    appletInstanceHash: EntryHash
  ): Promise<EntryRecord<AppletInstance> | undefined> {
    return this.callZome("get_applet_instance", appletInstanceHash);
  }

  async registerAppletInstance(applet: AppletInstance): Promise<EntryHash> {
    return this.callZome("register_applet_instances", applet);
  }

  async federateApplet(
    appletInstanceHash: EntryHash,
    groupDnaHash: DnaHash
  ): Promise<ActionHash> {
    return this.callZome("federate_applet", {
      applet_instance_hash: appletInstanceHash,
      group_dna_hash: groupDnaHash,
    });
  }

  async getFederatedGroups(appletInstanceHash: EntryHash): Promise<DnaHash[]> {
    return this.callZome("get_federated_groups", appletInstanceHash);
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
