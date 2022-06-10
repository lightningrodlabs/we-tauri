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
  MembraneProof,
} from "@holochain/client";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import {
  MembraneInvitationsService,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { encode } from "@msgpack/msgpack";

export class WesStore {
  /** Private */
  public membraneInvitationsStore: MembraneInvitationsStore;

  private _wes: Writable<Record<DnaHashB64, WeStore>> = writable({});

  /** Static info */
  public weStore(weId: DnaHashB64): Readable<WeStore> {
    return derived(this._wes, (wes) => wes[weId]);
  }

  public myAgentPubKey: AgentPubKeyB64;

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket
  ) {
    const lobbyCell = holochainClient.cellDataByRoleId("lobby")!;
    const cellClient = holochainClient.forCell(lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(cellClient);
    this.myAgentPubKey = serializeHash(lobbyCell.cell_id[1]);
  }

  private originalWeDnaHash(): DnaHashB64 {
    const appInfo = this.holochainClient.appInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    return serializeHash(weCell.cell_id[0]);
  }

  public async fetchWes(): Promise<Readable<Record<DnaHashB64, WeStore>>> {
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
        new WeStore(
          cellClient,
          this.originalWeDnaHash(),
          this.adminWebsocket,
          this.membraneInvitationsStore.service
        ),
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
  public async createWe(name: string, logo: string) {
    const timestamp = Date.now();

    const newWeHash = await this.installWe(name, logo, timestamp);

    const appInfo = this.holochainClient.appInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const weDnaHash = serializeHash(weCell.cell_id[0]);

    const properties = {
      logo_src: logo,
      name: name,
      timestamp,
    };
    await this.membraneInvitationsStore.service.createCloneDnaRecipe({
      originalDnaHash: weDnaHash,
      uid: undefined,
      properties: encode(properties),
      resultingDnaHash: newWeHash,
    });
  }

  public async joinWe(
    invitationHeaderHash: HeaderHashB64,
    name: string,
    logo: string,
    timestamp: number
  ) {
    await this.installWe(name, logo, timestamp);

    await this.membraneInvitationsStore.removeInvitation(invitationHeaderHash);
  }

  private async installWe(
    name: string,
    logo: string,
    timestamp: number
  ): Promise<DnaHashB64> {
    const appInfo = this.holochainClient.appInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const myAgentPubKey = serializeHash(weCell.cell_id[1]);
    const weDnaHash = serializeHash(weCell.cell_id[0]);

    const properties = {
      logo_src: logo,
      name: name,
      timestamp,
    };

    // Create the We cell
    const newWeHash = await this.adminWebsocket.registerDna({
      hash: deserializeHash(weDnaHash) as Buffer,
      uid: undefined,
      properties,
    });

    const installed_app_id = `we-${name}-${timestamp}`;
    const newAppInfo: InstalledAppInfo = await this.adminWebsocket.installApp({
      installed_app_id,
      agent_key: deserializeHash(myAgentPubKey) as Buffer,
      dnas: [
        {
          hash: newWeHash,
          role_id: name,
        },
      ],
    });
    const enabledResult = await this.adminWebsocket.enableApp({
      installed_app_id,
    });

    const newWeCell = newAppInfo.cell_data[0];
    const cellClient = new CellClient(this.holochainClient, newWeCell);

    const store = new WeStore(
      cellClient,
      weDnaHash,
      this.adminWebsocket,
      this.membraneInvitationsStore.service
    );

    this._wes.update((wes) => {
      wes[serializeHash(newWeCell.cell_id[0])] = store;
      return wes;
    });

    return serializeHash(newWeHash);
  }
}