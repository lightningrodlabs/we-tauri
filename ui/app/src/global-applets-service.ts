import { ActionHash, AgentPubKey, DnaHash, EntryHash, CellId, AppAgentWebsocket } from "@holochain/client";
import { Applet, AppletGui, PlayingApplet, RegisterAppletInput } from "./types";

export class GlobalAppletsService {
  constructor(protected appAgentWebsocket: AppAgentWebsocket) {}

  async getAllApplets(cellId: CellId): Promise<[EntryHash, Applet, DnaHash[]][]> {
    return this.appAgentWebsocket.callZome({
      cell_id: cellId,
      zome_name: "applets_coordinator",
      fn_name: "get_all_applets",
      payload: null,
    });
  }

  async getAppletsIAmPlaying(cellId: CellId): Promise<[EntryHash, PlayingApplet, DnaHash[]][]> {
    return this.appAgentWebsocket.callZome({
      cell_id: cellId,
      zome_name: "applets_coordinator",
      fn_name: "get_applets_i_am_playing",
      payload: null,
  });
  }


  async createApplet(cellId: CellId, registerAppletInput: RegisterAppletInput): Promise<EntryHash> {
    return this.appAgentWebsocket.callZome({
      cell_id: cellId,
      zome_name: "applets_coordinator",
      fn_name: "create_applet",
      payload: registerAppletInput
    });
  }


  async registerApplet(
    cellId: CellId,
    appletAgentPubKey: AgentPubKey,
    applet: Applet,
  ): Promise<EntryHash> {
    return this.appAgentWebsocket.callZome({
      cell_id: cellId,
      zome_name: "applets_coordinator",
      fn_name: "register_applet",
      payload: { appletAgentPubKey, applet }
    });
  }

  async federateApplet(
    cellId: CellId,
    appletHash: EntryHash,
    weGroupDnaHash: DnaHash,
  ): Promise<ActionHash> {
    return this.appAgentWebsocket.callZome({
      cell_id: cellId,
      zome_name: "applets_coordinator",
      fn_name: "federate_applet",
      payload: { appletHash, weGroupDnaHash }
    });
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
    return this.appAgentWebsocket.callZome({
      role_name: "lobby",
      zome_name: "applet_guis_coordinator",
      fn_name: "commit_gui_file",
      payload: appletGui
    });
  }


  async queryAppletGui(devhubHappReleaseHash: EntryHash): Promise<AppletGui> {
    return this.appAgentWebsocket.callZome({
      role_name: "lobby",
      zome_name: "applet_guis_coordinator",
      fn_name: "query_applet_gui",
      payload: devhubHappReleaseHash,
    });
  }

}
