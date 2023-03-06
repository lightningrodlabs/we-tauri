import {
  AppAgentCallZomeRequest,
  AppAgentClient,
  EntryHash,
} from "@holochain/client";
import { GuiFile } from "./types";

export class AppletsGuiClient {
  constructor(
    public appAgentClient: AppAgentClient,
    public roleName: string,
    public zomeName: string = "applet_guis"
  ) {}

  /**
   * Commits the gui file as a private entry to the source chain of the lobby DNA
   *
   * @param appletGui
   * @returns
   */
  async commitGuiFile(
    appletReleaseHash: EntryHash,
    guiFile: GuiFile
  ): Promise<void> {
    return this.callZome("commit_gui_file", {
      devhub_happ_release_hash: appletReleaseHash,
      gui: guiFile,
    });
  }

  async queryAppletGui(devhubHappReleaseHash: EntryHash): Promise<GuiFile> {
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
