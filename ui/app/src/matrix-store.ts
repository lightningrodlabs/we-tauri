import {
  serializeHash,
  deserializeHash,
} from "@holochain-open-dev/utils";
import { CellClient, HolochainClient } from "@holochain-open-dev/cell-client";
import {
  writable,
  Writable,
  derived,
  Readable,
  get,
  readable,
} from "svelte/store";
import { v4 as uuidv4 } from "uuid";

import {
  AdminWebsocket,
  InstalledAppInfo,
  AppStatusFilter,
  MembraneProof,
  InstalledAppInfoStatus,
  DnaHash,
  EntryHash,
  AgentPubKey,
  InstalledCell,
  AppBundle,
  AppWebsocket,
  InstallAppBundleRequest,
  InstalledAppId,
  ActionHash,
} from "@holochain/client";
import {
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { decode, encode } from "@msgpack/msgpack";
import { DnaHashMap, EntryHashMap, HoloHashMap } from "@holochain-open-dev/utils";
import {
  AppletRenderers,
  WeApplet,
  InstalledAppletInfo,
  WeServices,
  WeInfo,
} from "@lightningrodlabs/we-applet";
import {
  Applet,
  AppletGui,
  AppletInfo,
  DashboardMode,
  GuiFile,
  IconFileOption,
  IconSrcOption,
  PlayingApplet,
  RegisterAppletInput,
} from "./types";
import { importModuleFromFile } from "./processes/import-module-from-file";
import { getDevHubAppId } from "./processes/devhub/app-id";
import { fetchWebHapp } from "./processes/devhub/get-happs";
import { decompressSync, unzipSync } from "fflate";
import { toSrc } from "./processes/import-logsrc-from-file";
import { GlobalAppletsService } from "./global-applets-service";
import { ProfilesService, ProfilesStore } from "@holochain-open-dev/profiles";
import { PeerStatusStore } from "@holochain-open-dev/peer-status";

/**Data of a group */
export interface WeGroupData {
  info: WeGroupInfo;
  cellClient: CellClient;
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
}

/**Info of a group */
export interface WeGroupInfo {
  info: WeInfo;
  dna_hash: DnaHash; // dna hash of the group's we dna
  installed_app_id: string;
  status: InstalledAppInfoStatus;
}

/**Data of a specific instance of an installed Applet */
// export interface AppletInstanceData {
//   info: AppletInstanceInfo,
//   renderers: AppletRenderers,
// }

/**Info about a specific instance of an installed Applet */
export interface AppletInstanceInfo {
  appletId: EntryHash; // hash of the Applet entry in the applets zome of the group's we dna
  installedAppInfo: InstalledAppInfo; // InstalledAppInfo
  applet: Applet;
}

/**
 * Info about an Applet that was added to the We group by another agent and isn't installed locally yet.
 *
 * REASONING: This type is separated from the AppletInstanceInfo because it requires queries to the DHT to get new
 * applet instances while already installed applet instances can be efficiently queried from the
 * source chain. The matrix therefore only contains locally installed applets.
 *
 * */
export interface NewAppletInstanceInfo {
  appletId: EntryHash; // hash of the Applet entry in the applets zome of the group's we dna
  applet: Applet;
}

/**Data of a type of Applet of which one or many may be installed */
export interface AppletClassData {
  info: AppletClassInfo;
  renderers: AppletRenderers;
}

/**Info about a type of Applet of which one or many may be installed */
export interface AppletClassInfo {
  devhubHappReleaseHash: EntryHash;
  title: string; // title of the applet in the devhub
  logoSrc: string | undefined;
  description: string;
}

/**stores the Group/Applet matrix */
export class MatrixStore {
  /** Private */
  private _matrix: Writable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> = // We Group DnaHashes as keys
    writable(new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>()); // AppletInstanceInfo are only the one's that the agent has joined,
  // not the ones added to the We by someone else but not installed yet

  private _newAppletInstances: Writable<DnaHashMap<NewAppletInstanceInfo[]>> = // We Group DnaHashes as keys
    writable(new DnaHashMap<NewAppletInstanceInfo[]>()); // Applet instances that have been added to the we group by someone else
  // but aren't installed locally yet by the agent.

  // private _groups: Writable<DnaHashMap<WeGroupStore>> =
  //   writable(new DnaHashMap<WeGroupStore>()); // We Group DnaHashes as keys

  private _installedAppletClasses: Writable<EntryHashMap<AppletClassInfo>> =
    writable(new EntryHashMap<AppletClassInfo>()); // devhub release entry hashes of Applets as keys

  private _appletGuis: EntryHashMap<WeApplet> = new EntryHashMap<WeApplet>(); // devhub hApp release entry hashes of Applets as keys --> no duplicate applet renderers for the same applet class
  private _appletInstanceRenderers: EntryHashMap<AppletRenderers> =
    new EntryHashMap<AppletRenderers>(); // EntryHash of Applet entries in the respective we DNA as keys
  private _appletClassRenderers: EntryHashMap<AppletRenderers> =
    new EntryHashMap<AppletRenderers>(); // devhub hApp release hashes of applets as keys

  private lobbyCell: InstalledCell;

  private appletsService: GlobalAppletsService;

  public membraneInvitationsStore: MembraneInvitationsStore;
  // private _selectedAppletInstanceId: EntryHash | undefined = undefined;
  // private _selectedWeGroupId: DnaHash | undefined = undefined;

  // public get selectedAppletInstanceId() {
  //   return this._selectedAppletInstanceId;
  // }
  // public get selectedWeGroupId() {
  //   return this._selectedWeGroupId;
  // }

  // public set selectedAppletInstanceId(id: EntryHash | undefined) {
  //   this._selectedAppletInstanceId = id;
  // }
  // public set selectedWeGroupId(id: DnaHash | undefined) {
  //   this._selectedWeGroupId = id;
  // }

  public myAgentPubKey: AgentPubKey;

  public get appWebsocket(): AppWebsocket {
    return this.holochainClient.appWebsocket;
  }

  constructor(
    protected holochainClient: HolochainClient,
    protected adminWebsocket: AdminWebsocket,
    protected weParentAppInfo: InstalledAppInfo
  ) {
    const lobbyCell = weParentAppInfo.cell_data.find(
      (cell) => cell.role_id == "lobby"
    )!;
    this.lobbyCell = lobbyCell;
    const lobbyCellClient = new CellClient(holochainClient, lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(
      lobbyCellClient,
      "membrane_invitations_coordinator"
    );
    this.myAgentPubKey = lobbyCell.cell_id[1];
    this.appletsService = new GlobalAppletsService(lobbyCellClient);
  }

  public matrix(): Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> {
    return derived(this._matrix, (matrix) => matrix);
  }

  public profilesStore(weGroupId: DnaHash): Readable<ProfilesStore> {
    return derived(
      this._matrix,
      (matrix) => matrix.get(weGroupId)[0].profilesStore
    );
  }

  public peerStatusStore(weGroupId: DnaHash): Readable<PeerStatusStore> {
    return derived(
      this._matrix,
      (matrix) => matrix.get(weGroupId)[0].peerStatusStore
    );
  }

  /**
   * Gets we group info from the matrix store
   *
   * @param weGroupId : DnaHash
   * @returns : WeInfo
   */
  public getWeGroupInfo(weGroupId): WeInfo {
    return get(this._matrix).get(weGroupId)[0].info.info;
  }

  /**
   * Fetches we group info from the conductor
   *
   * @param weGroupId : DnaHash
   * @returns : Promise<Readable<WeInfo>>
   */
  public async fetchWeGroupInfo(weGroupId: DnaHash): Promise<Readable<WeInfo>> {
    const cellClient = get(this._matrix).get(weGroupId)[0].cellClient;
    const zomeName = "we_coordinator";
    const info = await cellClient.callZome(zomeName, "get_info", null);
    return readable(info);
  }



  public getAppletClassInfo(appletClassId: EntryHash): Readable<AppletClassInfo | undefined> {
    // const classStrings = get(this._installedAppletClasses).keys().map(())

    return derived(this._installedAppletClasses, (hashMap) => {
      const maybeClass = hashMap.entries()
        .find(([classId, classInfo]) => JSON.stringify(classId) === JSON.stringify(appletClassId));
      return maybeClass ? maybeClass[1] : undefined;
    })
  }


  /**
   * Checks whether the specified applet Instance is installed in the conductor
   *
   * @param weGroupId
   * @param appletInstanceId
   */
  public isInstalled(appletInstanceId: EntryHash): boolean {
    const maybeInstalled = get(this._matrix)
      .values()
      .map(([_groupData, appletInfos]) => appletInfos)
      .flat()
      .find(
        (appletInstanceInfo) => appletInstanceInfo.appletId == appletInstanceId
      );

    if (maybeInstalled) return true;
    return false;
  }

  /**
   * Gets info about a newly installed applet
   *
   * @param appletInstanceId : EntryHash
   * @returns NewAppletInstanceInfo | undefined
   */
  public getNewAppletInstanceInfo(
    appletInstanceId: EntryHash
  ): NewAppletInstanceInfo | undefined {
    return get(this._newAppletInstances)
      .values()
      .flat()
      .find((info) => info.appletId === appletInstanceId);
  }

  public weGroupInfos(): Readable<DnaHashMap<WeGroupInfo>> {
    return derived(this._matrix, (matrix) => {
      let groupInfos = new DnaHashMap<WeGroupInfo>();
      matrix
        .entries()
        .forEach(([groupId, [groupData, _appletInstanceInfos]]) => {
          groupInfos.put(groupId, groupData.info);
        });
      return groupInfos;
    });
  }

  public installedAppletClasses(): Readable<EntryHashMap<AppletClassInfo>> {
    return derived(
      this._installedAppletClasses,
      (appletClasses) => appletClasses
    );
  }

  /**
   * Fetches the AppletRenderers for an applet instance
   *
   * ATTENTION: THIS METHOD ASSUMES THAT THE APPLET IS ALREADY LISTED IN THE MATRIX
   *            WHICH IS EQUIVALENT TO ASSUMING THAT IT HAS ALREADY BEEN INSTALLED
   *            TO THE CONDUCTOR OF THE AGENT.
   *
   * THE METHOD THEREFORE MAY ONLY BE CALLED AFTER HAVING CHECKED THAT THE
   * APPLET IS ALREADY INSTALLED.
   *
   * @param weGroupId
   * @param appletInstanceId
   * @param devhubHappReleaseHash
   * @returns
   */
  async fetchAppletInstanceRenderers(
    appletInstanceId: EntryHash,
    weServices: WeServices
  ) {

    // // 1. check whether the renderers for this applet instance are already stored, if yes return them
    // const maybeRenderers = this._appletInstanceRenderers.get(appletInstanceId);
    // if (maybeRenderers) return maybeRenderers;

    // 2. check whether the GUI is already loaded, if not load fetch from the lobby DNA
    const devhubHappReleaseHash =
      this.releaseHashOfAppletInstance(appletInstanceId)!;
    // ATTENTION: IT IS ASSUMED HERE THAT THE APPLET IS ALREADY IN THE MATRIX!!

    let gui = this._appletGuis.get(devhubHappReleaseHash);
    if (!gui) {
      gui = await this.queryAppletGui(devhubHappReleaseHash);
    }

    // 3. create the renderers and return them
    const weGroupId =
      this.getWeGroupInfoForAppletInstance(appletInstanceId).dna_hash;
    const [_weGroupData, appInstanceInfos] = get(this._matrix).get(weGroupId);
    const installedAppInfo = appInstanceInfos.find(
      (info) => JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
    )!.installedAppInfo;


    const renderers = await gui.appletRenderers(
      this.holochainClient.appWebsocket,
      this.adminWebsocket,
      weServices,
      [{ weInfo: this.getWeGroupInfo(weGroupId), installedAppInfo }]
    );


    return renderers;
  }

  /**
   * Fetches the AppletRenderers for an applet class
   * @param devhubHappReleaseHash
   */
  async fetchAppletClassRenderers(
    devhubHappReleaseHash: EntryHash
  ): Promise<AppletRenderers> {
    // STEP 0 SHOULD NOT HAPPEN BECAUSE THE RENDERER NEEDS TO BE UPDATED IN CASE A NEW APPLET INSTANCE OF
    // THE SAME CLASS GETS INSTALLED
    // // 0. check whether the renderers for this applet class are already stored, if yes return them
    // const maybeRenderers = this._appletClassRenderers.get(devhubHappReleaseHash);
    // if (maybeRenderers) return maybeRenderers;

    // 1. check whether the GUI is already loaded, if not fetch it from the lobby DNA
    let gui = this._appletGuis.get(devhubHappReleaseHash);
    if (!gui) {
      gui = await this.queryAppletGui(devhubHappReleaseHash);
    }

    // 2. create the renderers and return them
    const renderers = await gui.appletRenderers(
      this.holochainClient.appWebsocket,
      this.adminWebsocket,
      {},
      this.getInstalledAppletInfoListForClass(devhubHappReleaseHash)
    );

    return renderers;
  }

  /**
   * Fetches the corresponding applet GUI from the lobby DNA if not already stored locally
   *
   * @param devhubHappReleaseHash
   * @returns
   */
  async queryAppletGui(devhubHappReleaseHash): Promise<WeApplet> {
    const lobbyClient = new CellClient(this.holochainClient, this.lobbyCell);
    const appletGui = await lobbyClient.callZome(
      "applet_guis_coordinator",
      "query_applet_gui",
      devhubHappReleaseHash
    );

    const rendererBytes = appletGui.gui;

    const file = new File(
      [new Blob([new Uint8Array(rendererBytes)])],
      "filename"
    );

    const mod = await importModuleFromFile(file);
    const gui = mod.default;

    // update the renderers
    this._appletGuis.put(devhubHappReleaseHash, gui);

    return gui;
  }

  // private _wes: Writable<Record<DnaHashB64, WeGroupStore>> = writable({});
  // private _selectedWeId: Writable<DnaHashB64 | undefined> = writable(undefined);

  public getProfileForWeGroupAgent(weGroupId: DnaHash, weAgentId: AgentPubKey) {
    // do stuff
  }

  /**Gets an array of all AppletInfo of the applets installed for the specified group */
  public getAppletInstanceInfosForGroup(
    groupDnaHash: DnaHash
  ): Readable<AppletInstanceInfo[]> {
    // todo
    return readable(get(this._matrix).get(groupDnaHash)[1]);
    // return derived(this._matrix, (matrix) => {
    //   return matrix.get(groupDnaHash)[1];
    // })
  }

  /**
   * Gets an array of [GroupInfo, AppletInstanceInfo] of the installed applet instances of the specified applet class
   * Used to display the group icons in NavifationMode.AppletCentric in the secondary navigation panel.
   */
  public getInstanceInfosForAppletClass(
    devhubHappReleaseHash: EntryHash
  ): Readable<[WeGroupInfo, AppletInstanceInfo][]> {
    // todo
    return derived(this._matrix, (matrix) => {
      let result: [WeGroupInfo, AppletInstanceInfo][] = [];
      matrix.values().forEach(([groupData, appletInfos]) => {
        // const filteredInfos = appletInfos.filter((appletInfo) => appletInfo.applet.devhubHappReleaseHash.toString() === devhubHappReleaseHash.toString());

        appletInfos
          .filter(
            (appletInfo) =>
              appletInfo.applet.devhubHappReleaseHash.toString() ===
              devhubHappReleaseHash.toString()
          )
          .forEach((appletInfo) => result.push([groupData.info, appletInfo]));
      });
      return result;
    });
  }

  // /**Fetches a generic renderer for a given  */
  // public fetchGenericRenderer(devHubReleaseHash: EntryHash): genericAppletRenderer {
  //   // 1. isolate an Applet EntryHash that has this devHubReleaseHash

  //   // 2. fetch the Renderer for this Applet (see fetchAppletRenderers() of we-store.ts)

  //   return {};
  // }

  /**
   * Fetching all applets for the specified we group (query to the DHT)
   *
   * @param weGroupId : DnaHash
   * @returns Promise<Readable<[EntryHash, Applet][]>>
   */
  public async fetchAllApplets(
    weGroupId: DnaHash
  ): Promise<Readable<[EntryHash, Applet][]>> {
    const cellClient = get(this._matrix).get(weGroupId)[0].cellClient;
    const allApplets = await this.appletsService.getAllApplets(cellClient);
    return readable(allApplets);
  }

  /**
  Fetching Applet instances that have been added to the specified we group by someone else
  but aren't installed locally yet by the agent
  */
  public async fetchNewAppletInstancesForGroup(
    weGroupId: EntryHash
  ): Promise<Readable<NewAppletInstanceInfo[]>> {
    // fetch all applets for that group
    const allApplets: [EntryHash, Applet][] = get(
      await this.fetchAllApplets(weGroupId)
    );

    const cellClient = get(this._matrix).get(weGroupId)[0].cellClient;

    // const [weGroupData, installedApplets] = get(this._matrix).get(weGroupId);
    const appletsIAmPlaying: [EntryHash, PlayingApplet][] =
      await this.appletsService.getAppletsIAmPlaying(cellClient); // where the applet entry hashes are the keys

    const newApplets = allApplets.filter(([_entryHash, applet]) => {
      return !appletsIAmPlaying
        .map(([_entryHash, playingApplet]) =>
          JSON.stringify(playingApplet.applet.networkSeed)
        ) // [Applet, Applet, Applet]
        .includes(JSON.stringify(applet.networkSeed));
    });

    const newAppletInstanceInfos: NewAppletInstanceInfo[] = newApplets.map(
      ([entryHash, applet]) => {
        return {
          appletId: entryHash,
          applet,
        };
      }
    );

    // update the _newAppletInstances store
    this._newAppletInstances.update((hashMap) => {
      hashMap.put(weGroupId, newAppletInstanceInfos);
      return hashMap;
    });

    return readable(newAppletInstanceInfos);
  }

  /**
   * Fetching all the applet instances that havent been installed yet.
   *
   *
   */
  public async fetchNewAppletInstances(): Promise<
    Readable<DnaHashMap<NewAppletInstanceInfo[]>>
  > {
    const weGroups = get(this._matrix).keys();
    const hashMap: DnaHashMap<NewAppletInstanceInfo[]> = new DnaHashMap<
      NewAppletInstanceInfo[]
    >();

    await Promise.all(
      weGroups.map(async (weGroupId) => {
        hashMap.put(
          weGroupId,
          get(await this.fetchNewAppletInstancesForGroup(weGroupId))
        );
      })
    );
    // updating _newAppletInstances is already handled by fetchNewAppletInstancesForGroup
    return readable(hashMap);
  }

  private originalWeDnaHash(): DnaHash {
    const weParentAppInfo = this.weParentAppInfo;

    const weCell = weParentAppInfo.cell_data.find((c) => c.role_id === "we")!;
    return weCell.cell_id[0];
  }







  /**
   * Updates the matrix:
   * 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them
   * 2. fetch installed applet instances from the source chain for each we group (fast source chain query)
   * 3. combine 1 and 2 to update the _matrix and _installedAppletClasses
   * @returns
   */
  public async fetchMatrix(): Promise<
    Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>>
  > {

    // const lobbyClient = new CellClient(this.holochainClient, this.lobbyCell);

    let matrix = new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>();
    let installedAppletClasses = new EntryHashMap<AppletClassInfo>();

    // 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them

    // fetch groups from conductor
    let allApps = await this.adminWebsocket.listApps({});
    let allWeGroups = allApps.filter((app) =>
      app.installed_app_id.startsWith("we-")
    );






    // for each we group, create the WeGroupStore and fetch all the applets of that group
    // that the agent has installed locally

    await Promise.all(
      allWeGroups.map(async (weGroupAppInfo) => {
        // create store
        const weGroupCell = weGroupAppInfo.cell_data[0];
        const weGroupDnaHash = weGroupCell.cell_id[0];
        const weGroupCellClient = new CellClient(this.holochainClient, weGroupCell);

        // add signal handler to listen for "NewApplet" events
        weGroupCellClient.addSignalHandler((signal) => {
          const payload = signal.data.payload;

          if (!payload.message) return;

          switch (payload.message.type) {
            case "NewApplet":
              this._newAppletInstances.update((store) => {
                const newAppletInstanceInfo: NewAppletInstanceInfo = {
                  appletId: payload.appletHash,
                  applet: payload.message.content,
                };

                let updatedList = store.get(weGroupDnaHash);
                updatedList.push(newAppletInstanceInfo);

                store.put(weGroupDnaHash, updatedList);

                return store;
              });
              break;
          }
        });

        const profilesStore = new ProfilesStore(
          new ProfilesService(weGroupCellClient)
        );
        const peerStatusStore = new PeerStatusStore(weGroupCellClient);

        // create WeGroupData object
        const weInfo: WeInfo = await weGroupCellClient.callZome(
          "we_coordinator",
          "get_info",
          null
        );
        const weGroupInfo: WeGroupInfo = {
          info: weInfo,
          dna_hash: weGroupDnaHash,
          installed_app_id: weGroupAppInfo.installed_app_id,
          status: weGroupAppInfo.status,
        };

        const weGroupData: WeGroupData = {
          info: weGroupInfo,
          cellClient: weGroupCellClient,
          profilesStore,
          peerStatusStore,
        };

        // 2. fetch installed applet instances from the source chain for each we group and populate installedAppletClasses along the way
        const appletsIAmPlaying =
          await this.appletsService.getAppletsIAmPlaying(weGroupCellClient);

        const appletInstanceInfos: AppletInstanceInfo[] = appletsIAmPlaying.map(
          ([entryHash, playingApplet]) => {
            const appletClassInfo: AppletClassInfo = {
              devhubHappReleaseHash: playingApplet.applet.devhubHappReleaseHash,
              title: playingApplet.applet.title,
              logoSrc: playingApplet.applet.logoSrc,
              description: playingApplet.applet.description,
            };

            const appletInstanceInfo: AppletInstanceInfo = {
              appletId: entryHash,
              installedAppInfo: allApps.find((app) =>
                this.isSameApp(app, playingApplet.applet)
              )!,
              applet: playingApplet.applet,
            };


            // populate installedAppletClasses along the way
            installedAppletClasses.put(
              playingApplet.applet.devhubHappReleaseHash,
              appletClassInfo
            );

            return appletInstanceInfo;
          }
        );

        matrix.put(weGroupDnaHash, [weGroupData, appletInstanceInfos]);
      })
    );


    // 3. combine 1 and 2 to update the matrix and _installedAppletClasses
    this._matrix.set(matrix);
    // this._matrix.update((m) => {
    //   matrix.entries().forEach(([key, value]) => m.put(key, value));
    //   return m;
    // });


    this._installedAppletClasses.update((appletClasses) => {
      installedAppletClasses
        .entries()
        .forEach(([key, value]) => appletClasses.put(key, value));
      return appletClasses;
    });

    return derived(this._matrix, (m) => m);
  }





  /**
   * Invite another agent to join the specified We group.
   *
   * @param weGroupId : DnaHash
   * @param agentPubKey : AgentPubKeyB64
   */
  public async inviteToJoinGroup(
    weGroupId: DnaHash,
    agentPubKey: AgentPubKey
  ): Promise<void> {
    const weGroupCell = get(this._matrix).get(weGroupId)[0].cellClient.cell
      .cell_id;
    const myAgentPubKey = serializeHash(weGroupCell[1]);
    const weGroupDnaHash = weGroupCell[0];

    const appInfo = this.weParentAppInfo;
    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const weParentDnaHash = weCell.cell_id[0];

    const info = await this.getWeGroupInfo(weGroupId);

    const properties = encode(info);

    // membrane invitations API will need to change uid --> network_seed
    await this.membraneInvitationsStore.service.inviteToJoinMembrane(
      {
        originalDnaHash: weParentDnaHash,
        properties,
        networkSeed: undefined,
        resultingDnaHash: weGroupDnaHash,
      },
      agentPubKey,
      undefined
    );
  }

  /**
   * Clones the We DNA with a new unique weId as its UID
   * @param weName
   * @param weLogo
   */
  public async createWeGroup(name: string, logo: string): Promise<DnaHash> {
    const timestamp = Date.now();

    const newWeGroupDnaHash = await this.installWeGroup(name, logo, timestamp); // this line also updates the matrix store

    const appInfo = this.weParentAppInfo;

    const weCell = appInfo.cell_data.find((c) => c.role_id === "we")!;
    const weDnaHash = weCell.cell_id[0];

    const properties = {
      logoSrc: logo,
      name: name,
      timestamp,
    };
    await this.membraneInvitationsStore.service.createCloneDnaRecipe({
      originalDnaHash: weDnaHash,
      networkSeed: undefined,
      properties: encode(properties),
      resultingDnaHash: newWeGroupDnaHash,
    });

    return newWeGroupDnaHash;
  }

  public async joinWeGroup(
    invitationActionHash: ActionHash,
    name: string,
    logo: string,
    timestamp: number
  ): Promise<DnaHash> {
    const newWeGroupDnaHash = await this.installWeGroup(name, logo, timestamp);
    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
    return newWeGroupDnaHash;
  }

  public async removeInvitation(invitationActionHash: ActionHash) {
    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
  }

  private async installWeGroup(
    name: string,
    logo: string,
    timestamp: number
  ): Promise<DnaHash> {
    const weParentAppInfo = this.weParentAppInfo;

    const weGroupCell = weParentAppInfo.cell_data.find(
      (c) => c.role_id === "we"
    )!;
    const myAgentPubKey = serializeHash(weGroupCell.cell_id[1]);
    const weDnaHash = serializeHash(weGroupCell.cell_id[0]);

    const properties = {
      logoSrc: logo,
      name: name,
      timestamp,
    };

    // Create the We cell
    const newWeGroupHash = await this.adminWebsocket.registerDna({
      hash: deserializeHash(weDnaHash) as Buffer,
      network_seed: undefined,
      properties,
    });

    const installed_app_id = `we-${name}-${timestamp}`;
    const newAppInfo: InstalledAppInfo = await this.adminWebsocket.installApp({
      installed_app_id,
      agent_key: deserializeHash(myAgentPubKey) as Buffer,
      dnas: [
        {
          hash: newWeGroupHash,
          role_id: name,
        },
      ],
    });
    const enabledResult = await this.adminWebsocket.enableApp({
      installed_app_id,
    });

    const newWeCell = newAppInfo.cell_data[0];
    const newWeGroupDnaHash: DnaHash = newWeCell.cell_id[0];
    const cellClient = new CellClient(this.holochainClient, newWeCell);

    // add signal handler to listen for "NewApplet" events
    cellClient.addSignalHandler((signal) => {
      const payload = signal.data.payload;

      if (!payload.message) return;

      switch (payload.message.type) {
        case "NewApplet":
          this._newAppletInstances.update((store) => {
            const newAppletInstanceInfo: NewAppletInstanceInfo = {
              appletId: payload.appletHash,
              applet: payload.message.content,
            };

            let updatedList = store.get(newWeGroupDnaHash);
            updatedList.push(newAppletInstanceInfo);

            store.put(newWeGroupDnaHash, updatedList);

            return store;
          });
          break;
      }
    });

    const profilesStore = new ProfilesStore(new ProfilesService(cellClient));
    const peerStatusStore = new PeerStatusStore(cellClient);

    this._matrix.update((matrix) => {
      const weInfo: WeInfo = {
        logoSrc: properties.logoSrc,
        name: properties.name,
      };

      const weGroupInfo: WeGroupInfo = {
        info: weInfo,
        dna_hash: newWeGroupDnaHash,
        installed_app_id,
        status: enabledResult.app.status,
      };

      const weGroupData: WeGroupData = {
        info: weGroupInfo,
        cellClient,
        profilesStore,
        peerStatusStore,
      };

      if (!matrix.get(newWeGroupDnaHash)) {
        matrix.put(newWeGroupDnaHash, [weGroupData, []]);
      }

      return matrix;
    });

    return newWeGroupDnaHash;
  }



  /**
   * Installs the already existing applet in the specified We group to the conductor
   *
   * @param weGroupId : DnaHash
   * @param appletInstanceId : EntryHash
   * @returns void
   */
  async joinApplet(
    weGroupId: DnaHash,
    appletInstanceId: EntryHash,
    compressedWebHappInput?: Uint8Array,
  ): Promise<void> {

    const isAlreadyInstalled = this.isInstalled(appletInstanceId);
    if (isAlreadyInstalled) return;

    const newApplets: DnaHashMap<NewAppletInstanceInfo[]> = get(
      this._newAppletInstances
    );
    let newAppletInfo = newApplets
      .get(weGroupId)
      .find((info) => info.appletId === appletInstanceId);
    if (!newAppletInfo) {
      newAppletInfo = get(
        await this.fetchNewAppletInstancesForGroup(weGroupId)
      ).find((info) => info.appletId === appletInstanceId);
    }

    if (!newAppletInfo) {
      console.error(
        "Could not fetch the applet of the specified appletInstanceId from the we group dna."
      );
    } else {
      // fetch hApp and GUI   <---- COULD BE IMPROVED BY TAKING IT FROM LOCAL STORAGE IN CASE THE SAME APPLET CLASS HAS BEEN INSTALLED EARLIER
      // add logic here in case webhapp is installed from the file system.
      let compressedWebHapp: Uint8Array;

      if (!compressedWebHappInput) {
        compressedWebHapp = await this.fetchWebHapp(newAppletInfo.applet.devhubHappReleaseHash);
      } else {
        compressedWebHapp = compressedWebHappInput;
      }

      const [decompressedHapp, decompressedGui, _iconSrcOption] = this.decompressWebHapp(compressedWebHapp);


      const cellClient = get(this._matrix).get(weGroupId)[0].cellClient;
      const weGroupCellData = cellClient.cell;

      const network_seed = Object.values(newAppletInfo.applet.networkSeed)[0];
      const installedAppId = `${network_seed}-${newAppletInfo.applet.customName}`;

      // install app bundle
      const request: InstallAppBundleRequest = {
        agent_key: weGroupCellData.cell_id[1],
        installed_app_id: installedAppId,
        membrane_proofs: {},
        bundle: decompressedHapp,
        network_seed: network_seed,
      };

      await this.adminWebsocket.installAppBundle(request);

      const enabledAppInfo = await this.adminWebsocket.enableApp({
        installed_app_id: installedAppId,
      });

      const appInfo = enabledAppInfo.app;

      // register Applet entry in order to have it in the own source chain
      const registerAppletInput: RegisterAppletInput = {
        appletAgentPubKey: appInfo.cell_data[0].cell_id[1], // pick the pubkey of any of the cells
        applet: newAppletInfo.applet,
      };

      await this.appletsService.createApplet(cellClient, registerAppletInput);

      // commit GUI to source chain as private entry
      const guiToCommit: AppletGui = {
        devhubHappReleaseHash: newAppletInfo.applet.devhubHappReleaseHash,
        gui: decompressedGui,
      };
      const _guiEntryHash = await this.appletsService.commitGuiFile(
        guiToCommit
      );

      const appInstanceInfo: AppletInstanceInfo = {
        appletId: appletInstanceId,
        installedAppInfo: appInfo,
        applet: newAppletInfo.applet,
      };
      // update stores
      // update _matrix
      this._matrix.update((matrix) => {
        matrix.get(weGroupId)[1].push(appInstanceInfo);
        return matrix;
      });

      // update _newAppletInstances
      this._newAppletInstances.update((hashMap) => {
        const filteredArray = hashMap
          .get(weGroupId)
          .filter((info) => info.appletId != appletInstanceId);
        hashMap.put(weGroupId, filteredArray);
        return hashMap;
      });


      // update _installedAppletClasses
      if (
        !get(this._installedAppletClasses).get(
          newAppletInfo.applet.devhubHappReleaseHash
        )
      ) {
        this._installedAppletClasses.update((hashMap) => {
          hashMap.put(newAppletInfo!.applet.devhubHappReleaseHash, {
            title: newAppletInfo!.applet.title,
            logoSrc: newAppletInfo!.applet.logoSrc,
            description: newAppletInfo!.applet.description,
            devhubHappReleaseHash: newAppletInfo!.applet.devhubHappReleaseHash,
          });
          return hashMap;
        });
      }
    }
  }

  /**
   * Installs the given applet to the conductor, and registers it in the We DNA
   *
   * @param appletInfo
   * @param customName
   * @returns
   */
  async createApplet(
    weGroupId: DnaHash,
    appletInfo: AppletInfo,
    customName: InstalledAppId,
    compressedWebHapp?: Uint8Array,
  ): Promise<EntryHash> {
    // --- Install hApp in the conductor---

    let decompressedHapp: AppBundle;
    let decompressedGui: Uint8Array;
    let iconSrcOption: IconSrcOption;

    if (!compressedWebHapp) {
      const compressedWebHapp = await this.fetchWebHapp(appletInfo.devhubHappReleaseHash);
      [decompressedHapp, decompressedGui, iconSrcOption] =
        await this.decompressWebHapp(compressedWebHapp);
    } else {
      [decompressedHapp, decompressedGui, iconSrcOption] = this.decompressWebHapp(compressedWebHapp);
    }

    const weGroupCellClient = get(this._matrix).get(weGroupId)[0].cellClient;
    const weGroupCellData = weGroupCellClient.cell;

    const network_seed = uuidv4();
    const installedAppId: InstalledAppId = `${network_seed}-${customName}`;

    const request: InstallAppBundleRequest = {
      agent_key: weGroupCellData.cell_id[1],
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      network_seed: network_seed,
    };

    await this.adminWebsocket.installAppBundle(request);

    const enabledApp = await this.adminWebsocket.enableApp({
      installed_app_id: installedAppId,
    });
    const appInfo = enabledApp.app;


    // --- Commit UI in the lobby cell as private entry ---

    const appletGui: AppletGui = {
      devhubHappReleaseHash: appletInfo.devhubHappReleaseHash,
      gui: decompressedGui,
    };

    const _ = await this.appletsService.commitGuiFile(appletGui);

    // --- Register hApp in the We DNA ---

    const dnaHashes: Record<string, DnaHash> = {};
    const networkSeedByRole: Record<string, string> = {};
    appInfo.cell_data.forEach((cell) => {
      dnaHashes[cell.role_id] = cell.cell_id[0];
      networkSeedByRole[cell.role_id] = network_seed;
    });

    const applet: Applet = {
      customName,
      title: appletInfo.title,
      description: appletInfo.description,
      // logoSrc: appletInfo.icon, // this line should be taken instead once icons are supported by the devhub
      logoSrc: iconSrcOption,

      devhubHappReleaseHash: appletInfo.devhubHappReleaseHash,

      properties: {},
      networkSeed: networkSeedByRole,
      dnaHashes: dnaHashes,
    };

    const registerAppletInput: RegisterAppletInput = {
      appletAgentPubKey: appInfo.cell_data[0].cell_id[1], // pick the pubkey of any of the cells since it's the same for the whole hApp
      applet,
    };

    const appletInstanceId = await this.appletsService.createApplet(
      weGroupCellClient,
      registerAppletInput
    );


    const appInstanceInfo: AppletInstanceInfo = {
      appletId: appletInstanceId,
      installedAppInfo: appInfo,
      applet: applet,
    };

    // update stores
    // update _matrix
    this._matrix.update((matrix) => {
      matrix.get(weGroupId)[1].push(appInstanceInfo);
      return matrix;
    });

    // update _installedAppletClasses
    if (!get(this._installedAppletClasses).get(applet.devhubHappReleaseHash)) {
      this._installedAppletClasses.update((hashMap) => {
        hashMap.put(applet.devhubHappReleaseHash, {
          title: applet.title,
          logoSrc: applet.logoSrc,
          description: applet.description,
          devhubHappReleaseHash: applet.devhubHappReleaseHash,
        });
        return hashMap;
      });
    }

    return appletInstanceId;
  }

  public async getDevhubHapp(): Promise<InstalledAppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find(
      (app) => app.installed_app_id === getDevHubAppId()
    )!;
  }



  async fetchWebHapp(entryHash: EntryHash): Promise<Uint8Array> {
    const devhubHapp = await this.getDevhubHapp();

    const compressedWebHapp = await fetchWebHapp(
      this.appWebsocket,
      devhubHapp,
      "hApp", // This is chosen arbitrarily at the moment
      entryHash
    );

    return compressedWebHapp;
  }

  /**
   * Decompresses a webhapp
   *
   * @param compressedWebHapp: Uint8Array
   * @returns [AppBundle, GuiFile, IconSrcOption]
   */
  decompressWebHapp(
    compressedWebHapp: Uint8Array
  ): [AppBundle, GuiFile, IconSrcOption] {

    // decompress bytearray into .happ and ui.zip (zlibt2)
    const bundle = decode(
      decompressSync(new Uint8Array(compressedWebHapp))
    ) as any;

    // find out format of this decompressed object (see /devhub-dnas/zomes/happ_library/src/packaging.rs --> get_webhapp_package())
    const webappManifest = bundle.manifest;
    const resources = bundle.resources;

    const compressedHapp = resources[webappManifest.happ_manifest.bundled];
    const decompressedHapp = decode(
      decompressSync(new Uint8Array(compressedHapp))
    ) as AppBundle;

    // decompress and etract index.js
    const compressedGui = resources[webappManifest.ui.bundled];
    const decompressedGuiMap = unzipSync(new Uint8Array(compressedGui)) as any;

    const decompressedGui = decompressedGuiMap["index.js"] as GuiFile;
    const decompressedIcon = decompressedGuiMap["icon.png"] as IconFileOption;
    const iconSrcOption: IconSrcOption = toSrc(decompressedIcon);
    return [decompressedHapp, decompressedGui, iconSrcOption];
  }


  /**
   * Install an applet from the file system. Only for test or demo purposes.
   *
   */
  async installFromFileSystem() {

  }




  // +++++++++++++++      H E L P E R    M E T H O D S    B E L O W      +++++++++++++++++++++++++++++++


  getWeGroupInfoForAppletInstance(appletInstanceId: EntryHash): WeGroupInfo {
    return get(this._matrix)
      .values()
      .filter(([_groupData, appletInfos]) => {
        return (
          appletInfos.filter(
            (appletInfo) => appletInfo.appletId === appletInstanceId
          ).length > 0
        );
      })[0][0].info;
  }

  /**
   * Gets the AppletInstanceInfo for the specified applet instance id
   *
   * @param appletInstanceId
   * @returns AppletInstanceInfo for this applet instance id or undefined.
   */
  getAppletInstanceInfo(
    appletInstanceId: EntryHash
  ): AppletInstanceInfo | undefined {
    return get(this._matrix)
      .values()
      .map(([_groupData, appletInfos]) => appletInfos)
      .flat()
      .find(
        (appletInstanceInfo) => appletInstanceInfo.appletId == appletInstanceId
      );
  }

  /**
   * Retrieves the devhub hApp release hash associated to the specified applet instance
   *
   * @param appletInstanceId: EntryHash
   * @returns: EntryHash | undefined : devhub hApp release hash for this applet instance id or undefined.
   */
  releaseHashOfAppletInstance(
    appletInstanceId: EntryHash
  ): EntryHash | undefined {
    return this.getAppletInstanceInfo(appletInstanceId)?.applet
      .devhubHappReleaseHash;
  }

  /**
   * Gets InstalledAppletInfo of all applets of this class across all we groups
   * @param devhubHappReleaseHash
   * @returns
   */
  getInstalledAppletInfoListForClass(
    devhubHappReleaseHash: EntryHash
  ): InstalledAppletInfo[] {
    const matrix = get(this._matrix);
    let appletInfosOfClass: InstalledAppletInfo[] = [];
    matrix.values().forEach(([weGroupData, appletInstanceInfos]) => {
      const weInfo: WeInfo = weGroupData.info.info;
      const weGroupId: DnaHash = weGroupData.info.dna_hash;
      const relevantAppletInstanceInfos = appletInstanceInfos.filter(
        (info) => JSON.stringify(info.applet.devhubHappReleaseHash) === JSON.stringify(devhubHappReleaseHash)
      );
      const relevantInstalledAppletInfos = relevantAppletInstanceInfos.map(
        (appletInstanceInfo) => {
          const installedAppletInfo: InstalledAppletInfo = {
            weInfo,
            installedAppInfo: appletInstanceInfo.installedAppInfo,
          };
          return installedAppletInfo;
        }
      );


      appletInfosOfClass = [
        ...appletInfosOfClass,
        ...relevantInstalledAppletInfos,
      ];
    });


    return appletInfosOfClass;
  }

  /**
   * Checks whether an InstalledAppInfo and an Applet refer to the same applet
   * @param installedAppInfo
   * @param applet
   * @returns
   */
  isSameApp(installedAppInfo: InstalledAppInfo, applet: Applet): boolean {

    let isSame = true;
    installedAppInfo.cell_data.forEach((installedCell) => {
      const dnaHashOfRoleId = applet.dnaHashes[installedCell.role_id];
      if (!dnaHashOfRoleId ||
        serializeHash(dnaHashOfRoleId) !== serializeHash(installedCell.cell_id[0])) {
        isSame = false;
      }
    });

    return isSame;
  }
}
