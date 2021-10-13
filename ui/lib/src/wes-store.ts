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

import { WeService } from "./we.service";
import { WeStore } from "./we-store";
import { Dictionary, GameEntry, Players } from "./types";
import {
  AppWebsocket,
  AdminWebsocket,
  InstalledAppInfo,
  AppStatusFilter,
} from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";

export interface WesState {
  wes: Dictionary<WeStore>;
  selectedWeId: string | undefined;
}

export class WesStore {
  /** Private */
  private wesStore: Writable<WesState> = writable({
    wes: {},
    selectedWeId: undefined,
  });

  /** Static info */
  myAgentPubKey: AgentPubKeyB64 = ""; //TODO, fix based on assumption of agent key across we
  /** Readable stores */
  public wes: Readable<Dictionary<WeStore>> = derived(
    this.wesStore,
    (i) => i.wes
  );
  public selectedWe: Readable<WeStore | undefined> = derived(
    this.wesStore,
    (i) => (i.selectedWeId ? i.wes[i.selectedWeId] : undefined)
  );
  public selectedWeId: Readable<string | undefined> = derived(
    this.wesStore,
    (s) => s.selectedWeId
  );

  constructor(
    protected appWebsocket: AppWebsocket,
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
    const promises = activeWes.map(async (we) => {
      const store = await this.createWeStore(we);
      return [we.installed_app_id, store] as [string, WeStore];
    });
    const stores = await Promise.all(promises);

    this.wesStore.update((s) => {
      for (const [weId, store] of stores) {
        s.wes[weId] = store;
      }
      return s;
    });
  }

  private async createWeStore(app: InstalledAppInfo): Promise<WeStore> {
    const weId = app.installed_app_id;

    const cellData = app.cell_data[0];
    const cellClient = new HolochainClient(this.appWebsocket, cellData);

    return WeStore.create(weId, this.adminWebsocket, cellClient);
  }

  /**
   * Clones the We DNA with a new unique weId as its UID
   * @param weId
   * @param weLogo
   */
  public async createWe(weId: string, weLogo: string) {
    const appInfo = await this.appWebsocket.appInfo({
      installed_app_id: "we-self",
    });

    const installedCells = appInfo.cell_data;
    const myAgentPubKey = serializeHash(installedCells[0].cell_id[1]);
    const weDnaHash = serializeHash(installedCells[0].cell_id[0]);
    console.log("new WE ", weId);

    // Create the We cell

    const newWeHash = await this.adminWebsocket.registerDna({
      hash: deserializeHash(weDnaHash) as Buffer,
      uid: weId,
      properties: {
        logo_url: weLogo,
      },
    });

    const installed_app_id = `we-${weId}`;
    const newAppInfo: InstalledAppInfo = await this.adminWebsocket.installApp({
      installed_app_id,
      agent_key: deserializeHash(myAgentPubKey) as Buffer,
      dnas: [
        {
          hash: newWeHash,
          nick: weId,
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

    // TODO: create the Who cell

    const cellClient = new HolochainClient(
      this.appWebsocket,
      newAppInfo.cell_data[0]
    );

    const store = await WeStore.create(
      weId,
      this.adminWebsocket,
      cellClient,
      whoCellData
    );

    this.wesStore.update((wes) => {
      wes.wes[weId] = store;
      wes.selectedWeId = weId;
      return wes;
    });
  }

  public selectWe(weId: string | undefined) {
    this.wesStore.update((s) => {
      s.selectedWeId = weId;
      return s;
    });
  }
}
