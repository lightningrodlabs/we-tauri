import {
  EntryHashB64,
  HeaderHashB64,
  AgentPubKeyB64,
  DnaHashB64,
  serializeHash,
  deserializeHash,
} from "@holochain-open-dev/core-types";
import { CellClient } from "@holochain-open-dev/cell-client";
import { writable, Writable, derived, Readable, get } from "svelte/store";

import { WeStore } from "../interior/we-store";
import {
  AdminWebsocket,
  InstalledAppInfo,
  AppStatusFilter,
} from "@holochain/client";
import { HolochainClient } from "@holochain-open-dev/cell-client";

export interface WesState {
  wes: Record<DnaHashB64, WeStore>;
}

export class WesStore {
  /** Private */
  private _wes: Writable<Record<DnaHashB64, WeStore>> = writable({});

  /** Static info */
  public weStore(weId: DnaHashB64): Readable<WeStore> {
    return derived(this._wes, (wes) => wes[weId]);
  }

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket
  ) {}

  public async fetchWes() {
    let active = await this.adminWebsocket.listApps({
      status_filter: AppStatusFilter.Running,
    });

    console.log("installed apps", active);
    const activeWes = active.filter((app) =>
      app.installed_app_id.startsWith("we-")
    );
    const stores = activeWes.map((we) => {
      const weCell = we.cell_data[0];

      const cellClient = new CellClient(this.holochainClient, weCell);

      return [
        serializeHash(weCell.cell_id[0]),
        new WeStore(cellClient, this.adminWebsocket),
      ] as [string, WeStore];
    });

    this._wes.update((s) => {
      for (const [weId, store] of stores) {
        s[weId] = store;
      }
      return s;
    });

    return derived(this._wes, (i) => i);
  }

  /**
   * Clones the We DNA with a new unique weId as its UID
   * @param weName
   * @param weLogo
   */
  public async createWe(weName: string, weLogo: string) {
    const appInfo = this.holochainClient.appInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const myAgentPubKey = serializeHash(weCell.cell_id[1]);
    const weDnaHash = serializeHash(weCell.cell_id[0]);
    console.log("new WE ", weName);

    // Create the We cell

    const newWeHash = await this.adminWebsocket.registerDna({
      hash: deserializeHash(weDnaHash) as Buffer,
      uid: weName,
      properties: {
        logo_src: weLogo,
        name: weName,
      },
    });

    const installed_app_id = `we-${weName}`;
    const newAppInfo: InstalledAppInfo = await this.adminWebsocket.installApp({
      installed_app_id,
      agent_key: deserializeHash(myAgentPubKey) as Buffer,
      dnas: [
        {
          hash: newWeHash,
          role_id: weName,
        },
      ],
    });
    const enabledResult = await this.adminWebsocket.enableApp({
      installed_app_id,
    });
    console.log(
      "with dna",
      serializeHash(enabledResult.app.cell_data[0].cell_id[0])
    );

    const newWeCell = newAppInfo.cell_data[0];
    const cellClient = new CellClient(this.holochainClient, newWeCell);

    const store = new WeStore(cellClient, this.adminWebsocket);

    this._wes.update((wes) => {
      wes[serializeHash(newWeCell.cell_id[0])] = store;
      return wes;
    });
  }
}
