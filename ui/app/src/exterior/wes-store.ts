import {
  serializeHash,
  deserializeHash,
  HoloHashMap,
} from '@holochain-open-dev/utils';
import { CellClient, HolochainClient } from "@holochain-open-dev/cell-client";
import { writable, Writable, derived, Readable, get } from "svelte/store";

import { WeStore } from "../interior/we-store";
import {
  AdminWebsocket,
  InstalledAppInfo,
  AppStatusFilter,
  MembraneProof,
  ActionHash,
  DnaHash,
  AgentPubKey,
} from "@holochain/client";
import {
  MembraneInvitationsService,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { encode } from "@msgpack/msgpack";

export class WesStore {
  /** Private */
  public membraneInvitationsStore: MembraneInvitationsStore;

  private _wes: Writable<HoloHashMap<WeStore>> = writable(new HoloHashMap<WeStore>()); // keys of type DnaHash
  private _selectedWeId: Writable<DnaHash | undefined> = writable(undefined);

  /** Static info */
  public weStore(weId: DnaHash): Readable<WeStore> {
    return derived(this._wes, (wes) => wes.get(weId));
  }

  public get selectedWeId(): Readable<DnaHash | undefined> {
    return derived(this._selectedWeId, (id) => id);
  }

  public myAgentPubKey: AgentPubKey;

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket,
    protected weAppInfo: InstalledAppInfo,
  ) {
    const lobbyCell = weAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    const cellClient = new CellClient(holochainClient, lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(cellClient);
    this.myAgentPubKey = lobbyCell.cell_id[1];
  }



  private originalWeDnaHash(): DnaHash {
    const appInfo = this.weAppInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    return weCell.cell_id[0];
  }

  public setWeId(id: DnaHash | undefined) {
    this._selectedWeId.set(id);
  }

  // sorts the Wes alphabetically
  public async fetchWes(): Promise<Readable<HoloHashMap<WeStore>>> {
    let active = await this.adminWebsocket.listApps({
      status_filter: AppStatusFilter.Running,
    });

    const activeWes = active.filter((app) =>
      app.installed_app_id.startsWith("we-")
    ).sort((a, b) => a.installed_app_id.localeCompare(b.installed_app_id)); // sorting alphabetically

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
  public async createWe(name: string, logo: string): Promise<DnaHash> {
    const timestamp = Date.now();

    const newWeHash = await this.installWe(name, logo, timestamp);

    const appInfo = this.weAppInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const weDnaHash = weCell.cell_id[0];

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

    return newWeHash;
  }

  public async joinWe(
    invitationActionHash: ActionHash,
    name: string,
    logo: string,
    timestamp: number
  ) {
    await this.installWe(name, logo, timestamp);

    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
  }

  public async removeInvitation(invitationActionHash: ActionHash) {
    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
  }

  private async installWe(
    name: string,
    logo: string,
    timestamp: number
  ): Promise<DnaHash> {
    const appInfo = this.weAppInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const myAgentPubKey = serializeHash(weCell.cell_id[1]);
    const weDnaHash = weCell.cell_id[0];

    const properties = {
      logo_src: logo,
      name: name,
      timestamp,
    };

    // Create the We cell
    const newWeHash = await this.adminWebsocket.registerDna({
      hash: weDnaHash as Buffer,
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
      wes.put(newWeCell.cell_id[0], store);
      return wes;
    });

    return newWeHash;
  }
}
