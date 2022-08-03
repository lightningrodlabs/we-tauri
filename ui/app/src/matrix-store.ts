

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

import { WeGroupStore } from "./we-group-store";
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
import { GroupStore } from "./we-group-store";
import { AppletStore } from "./applet-store";
import { HoloHashMap } from "./holo-hash-map-temp";
import { AppletTypeStore } from "./applet-type-store";
import { AppletRenderers } from "@lightningrodlabs/we-applet";
import { WeInfo } from "./interior/types";
import { DashboardMode } from "./types";


/**Data of a group */
export interface WeGroupData {
  info: WeGroupInfo,
  store: GroupStore,
}

/**Info of a group */
export interface WeGroupInfo {
  info: WeInfo,
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
  logoSrc: string, // logo of the applet
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
  logoSrc: string,
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

  private _matrix: Writable<HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>> =
    writable(new HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>()); // We Group DnaHashes as keys

  private _groups: Writable<HoloHashMap<GroupStore>> =
    writable(new HoloHashMap<GroupStore>()); // We Group DnaHashes as keys

  private _installedAppletClasses: Writable<HoloHashMap<AppletClassInfo>> =
    writable(new HoloHashMap<AppletClassInfo>()); // devhub release entry hashes of Applets as keys

  private _appletRenderers: HoloHashMap<AppletRenderers> =
    writable(new HoloHashMap<AppletRenderers>()); // devhub release entry hashes of Applets as keys --> no duplicate applet renderers for the same applet class

  private _dashboardMode: Writable<DashboardMode> = writable("mainHome");


  public matrix(): Readable<HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>> {
    return derived(this._matrix, (matrix) => matrix);
  }

  public weGroupInfos(): Readable<HoloHashMap<WeGroupInfo>> {
    return derived(this._matrix, (matrix) => {
      let groupInfos = new HoloHashMap<WeGroupInfo>();
      matrix.entries().forEach(([groupId, [groupData, _appletInstanceInfos]]) => {
        groupInfos.put(groupId, groupData.info)
      })
      return groupInfos;
    })
  }

  public appletClasses(): Readable<HoloHashMap<AppletClassInfo>> {
    return derived(this._installedAppletClasses, (appletClasses) => appletClasses);
  }

  public setDashboardMode(mode: DashboardMode) {
    this._dashboardMode.set(mode);
  }

  public getDashboardMode(): Readable<DashboardMode> {
    return derived(this._dashboardMode, (mode) => mode);
  }

  private _canvasState: Writable<CanvasState> = writable()

  // private _wes: Writable<Record<DnaHashB64, WeGroupStore>> = writable({});
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
  public getGroupInfosForAppletClass(devHubReleaseHash: EntryHash): Readable<WeGroupInfo[]> {
    // todo
    return derived(this._matrix, (matrix) => {
      matrix.values().filter(([groupInfo, appletInfos]) => {
        appletInfos.map((appletInfo) => appletInfo.devHubReleaseHash)
          .includes(devHubReleaseHash)
      }).map(([groupData, _appletDatas]) => groupData.info)});
  }


  public groupStore(groupDnaHash: DnaHash): Readable<GroupStore> {
    // todo
    return derived(this._matrix, (matrix) => matrix.get(groupDnaHash)[0].store);
  }



  /**Fetches a generic renderer for a given  */
  public fetchGenericRenderer(devHubReleaseHash: EntryHash): genericAppletRenderer {
    // 1. isolate an Applet EntryHash that has this devHubReleaseHash

    // 2. fetch the Renderer for this Applet (see fetchAppletRenderers() of we-store.ts)

    return {};
  }


  public fetchAllAppletsForWeGroup(weGroupId: DnaHash): Promise<Readable<HoloHashMap<Applet>>> {

    const allApplets = await this.appletsService.getAllApplets();
  }


  /** Static info */
  public weStore(weId: DnaHashB64): Readable<WeGroupStore> {
    return derived(this._wes, (wes) => wes[weId]);
  }

  public get selectedWeId(): Readable<DnaHashB64 | undefined> {
    return derived(this._selectedWeId, (id) => id);
  }

  public myAgentPubKey: AgentPubKeyB64;

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket,
    protected weParentAppInfo: InstalledAppInfo,
  ) {
    const lobbyCell = weParentAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    const cellClient = new CellClient(holochainClient, lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(cellClient);
    this.myAgentPubKey = serializeHash(lobbyCell.cell_id[1]);
  }



  private originalWeDnaHash(): DnaHashB64 {
    const weParentAppInfo = this.weParentAppInfo;

    const weCell = weParentAppInfo.cell_data.find((c) => c.role_id === "we")!;
    return serializeHash(weCell.cell_id[0]);
  }


  // sorts the Wes alphabetically
  public async fetchWeGroups(): Promise<Readable<HoloHashMap<WeGroupData>>> { // DnaHashes as keys

    // 1. fetch all the we group apps
    let allWeGroups = await this.adminWebsocket.listApps({});

    // const activeWes = active.filter((app) =>
    //   app.installed_app_id.startsWith("we-")
    // ).sort((a, b) => a.installed_app_id.localeCompare(b.installed_app_id)); // sorting alphabetically

    // 2. create a WeGroupStore for each we group app
    const stores = allWeGroups.map((group) => {
      const weGroupCell = group.cell_data[0];
      const cellClient = new CellClient(this.holochainClient, weGroupCell);

      return [
        serializeHash(weCell.cell_id[0]),
        new WeGroupStore(
          cellClient,
          this.originalWeDnaHash(),
          this.adminWebsocket,
          this.membraneInvitationsStore.service
        ),
      ] as [string, WeGroupStore];
    });

    // 3. update the matrix
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

    const appInfo = this.weParentAppInfo;

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
    const weParentAppInfo = this.weParentAppInfo;

    const weCell = weParentAppInfo.cell_data.find((c) => c.role_id === "we")!;
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

    const lobbyCell = weParentAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    const lobbyClient = new CellClient(this.holochainClient, lobbyCell);

    const store = new WeGroupStore(
      cellClient,
      lobbyClient,
      weDnaHash,
      this.adminWebsocket,
      this.membraneInvitationsStore.service
    );

    this._matrix.update((matrix) => {

      const weGroupId = newWeCell.cell_id[0]; // DnaHash of the newly created We Group Cell

      const weInfo: WeInfo = {
        logo_src: properties.logo_src,
        name: properties.name,
      };

      const weGroupInfo: WeGroupInfo = {
        info: weInfo,
        dna_hash: weGroupId,
        installed_app_id,
        status: enabledResult.app.status,
      };

      const weGroupData: WeGroupData = {
        info: weGroupInfo,
        store,
      };
      if (!matrix.get(weGroupId)) {
        matrix.put(weGroupId, [weGroupData, []])
      }

      return matrix;
    });

    return serializeHash(newWeHash);
  }
}
