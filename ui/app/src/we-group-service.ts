import { AppAgentWebsocket, CellId } from "@holochain/client";
import { WeInfo } from "@neighbourhoods/nh-launcher-applet";

export class WeGroupService {
  constructor(public client: AppAgentWebsocket, protected cellId: CellId, protected zomeName = "we_coordinator") {}

  async getInfo(): Promise<WeInfo> {
    return this.client.callZome({
      cell_id: this.cellId,
      zome_name: "we",
      fn_name: "get_info",
      payload: null
    });
  }

  private callZome(fn_name: string, payload: any) {
    return this.client.callZome({
      cell_id: this.cellId,
      zome_name: this.zomeName,
      fn_name,
      payload
  });
  }
}
