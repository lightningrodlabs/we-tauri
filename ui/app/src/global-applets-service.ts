import { CellClient } from "@holochain-open-dev/cell-client";
import { ActionHash, AgentPubKey, DnaHash, EntryHash } from "@holochain/client";
import { Applet, AppletGui, PlayingApplet, RegisterAppletInput } from "./types";

export class GlobalAppletsService {
  constructor(protected lobbyClient: CellClient) {}


  async getAllApplets(cellClient: CellClient): Promise<[EntryHash, Applet, DnaHash[]][]> {
    return cellClient.callZome("applets_coordinator", "get_all_applets", null);
  }

  async getAppletsIAmPlaying(cellClient: CellClient): Promise<[EntryHash, PlayingApplet, DnaHash[]][]> {
    return cellClient.callZome("applets_coordinator", "get_applets_i_am_playing", null);
  }


  async createApplet(cellClient: CellClient, registerAppletInput: RegisterAppletInput): Promise<EntryHash> {
    return cellClient.callZome("applets_coordinator", "create_applet", registerAppletInput);
  }


  async registerApplet(
    cellClient: CellClient,
    appletAgentPubKey: AgentPubKey,
    applet: Applet,
  ): Promise<EntryHash> {
    return cellClient.callZome("applets_coordinator", "register_applet", { appletAgentPubKey, applet });
  }

  async federateApplet(
    cellClient: CellClient,
    appletHash: EntryHash,
    weGroupDnaHash: DnaHash,
  ): Promise<ActionHash> {
    return cellClient.callZome("applets_coordinator", "federate_applet", { appletHash, weGroupDnaHash });
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
    return this.lobbyClient.callZome("applet_guis_coordinator", fn_name, payload);
  }
}
