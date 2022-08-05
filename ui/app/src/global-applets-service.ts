import { CellClient } from "@holochain-open-dev/cell-client";
import { EntryHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { AgentPubKey, EntryHash } from "@holochain/client";
import { Applet, AppletGui, PlayingApplet, RegisterAppletInput } from "./types";

export class GlobalAppletsService {
  constructor(protected lobbyClient: CellClient) {}


  async getAllApplets(cellClient: CellClient): Promise<[EntryHash, Applet][]> {
    return cellClient.callZome("applets", "get_all_applets", null);
  }

  async getAppletsIAmPlaying(cellClient: CellClient): Promise<[EntryHash, PlayingApplet][]> {
    return cellClient.callZome("applets", "get_applets_i_am_playing", null);
  }


  async createApplet(cellClient: CellClient, registerAppletInput: RegisterAppletInput): Promise<EntryHash> {
    return cellClient.callZome("applets", "create_applet", registerAppletInput);
  }


  async registerApplet(
    cellClient: CellClient,
    appletAgentPubKey: AgentPubKey,
    applet: Applet,
  ): Promise<EntryHash> {
    return cellClient.callZome("applets", "register_applet", { appletAgentPubKey, applet });
  }

  /**
   * Commits the gui file as a private entry to the source chain of the lobby DNA
   *
   * @param appletGui
   * @returns
   */
  async commitGuiFile(
    appletGui: AppletGui
  ): Promise<void> {
    return this.callLobbyZome("commit_gui_file", appletGui);
  }


  async queryAppletGui(devhubHappReleaseHash: EntryHash): Promise<AppletGui> {
    return this.callLobbyZome("query_applet_gui", devhubHappReleaseHash);
  }


  private async callLobbyZome(fn_name: string, payload: any): Promise<any> {
    return this.lobbyClient.callZome("applet_guis", fn_name, payload);
  }
}
