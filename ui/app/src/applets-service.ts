import { CellClient } from "@holochain-open-dev/cell-client";
import { EntryHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { Applet, AppletGui, PlayingApplet, RegisterAppletInput } from "./types";

export class AppletsService {
  constructor(public cellClient: CellClient, protected lobbyClient: CellClient, protected zomeName = "applets", protected lobbyZomeName = "applet_guis") {}

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
    appletGui: AppletGui
  ): Promise<EntryHashB64> {
    return this.callLobbyZome("commit_gui_file", appletGui);
  }

  async registerApplet(
    appletAgentPubKey: AgentPubKeyB64,
    applet: Applet,
  ): Promise<EntryHashB64> {
    return this.callZome("register_applet", { appletAgentPubKey, applet });
  }

  async queryAppletGui(devhubHappReleaseHash: EntryHashB64): Promise<AppletGui> {
    return this.callLobbyZome("query_applet_gui", devhubHappReleaseHash);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }

  private callLobbyZome(fn_name: string, payload: any) {
    return this.lobbyClient.callZome(this.lobbyZomeName, fn_name, payload);
  }
}
