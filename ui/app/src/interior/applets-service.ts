import { CellClient } from "@holochain-open-dev/cell-client";
import { EntryHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { Applet, PlayingApplet, RegisterAppletInput } from "./types";

export class AppletsService {
  constructor(public cellClient: CellClient, protected zomeName = "applets") {}

  async getAllApplets(): Promise<Record<EntryHashB64, Applet>> {
    return this.callZome("get_all_applets", null);
  }

  async getAppletsIAmPlaying(): Promise<Record<EntryHashB64, PlayingApplet>> {
    return this.callZome("get_applets_i_am_playing", null);
  }

  async createApplet(registerAppletInput: RegisterAppletInput): Promise<EntryHashB64> {
    return this.callZome("create_applet", registerAppletInput);
  }

  async commitGuiFile(
    guiFile: Uint8Array
  ): Promise<EntryHashB64> {
    return this.callZome("commit_gui_file", guiFile);
  }

  async registerApplet(
    appletAgentPubKey: AgentPubKeyB64,
    applet: Applet,
  ): Promise<EntryHashB64> {
    return this.callZome("register_applet", { appletAgentPubKey, applet });
  }

  async queryAppletGui(guiHash: EntryHashB64): Promise<Uint8Array> {
    return this.callZome("query_applet_gui", guiHash);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
