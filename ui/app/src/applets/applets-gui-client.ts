import {
  AppAgentCallZomeRequest,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import { AppletGui } from "./types";

export class AppletsGuiClient {
  constructor(
    public appAgentClient: AppAgentClient,
    public roleName: string,
    public zomeName: string = "applets_gui"
  ) {}

  /**
   * Commits the gui file as a private entry to the source chain of the lobby DNA
   *
   * @param appletGui
   * @returns
   */
  async commitGuiFile(appletGui: AppletGui): Promise<void> {
    return this.callZome("commit_gui_file", appletGui);
  }

  async queryAppletGui(devhubHappReleaseHash: EntryHash): Promise<AppletGui> {
    return this.callZome("query_applet_gui", devhubHappReleaseHash);
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
