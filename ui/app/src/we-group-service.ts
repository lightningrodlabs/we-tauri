import { CellClient } from "@holochain-open-dev/cell-client";
import { WeInfo } from "@lightningrodlabs/we-applet";

export class WeGroupService {
  constructor(public cellClient: CellClient, protected zomeName = "we") {}

  async getInfo(): Promise<WeInfo> {
    return this.callZome("get_info", null);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
