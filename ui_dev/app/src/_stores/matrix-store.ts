

import {
  EntryHashB64,
  HeaderHashB64,
  AgentPubKeyB64,
  DnaHashB64,
  serializeHash,
  deserializeHash,
} from "@holochain-open-dev/core-types";
import { CellClient, HolochainClient } from "@holochain-open-dev/cell-client";
import { writable, Writable, derived, Readable, get } from "svelte/store";

import { WeStore } from "../interior/we-store";
import {
  AdminWebsocket,
  InstalledAppInfo,
  AppStatusFilter,
  MembraneProof,
  InstalledAppInfoStatus,
  DnaHash,
  EntryHash,
  AgentPubKey,
} from "@holochain/client";
import {
  MembraneInvitationsService,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { encode } from "@msgpack/msgpack";
import { GroupStore } from "./we-store";
import { AppletStore } from "./applet-store";
import { HoloHashMap } from "./holo-hash-map-temp";
import { AppletTypeStore } from "./applet-type-store";
import { AppletRenderers } from "@lightningrodlabs/we-applet";
import { WeInfo } from "../interior/types";


/**Data of a group */
export interface GroupData {
  info: GroupInfo,
  store: GroupStore,
}

/**Info of a group */
export interface GroupInfo {
  dna_hash: DnaHash, // dna hash of the group's we dna
  installed_app_id: string,
  status: InstalledAppInfoStatus,
}

/**Data of a specific instance of an installed Applet */
export interface AppletInstanceData {
  info: AppletInstanceInfo,
  renderers: AppletRenderers,
}

/**Info about a specific instance of an installed Applet */
export interface AppletInstanceInfo {
  appletId: EntryHash, // hash of the Applet entry in the applets zome of the group's we dna
  devHubReleaseHash: EntryHash, // devhub release hash --> allows to recognize applets of the same base dna across groups
  installedAppId: string,       // installed_app_id in the conductor
  status: InstalledAppInfoStatus, // status of the app in the conductor
}

/**Data of a type of Applet of which one or many may be installed */
export interface AppletClassData {
  info: AppletClassInfo,
  renderers: AppletRenderers,
}

/**Info about a type of Applet of which one or many may be installed */
export interface AppletClassInfo {
  devHubReleaseHash: EntryHash,
  name: string,
}


export interface InstalledAppletInfo {
  weGroupInfo: WeInfo,
  weGroupId: DnaHash,
  appInfo: InstalledAppInfo,
}


export interface CanvasState {
  type: "main-home" | "group-home" | "applet-group-instance" | "applet-class-renderer",
  payload:  | undefined,
}



/**stores the Group/Applet matrix */
export class MatrixStore {
  /** Private */
  public membraneInvitationsStore: MembraneInvitationsStore;

  private _matrix: Writable<HoloHashMap<[GroupData, AppletInstanceInfo[]]>> =
    writable(new HoloHashMap<[GroupData, AppletInstanceData[]]>()); // We Group DnaHashes as keys

  private _groups: Writable<HoloHashMap<GroupStore>> =
    writable(new HoloHashMap<GroupStore>()); // We Group DnaHashes as keys

  private _installedAppletClasses: Writable<HoloHashMap<AppletClassInfo>> =
    writable(new HoloHashMap<AppletClassInfo>()); // devhub release entry hashes of Applets as keys

  private _appletRenderers: HoloHashMap<AppletRenderers> =
    writable(new HoloHashMap<AppletRenderers>()); // devhub release entry hashes of Applets as keys --> no duplicate applet renderers for the same applet class



  private _canvasState: Writable<CanvasState> = writable()

  // private _wes: Writable<Record<DnaHashB64, WeStore>> = writable({});
  // private _selectedWeId: Writable<DnaHashB64 | undefined> = writable(undefined);


  public getProfileForWeGroupAgent(weGroupId: DnaHash, weAgentId: AgentPubKey) {
    // do stuff
  }


  /**Gets an array of all AppletInfo of the applets installed for the specified group */
  public getAppletInstanceInfosForGroup(groupDnaHash: DnaHash): Readable<AppletInstanceInfo[]> {
    // todo
    return derived(this._matrix, (matrix) => {
      matrix.get(groupDnaHash)[1];
    })
  }


  /**Gets an array of all GroupInfo of the groups that have the specified applet installed */
  public getGroupInfosForAppletClass(devHubReleaseHash: EntryHash): Readable<GroupInfo[]> {
    // todo
    return derived(this._matrix, (matrix) => {
      matrix.values().filter(([groupInfo, appletDatas]) => {
        appletDatas.map((appletData) => appletData.info.devHubReleaseHash)
          .includes(devHubReleaseHash)
      }).map(([groupData, _appletDatas]) => groupData.info)});
  }


  public groupStore(groupDnaHash: DnaHash): Readable<GroupStore> {
    // todo
    return derived(this._matrix, (matrix) => matrix.get(groupDnaHash)[0].store);
  }

  public appletStore(){}

  /**Fetches a generic renderer for a given  */
  public fetchGenericRenderer(devHubReleaseHash: EntryHash): genericAppletRenderer {
    // 1. isolate an Applet EntryHash that has this devHubReleaseHash

    // 2. fetch the Renderer for this Applet (see fetchAppletRenderers() of we-store.ts)

    return {};
  }



  /** Static info */
  public weStore(weId: DnaHashB64): Readable<WeStore> {
    return derived(this._wes, (wes) => wes[weId]);
  }

  public get selectedWeId(): Readable<DnaHashB64 | undefined> {
    return derived(this._selectedWeId, (id) => id);
  }

  public myAgentPubKey: AgentPubKeyB64;

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket,
    protected weAppInfo: InstalledAppInfo,
  ) {
    const lobbyCell = weAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    const cellClient = new CellClient(holochainClient, lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(cellClient);
    this.myAgentPubKey = serializeHash(lobbyCell.cell_id[1]);
  }



  private originalWeDnaHash(): DnaHashB64 {
    const appInfo = this.weAppInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    return serializeHash(weCell.cell_id[0]);
  }

  public setWeId(id: DnaHashB64 | undefined) {
    this._selectedWeId.set(id);
  }

  // sorts the Wes alphabetically
  public async fetchWes(): Promise<Readable<Record<DnaHashB64, WeStore>>> {
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
  public async createWe(name: string, logo: string): Promise<DnaHashB64> {
    const timestamp = Date.now();

    const newWeHash = await this.installWe(name, logo, timestamp);

    const appInfo = this.weAppInfo;

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

    return newWeHash;
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

  public async removeInvitation(invitationHeaderHash: HeaderHashB64) {
    await this.membraneInvitationsStore.removeInvitation(invitationHeaderHash);
  }

  private async installWe(
    name: string,
    logo: string,
    timestamp: number
  ): Promise<DnaHashB64> {
    const appInfo = this.weAppInfo;

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
