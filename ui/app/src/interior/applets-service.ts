import { CellClient } from "@holochain-open-dev/cell-client";
import { HoloHashMap } from "@holochain-open-dev/utils";
import { AgentPubKey, EntryHash } from "@holochain/client";
import { Applet, PlayingApplet, RegisterAppletInput } from "./types";

export class AppletsService {
  constructor(public cellClient: CellClient, protected zomeName = "applets") {}

  async getAllApplets(): Promise<[EntryHash, Applet][]> {
    return this.callZome("get_all_applets", null);
  }

  async getAppletsIAmPlaying(): Promise<[EntryHash, PlayingApplet][]> {
    return this.callZome("get_applets_i_am_playing", null);
  }

  async createApplet(registerAppletInput: RegisterAppletInput): Promise<EntryHash> {
    return this.callZome("create_applet", registerAppletInput);
  }

  async commitGuiFile(
    guiFile: Uint8Array
  ): Promise<EntryHash> {
    return this.callZome("commit_gui_file", guiFile);
  }

  async registerApplet(
    appletAgentPubKey: AgentPubKey,
    applet: Applet,
  ): Promise<EntryHash> {
    return this.callZome("register_applet", { appletAgentPubKey, applet });
  }

  async queryAppletGui(guiHash: EntryHash): Promise<Uint8Array> {
    return this.callZome("query_applet_gui", guiHash);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
