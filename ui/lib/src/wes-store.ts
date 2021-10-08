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

  public adminWebsocket: AdminWebsocket | null = null;
  public appWebsocket: AppWebsocket | null = null;

  /** Static info */
  myAgentPubKey: AgentPubKeyB64 = ""; //TODO, fix based on assumption of agent key across we
  weDnaHash: DnaHashB64 = "";
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

  public async newWe(weId: string, weLogo: string) {
    console.log("new WE ", weId);

    const newWeHash = await this.adminWebsocket!.registerDna({
      hash: new Buffer(deserializeHash(this.weDnaHash)),
      uid: weId,
    });

    const installed_app_id = `we-${weId}`;
    const appInfo: InstalledAppInfo = await this.adminWebsocket!.installApp({
      installed_app_id,
      agent_key: new Buffer(deserializeHash(this.myAgentPubKey)),
      dnas: [
        {
          hash: newWeHash,
          nick: weId,
        },
      ],
    });
    const enabledResult = await this.adminWebsocket!.enableApp({
      installed_app_id,
    });
    console.log(
      "with dna",
      serializeHash(enabledResult.app.cell_data[0].cell_id[0])
    );

    const cellClient = new HolochainClient(
      this.appWebsocket!,
      appInfo.cell_data[0]
    );
    this.addWe(weId, weLogo, cellClient);
  }

  public addWe(
    weId: string,
    weLogo: string,
    cellClient: CellClient,
    zomeName = "hc_zome_we"
  ) {
    console.log("adding WE ", weId);

    this.wesStore.update((wes) => {
      wes.wes[weId] = new WeStore(
        weId,
        this.adminWebsocket!,
        cellClient,
        weLogo
      );
      wes.wes[weId].fetchPlayers();
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
