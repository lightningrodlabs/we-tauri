

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
import { WeGroupStore } from "./we-group-store";
import { HoloHashMap } from "./holo-hash-map-temp";
import { AppletRenderers } from "@lightningrodlabs/we-applet";
import { WeInfo } from "./interior/types";
import { DashboardMode } from "./types";


/**Data of a group */
export interface WeGroupData {
  info: WeGroupInfo,
  store: WeGroupStore,
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
  devHubHappReleaseHash: EntryHash, // devhub hApp release hash --> allows to recognize applets of the same base dna across groups
  installedAppId: string,       // installed_app_id in the conductor
  status: InstalledAppInfoStatus, // status of the app in the conductor
  logoSrc: string | undefined, // logo of the applet
}

/**Data of a type of Applet of which one or many may be installed */
export interface AppletClassData {
  info: AppletClassInfo,
  renderers: AppletRenderers,
}

/**Info about a type of Applet of which one or many may be installed */
export interface AppletClassInfo {
  devHubHappReleaseHash: EntryHash,
  name: string,
  logoSrc: string | undefined,
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

  private _matrix: Writable<HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>> = // We Group DnaHashes as keys
    writable(new HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>());           // AppletInstanceInfo are only the one's that the agent has joined,
                                                                                // not the ones added to the We by someone else but not installed yet

  private _newAppletInstances: Writable<HoloHashMap<AppletInstanceInfo[]>> =  // We Group DnaHashes as keys
    writable(new HoloHashMap<AppletClassInfo[]>());                           // Applet instances that have been added to the we group by someone else
                                                                              // but aren't installed locally yet by the agent.

  private _groups: Writable<HoloHashMap<WeGroupStore>> =
    writable(new HoloHashMap<WeGroupStore>()); // We Group DnaHashes as keys

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
        appletInfos.map((appletInfo) => appletInfo.devHubHappReleaseHash)
          .includes(devHubReleaseHash)
      }).map(([groupData, _appletDatas]) => groupData.info)});
  }


  public groupStore(groupDnaHash: DnaHash): Readable<WeGroupStore> {
    // todo
    return derived(this._matrix, (matrix) => matrix.get(groupDnaHash)[0].store);
  }



  // /**Fetches a generic renderer for a given  */
  // public fetchGenericRenderer(devHubReleaseHash: EntryHash): genericAppletRenderer {
  //   // 1. isolate an Applet EntryHash that has this devHubReleaseHash

  //   // 2. fetch the Renderer for this Applet (see fetchAppletRenderers() of we-store.ts)

  //   return {};
  // }


  public async fetchAllAppletsForWeGroup(weGroupId: DnaHash): Promise<Readable<HoloHashMap<Applet>>> {
    const groupStore = get(this._matrix).get(weGroupId)[0].store;
    const allApplets = await groupStore.fetchAllApplets();
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



  private originalWeDnaHash(): DnaHash {
    const weParentAppInfo = this.weParentAppInfo;

    const weCell = weParentAppInfo.cell_data.find((c) => c.role_id === "we")!;
    return weCell.cell_id[0];
  }


  // Updating the matrix:
  // 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them
  // 2. fetch installed applet instances from the source chain for each we group (fast source chain query)
  // 3. combine 1 and 2 to update the _matrix and _installedAppletClasses

  public async fetchMatrix(): Promise<Readable<HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>>>{

    const lobbyCell = this.weParentAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    const lobbyClient = new CellClient(this.holochainClient, lobbyCell);

    let matrrrrriiix = new HoloHashMap<[WeGroupData, AppletInstanceInfo[]]>();
    let installedAppletClasses = new HoloHashMap<AppletClassInfo>();

    // 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them

    // fetch groups from conductor
    let allWeGroups = await this.adminWebsocket.listApps({});

    // for each we group, create the WeGroupStore and fetch all the applets of that group
    // that the agent has installed locally


    allWeGroups.map(async (appInfo) => {

    // create store
      const weGroupCell = appInfo.cell_data[0];
      const weGroupDnaHash = weGroupCell.cell_id[0];
      const cellClient = new CellClient(this.holochainClient, weGroupCell);

      const store = new WeGroupStore(
        cellClient,
        lobbyClient,
        serializeHash(this.originalWeDnaHash()), // remove serializeHash once membrane_invitations zome is upgraded to hdk 0.0.142
        this.adminWebsocket,
        this.membraneInvitationsStore.service
      );

      // create WeGroupData object
      const weInfo: WeInfo = get(await store.fetchInfo());
      const weGroupInfo: WeGroupInfo = {
        info: weInfo,
        dna_hash: weGroupDnaHash,
        installed_app_id: appInfo.installed_app_id,
        status: appInfo.status,
      };

      const weGroupData: WeGroupData = {
        info: weGroupInfo,
        store,
      };


      // 2. fetch installed applet instances from the source chain for each we group and populate installedAppletClasses along the way
      const appletsIAmPlaying = await store.fetchAppletsIAmPlaying();
      const appletInstanceInfos: AppletInstanceInfo[] = get(appletsIAmPlaying).entries()
        .map(([entryHash, playingApplet]) => {
          const appletInstanceInfo: AppletInstanceInfo = {
            appletId: entryHash,
            devHubHappReleaseHash: playingApplet.applet.devhubHappReleaseHash,
            installedAppId: appInfo.installed_app_id,
            status: appInfo.status,
            logoSrc: playingApplet.applet.logoSrc,
          };

          // populate installedAppletClasses along the way
          const appletClassInfo: AppletClassInfo = {
            devHubHappReleaseHash: playingApplet.applet.devhubHappReleaseHash,
            name: playingApplet.applet.name,
            logoSrc: playingApplet.applet.logoSrc,
          }
          installedAppletClasses.put(playingApplet.applet.devhubHappReleaseHash, appletClassInfo);

          return appletInstanceInfo;
        });

      matrrrrriiix.put(weGroupDnaHash, [weGroupData, appletInstanceInfos]);
    })

    // 3. combine 1 and 2 to update the matrix and _installedAppletClasses
    this._matrix.update((matrix) => {
      matrrrrriiix.entries().forEach(([key, value]) => matrix.put(key, value));
      return matrix;
    });

    this._installedAppletClasses.update((appletClasses) => {
      installedAppletClasses.entries().forEach(([key, value]) => appletClasses.put(key, value));
      return appletClasses;
    })

    return derived(this._matrix, (m) => m);

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
