import {
  EntryRecord,
} from "@holochain-open-dev/utils";
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
  AppInfo,
  AppStatusFilter,
  MembraneProof,
  InstalledAppInfoStatus,
  DnaHash,
  EntryHash,
  AgentPubKey,
  InstalledCell,
  AppBundle,
  AppWebsocket,
  InstallAppRequest,
  InstalledAppId,
  ActionHash,
  CellId,
  AppAgentClient,
  AppAgentWebsocket,
  encodeHashToBase64,
  decodeHashFromBase64,
  CellType,
  AppSignal,
  StemCell,
  ClonedCell,
  ProvisionedCell,
  CellInfo,
} from "@holochain/client";
import {
  CloneDnaRecipe,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { decode, encode } from "@msgpack/msgpack";
import {
  DnaHashMap,
  EntryHashMap,
  HoloHashMap,
} from "@holochain-open-dev/utils";
import {
  AppletRenderers,
  NhLauncherApplet,
  AppletInfo,
  WeServices,
  WeInfo,
} from "@neighbourhoods/nh-launcher-applet";
import { SensemakerStore, SensemakerService } from "@neighbourhoods/client";
import {
  Applet,
  AppletGui,
  AppletMetaData,
  DashboardMode,
  GuiFile,
  IconFileOption,
  IconSrcOption,
  PlayingApplet,
  RegisterAppletInput,
  SignalPayload,
} from "./types";
import { importModuleFromFile } from "./processes/import-module-from-file";
import { getDevHubAppId } from "./processes/devhub/app-id";
import { fetchWebHapp } from "./processes/devhub/get-happs";
import { decompressSync, unzipSync } from "fflate";
import { toSrc } from "./processes/import-logsrc-from-file";
import { GlobalAppletsService } from "./global-applets-service";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { PeerStatusStore, PeerStatusClient } from "@holochain-open-dev/peer-status";
import md5 from "md5";
import { getCellId } from "./utils";
import { defaultAppletConfig } from "./defaultAppletConfig";
import { AverageStarDimensionDisplay, StarDimensionAssessment, ThumbsUpDimenionAssessment, TotalThumbsUpDimensionDisplay } from "./widgets";

/**Data of a group */
export interface WeGroupData {
  info: WeGroupInfo;
  appAgentWebsocket: AppAgentWebsocket; // Each we group needs its own signal handler, i.e. its own AppAgentWebsocket object
  profilesStore: ProfilesStore;
  peerStatusStore: PeerStatusStore;
  sensemakerStore: SensemakerStore;
}

/**Info of a group */
export interface WeGroupInfo {
  info: WeInfo;
  cell_id: CellId;
  dna_hash: DnaHash;
  cloneName: string;
  enabled: boolean;
}

/**Data of a specific instance of an installed Applet */
// export interface AppletInstanceData {
//   info: AppletInstanceInfo,
//   renderers: AppletRenderers,
// }

/**Info about a specific instance of an installed Applet */
export interface AppletInstanceInfo {
  appletId: EntryHash; // hash of the Applet entry in the applets zome of the group's we dna
  appInfo: AppInfo; // InstalledAppInfo
  applet: Applet;
  federatedGroups: DnaHash[];
}

export interface UninstalledAppletInstanceInfo {
  appletId: EntryHash; // hash of the Applet entry in the applets zome of the group's we dna
  applet: Applet;
  federatedGroups: DnaHash[];
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
  federatedGroups: DnaHash[];
}

/**Data of a type of Applet of which one or many may be installed */
export interface AppletClassData {
  info: AppletClassInfo;
  renderers: AppletRenderers;
}

/**Info about a type of Applet of which one or many may be installed */
export interface AppletClassInfo {
  devhubHappReleaseHash: EntryHash; // TODO change this to integrity zome hashes via getDnaDefinition??
  title: string; // title of the applet in the devhub
  logoSrc: string | undefined;
  description: string;
}

/**stores the Group/Applet matrix */
export class MatrixStore {
  /** Private */
  private _matrix: Writable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> = // We Group DnaHashes as keys
    writable(new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>()); // AppletInstanceInfo are only the one's that the agent has joined,
  // not the ones added to the We by someone else but not installed yet and also not the ones deleted

  private _uninstalledAppletInstances: Writable<
    DnaHashMap<UninstalledAppletInstanceInfo[]>
  > = // We Group DnaHashes as keys
    writable(new DnaHashMap<UninstalledAppletInstanceInfo[]>());

  private _newAppletInstances: Writable<DnaHashMap<NewAppletInstanceInfo[]>> = // We Group DnaHashes as keys
    writable(new DnaHashMap<NewAppletInstanceInfo[]>()); // Applet instances that have been added to the we group by someone else
  // but aren't installed locally yet by the agent.

  // private _groups: Writable<DnaHashMap<WeGroupStore>> =
  //   writable(new DnaHashMap<WeGroupStore>()); // We Group DnaHashes as keys

  private _installedAppletClasses: Writable<EntryHashMap<AppletClassInfo>> =
    writable(new EntryHashMap<AppletClassInfo>()); // devhub release entry hashes of Applets as keys

  private _appletGuis: EntryHashMap<NhLauncherApplet> = new EntryHashMap<NhLauncherApplet>(); // devhub hApp release entry hashes of Applets as keys --> no duplicate applet renderers for the same applet class
  private _appletInstanceRenderers: EntryHashMap<AppletRenderers> =
    new EntryHashMap<AppletRenderers>(); // EntryHash of Applet entries in the respective we DNA as keys
  private _appletClassRenderers: EntryHashMap<AppletRenderers> =
    new EntryHashMap<AppletRenderers>(); // devhub hApp release hashes of applets as keys

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

  public get myAgentPubKey() {
    return this.appAgentWebsocket.myPubKey;
  }

  private constructor(
    public appWebsocket: AppWebsocket,
    protected adminWebsocket: AdminWebsocket,
    protected appAgentWebsocket: AppAgentWebsocket,
    protected weParentAppInfo: AppInfo,
    public membraneInvitationsStore: MembraneInvitationsStore,
    protected appletsService: GlobalAppletsService,
  ) {
    this.appWebsocket = appWebsocket;
    this.adminWebsocket = adminWebsocket;
    this.appAgentWebsocket = appAgentWebsocket;
    this.weParentAppInfo = weParentAppInfo;
    this.membraneInvitationsStore = membraneInvitationsStore;
  }

  static async connect(
    appWebsocket: AppWebsocket,
    adminWebsocket: AdminWebsocket,
    weParentAppInfo: AppInfo,
  ) {
    const appAgentWebsocket = await AppAgentWebsocket.connect(`ws://localhost:${import.meta.env.VITE_HC_PORT}`, "we");

    console.log("@matrix-store: Creating new MembraneInvitationsStore");
    const membraneInvitationsStore = new MembraneInvitationsStore(
      (appAgentWebsocket as AppAgentClient),
      "lobby",
      "membrane_invitations_coordinator"
    );
    console.log("@matrix-store: MembraneInvitationsStore: ", membraneInvitationsStore);

    const appletsService = new GlobalAppletsService(appAgentWebsocket);

    return new MatrixStore(
      appWebsocket,
      adminWebsocket,
      appAgentWebsocket,
      weParentAppInfo,
      membraneInvitationsStore,
      appletsService,
    );
  }

  public matrix(): Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> {
    return derived(this._matrix, (matrix) => matrix);
  }

  public profilesStore(
    weGroupId: DnaHash
  ): Readable<ProfilesStore | undefined> {
    return derived(this._matrix, (matrix) =>
      matrix.get(weGroupId) ? matrix.get(weGroupId)[0].profilesStore : undefined
    );
  }

  public peerStatusStore(
    weGroupId: DnaHash
  ): Readable<PeerStatusStore | undefined> {
    return derived(this._matrix, (matrix) =>
      matrix.get(weGroupId)
        ? matrix.get(weGroupId)[0].peerStatusStore
        : undefined
    );
  }

  public sensemakerStore(
    weGroupId: DnaHash
  ): Readable<SensemakerStore | undefined> {
    return derived(this._matrix, (matrix) =>
      matrix.get(weGroupId) ? matrix.get(weGroupId)[0].sensemakerStore : undefined
    );
  }

  /**
   * Gets we group info from the matrix store
   *
   * @param weGroupId : DnaHash
   * @returns : WeInfo
   */
  public getWeGroupInfo(weGroupId): WeInfo | undefined {
    if (weGroupId) {
      return get(this._matrix).get(weGroupId)
        ? get(this._matrix).get(weGroupId)[0].info.info
        : undefined;
    }
  }

  /**
   * Fetches we group info from the conductor
   *
   * @param weGroupId : DnaHash
   * @returns : Promise<Readable<WeInfo>>
   */
  public async fetchWeGroupInfo(weGroupId: DnaHash): Promise<Readable<WeInfo>> {
    const appAgentWebsocket = get(this._matrix).get(weGroupId)[0].appAgentWebsocket;
    const info = await appAgentWebsocket.callZome({
      cell_id: [weGroupId, appAgentWebsocket.myPubKey],
      zome_name: "we_coordinator",
      fn_name: "get_info",
      payload: null,
    });
    return readable(info);
  }

  /**
   * Gets we group info from the matrix store
   *
   * @returns : WeGroupInfo[]
   */
  public getAllWeGroupInfos(): Readable<WeGroupInfo[]> {
    return readable(
      get(this._matrix)
        .values()
        .map(([groupData, _]) => groupData.info)
    );
  }

  public getAppletClassInfo(
    appletClassId: EntryHash
  ): Readable<AppletClassInfo | undefined> {
    // const classStrings = get(this._installedAppletClasses).keys().map(())

    return derived(this._installedAppletClasses, (hashMap) => {
      const maybeClass = hashMap
        .entries()
        .find(
          ([classId, classInfo]) =>
            JSON.stringify(classId) === JSON.stringify(appletClassId)
        );
      return maybeClass ? maybeClass[1] : undefined;
    });
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
        (appletInstanceInfo) =>
          JSON.stringify(appletInstanceInfo.appletId) ===
          JSON.stringify(appletInstanceId)
      );

    if (maybeInstalled) return true;
    return false;
  }

  /**
   * Checks whether the specified applet Instance is installed in the conductor
   *
   * @param weGroupId
   * @param appletInstanceId
   */
  public isInstalledInGroup(
    appletInstanceId: EntryHash,
    weGroupId: DnaHash
  ): boolean {
    const maybeInstalled = get(this._matrix)
      .get(weGroupId)[1]
      .find(
        (appletInstanceInfo) =>
          JSON.stringify(appletInstanceInfo.appletId) ===
          JSON.stringify(appletInstanceId)
      );

    if (maybeInstalled) return true;
    return false;
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
      this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id[0];
    const [_weGroupData, appInstanceInfos] = get(this._matrix).get(weGroupId);
    const appInfo = appInstanceInfos.find(
      (info) =>
        JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
    )!.appInfo;

    const appletAppAgentWebsocket = await AppAgentWebsocket.connect(`ws://localhost:${import.meta.env.VITE_HC_PORT}`, appInfo.installed_app_id);

    const renderers = await gui.appletRenderers(
      this.appWebsocket,
      appletAppAgentWebsocket,
      this.adminWebsocket,
      weServices,
      //@ts-ignore
      [{ weInfo: this.getWeGroupInfo(weGroupId)!, appInfo }]
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
      this.appWebsocket,
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
  async queryAppletGui(devhubHappReleaseHash): Promise<NhLauncherApplet> {

    const appletGui = await this.appletsService.queryAppletGui(devhubHappReleaseHash);

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
  ): Readable<AppletInstanceInfo[] | undefined> {
    return readable(
      get(this._matrix).get(groupDnaHash)
        ? get(this._matrix).get(groupDnaHash)[1]
        : undefined
    );
    // return derived(this._matrix, (matrix) => {
    //   return matrix.get(groupDnaHash)[1];
    // })
  }

  /**Gets an array of all AppletInfo of the applets installed for the specified group */
  public getUninstalledAppletInstanceInfosForGroup(
    groupDnaHash: DnaHash
  ): Readable<UninstalledAppletInstanceInfo[] | undefined> {
    return readable(
      get(this._uninstalledAppletInstances).get(groupDnaHash)
        ? get(this._uninstalledAppletInstances).get(groupDnaHash)
        : undefined
    );
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
  ): Promise<Readable<[EntryHash, Applet, DnaHash[]][]>> {
    const weGroupCellId = get(this._matrix).get(weGroupId)[0].info.cell_id;
    const allApplets = await this.appletsService.getAllApplets(weGroupCellId);
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
    const allApplets: [EntryHash, Applet, DnaHash[]][] = get(
      await this.fetchAllApplets(weGroupId)
    );

    const weGroupCellId = get(this._matrix).get(weGroupId)[0].info.cell_id;

    // const [weGroupData, installedApplets] = get(this._matrix).get(weGroupId);
    const appletsIAmPlaying: [EntryHash, PlayingApplet, DnaHash[]][] =
      await this.appletsService.getAppletsIAmPlaying(weGroupCellId); // where the applet entry hashes are the keys

    const newApplets = allApplets.filter(
      ([_entryHash, applet, _federatedGroups]) => {
        return !appletsIAmPlaying
          .map(([_entryHash, playingApplet, _federatedGroups]) =>
            JSON.stringify(playingApplet.applet.networkSeed)
          ) // [Applet, Applet, Applet]
          .includes(JSON.stringify(applet.networkSeed));
      }
    );

    const newAppletInstanceInfos: NewAppletInstanceInfo[] = newApplets.map(
      ([entryHash, applet, federatedGroups]) => {
        return {
          appletId: entryHash,
          applet,
          federatedGroups,
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
    return getCellId(weParentAppInfo.cell_info["we"].find((cellInfo) => "provisioned" in cellInfo)!)![0];
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
    let uninstalledAppletInstances = new DnaHashMap<
      UninstalledAppletInstanceInfo[]
    >();

    let weParentAppInfo: AppInfo = await this.appWebsocket.appInfo({ installed_app_id: this.weParentAppInfo.installed_app_id });

    // fetch all apps from the conductor
    let allApps = await this.adminWebsocket.listApps({});
    // 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them
    // not sure if the ordering here is deterministic as to ensure that the we group cells match the sensemaker cells
    let allWeClones = weParentAppInfo.cell_info["we"].filter((cellInfo) => "cloned" in cellInfo);
    let allSensemakerClones = weParentAppInfo.cell_info["sensemaker"].filter((cellInfo) => "cloned" in cellInfo);
    if(allWeClones.length != allSensemakerClones.length){
      throw new Error("The number of we group cells and sensemaker cells is not equal, but they should be.");
    }

    let allGroupClones: [CellInfo, CellInfo][] = allWeClones.map((weCellInfo, index) => {
      return [weCellInfo, allSensemakerClones[index]]
    });

    // for each we group, create the WeGroupStore and fetch all the applets of that group
    // that the agent has installed locally
    await Promise.all(
      allGroupClones.map(async ([weGroupCell, sensemakerGroupCell]) => {
        // create store
        const weGroupCellInfo = (weGroupCell as { [CellType.Cloned]: ClonedCell }).cloned;
        const weGroupCellId = weGroupCellInfo.cell_id;
        const weGroupDnaHash = weGroupCellId[0];

        const sensemakerGroupCellInfo = (sensemakerGroupCell as { [CellType.Cloned]: ClonedCell }).cloned;
        const sensemakerGroupCellId = sensemakerGroupCellInfo.cell_id;
        const sensemakerGroupDnaHash = sensemakerGroupCellId[0];

        // create dedicated AppAgentWebsocket for each We group
        const weGroupAgentWebsocket = await AppAgentWebsocket.connect("ws://localhost:9001", "we");


        // TODO! Add unsubscribe handle to WeGroupData as well.
        // TODO: add signal handling for sensemaker cell
        // add signal handler to listen for "NewApplet" events
        weGroupAgentWebsocket.on("signal", (signal: AppSignal) => {
          const payload = (signal.payload as SignalPayload);
          const cellId = signal.cell_id;

          // filter by cell id
          if (!payload.message || JSON.stringify(cellId) !== JSON.stringify(weGroupCellId)) return;

          switch (payload.message.type) {
            case "NewApplet":
              this._newAppletInstances.update((store) => {
                const newAppletInstanceInfo: NewAppletInstanceInfo = {
                  appletId: payload.applet_hash,
                  applet: payload.message.content,
                  federatedGroups: payload.federated_groups,
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
          new ProfilesClient(weGroupAgentWebsocket, weGroupCellInfo.clone_id!)
        );

        const peerStatusStore = new PeerStatusStore(new PeerStatusClient(weGroupAgentWebsocket, 'we')); // TODO: check this
        const sensemakerStore = new SensemakerStore(weGroupAgentWebsocket, sensemakerGroupCellInfo.clone_id!);
        const appletConfig = await sensemakerStore.registerApplet(defaultAppletConfig);
        sensemakerStore.registerWidget(
          [encodeHashToBase64(appletConfig.dimensions["thumbs_up"]), encodeHashToBase64(appletConfig.dimensions["total_thumbs_up"])],
          TotalThumbsUpDimensionDisplay,
          ThumbsUpDimenionAssessment,
        );

        sensemakerStore.registerWidget(
          [encodeHashToBase64(appletConfig.dimensions["five_star"]), encodeHashToBase64(appletConfig.dimensions["average_star"])],
          AverageStarDimensionDisplay,
          StarDimensionAssessment,
        );


        // create WeGroupData object
        const weInfo = await weGroupAgentWebsocket.callZome({
          cell_id: weGroupCellId,
          zome_name: "we_coordinator",
          fn_name: "get_info",
          payload: null
        });

        console.log("weInfo: ", weInfo);

        const weGroupInfo: WeGroupInfo = {
          info: weInfo!,
          cell_id: weGroupCellId,
          dna_hash: weGroupDnaHash,
          cloneName: weGroupCellInfo.name,
          enabled: weGroupCellInfo.enabled,
        };

        const weGroupData: WeGroupData = {
          info: weGroupInfo,
          appAgentWebsocket: weGroupAgentWebsocket,
          profilesStore,
          peerStatusStore,
          sensemakerStore,
        };

        // 2. fetch installed applet instances from the source chain for each we group and populate installedAppletClasses along the way
        const appletsIAmPlaying =
          await this.appletsService.getAppletsIAmPlaying(weGroupCellId);

        const appletInstanceInfos: AppletInstanceInfo[] = appletsIAmPlaying
          .filter(([_entryHash, playingApplet, _federatedGroups]) => {
            return !!allApps.find((app) =>
              this.isSameApp(app, playingApplet.applet)
            );
          })
          .map(([entryHash, playingApplet, federatedGroups]) => {
            const appletClassInfo: AppletClassInfo = {
              devhubHappReleaseHash: playingApplet.applet.devhubHappReleaseHash,
              title: playingApplet.applet.title,
              logoSrc: playingApplet.applet.logoSrc,
              description: playingApplet.applet.description,
            };

            const appletInstanceInfo: AppletInstanceInfo = {
              appletId: entryHash,
              appInfo: allApps.find((app) =>
                this.isSameApp(app, playingApplet.applet)
              )!,
              applet: playingApplet.applet,
              federatedGroups,
            };

            // populate installedAppletClasses along the way
            installedAppletClasses.put(
              playingApplet.applet.devhubHappReleaseHash,
              appletClassInfo
            );

            return appletInstanceInfo;
          });

        // filter out deleted applets as well (would be a bit more efficient if done together with the loop above)
        const uninstalledAppletInstanceInfos: UninstalledAppletInstanceInfo[] =
          appletsIAmPlaying
            .filter(([_entryHash, playingApplet, _federatedGroups]) => {
              return !allApps.find((app) =>
                this.isSameApp(app, playingApplet.applet)
              );
            })
            .map(([entryHash, playingApplet, federatedGroups]) => {
              const uninstalledAppletInstanceInfo: UninstalledAppletInstanceInfo =
                {
                  appletId: entryHash,
                  applet: playingApplet.applet,
                  federatedGroups,
                };

              return uninstalledAppletInstanceInfo;
            });

        uninstalledAppletInstances.put(
          weGroupDnaHash,
          uninstalledAppletInstanceInfos
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

    this._installedAppletClasses.set(installedAppletClasses);
    this._uninstalledAppletInstances.set(uninstalledAppletInstances);

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
    const appInfo = this.weParentAppInfo;

    const weCellInfo = appInfo.cell_info["we"].find((cellInfo) => "provisioned" in cellInfo);
    const weDnaHash = getCellId(weCellInfo!)![0];

    const records =
      await this.membraneInvitationsStore.service.getCloneRecipesForDna(
        weDnaHash
      );

    const clones: Array<EntryRecord<CloneDnaRecipe>> = records.map(
      (r) => new EntryRecord(r)
    );

    const recipe = clones.find(
      (c) => c.entry.resultingDnaHash.toString() === weGroupId.toString()
    )!;

    // membrane invitations API will need to change uid --> network_seed
    await this.membraneInvitationsStore.service.inviteToJoinMembrane(
      recipe.entry,
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

    // generate random network seed (maybe use random words instead later, e.g. https://www.npmjs.com/package/generate-passphrase)
    const networkSeed = uuidv4();

    const newWeGroupDnaHash = await this.installWeGroup(name, logo, networkSeed, encodeHashToBase64(this.myAgentPubKey)); // this line also updates the matrix store

    const appInfo = this.weParentAppInfo;

    const weCellInfo = appInfo.cell_info["we"].find((cellInfo) => "provisioned" in cellInfo);
    const weDnaHash = getCellId(weCellInfo!)![0];

    const properties = {
      logoSrc: logo,
      name: name,
      networkSeed,
      caPubKey: encodeHashToBase64(this.myAgentPubKey),
    };

    const _recipeActionHash =
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
    networkSeed: string,
    caPubKey: string,
  ): Promise<DnaHash> {
    const newWeGroupDnaHash = await this.installWeGroup(name, logo, networkSeed, caPubKey);
    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
    return newWeGroupDnaHash;
  }

  private async installWeGroup(
    name: string,
    logo: string,
    networkSeed: string,
    caPubKey: string,
  ): Promise<DnaHash> {
    const weParentAppInfo = this.weParentAppInfo;

    // const weGroupCell = weParentAppInfo.cell_data.find(
    //   (c) => c.role_id === "we"
    // )!;
    // const myAgentPubKey = encodeHashToBase64(weGroupCell.cell_id[1]);
    // const weDnaHash = encodeHashToBase64(weGroupCell.cell_id[0]);

    // const sensemakerCell = weParentAppInfo.cell_data.find(
    //   (c) => c.role_id === "sensemaker"
    // )!;
    // const sensemakerDnaHash = encodeHashToBase64(sensemakerCell.cell_id[0]);

    const properties = {
      logoSrc: logo,
      name: name,
      networkSeed,
    };

    // hash network seed to not expose it in the app id but still
    // be able to detect the cell based on the network seed
    const hashedNetworkSeed = md5(networkSeed, { asString: true });

    const cloneName = `group@we-${name}-${hashedNetworkSeed}`;
    const sensemakerCloneName = `${cloneName}-sensemaker`

    const clonedCell = await this.appWebsocket.createCloneCell({
      app_id: weParentAppInfo.installed_app_id,
      role_name: "we",
      modifiers: {
        network_seed: networkSeed,
        properties,
      },
      name: cloneName,
    });

    console.log("CREATED GROUP CELL CLONE: ", clonedCell);
    console.log("...with DNA hash: ", encodeHashToBase64(clonedCell.cell_id[0]));

    // const dnaDefinition = await this.adminWebsocket.getDnaDefinition(clonedCell.cell_id[0]);
    // console.log("DnaDefinition of created clone: ", dnaDefinition);

    const newWeGroupCellId = clonedCell.cell_id;
    await this.adminWebsocket.authorizeSigningCredentials(newWeGroupCellId);

    
    const appAgentWebsocket = await AppAgentWebsocket.connect(`ws://localhost:${import.meta.env.VITE_HC_PORT}`, weParentAppInfo.installed_app_id);

    // const newAppInfo: InstalledAppInfo = await this.adminWebsocket.installApp({
    //   installed_app_id,
    //   agent_key: decodeHashFromBase64(myAgentPubKey) as Buffer,
    //   dnas: [
    //     {
    //       hash: newWeGroupHash,
    //       role_id: name,
    //     },
    //   ],
    // });
    // const enabledResult = await this.adminWebsocket.enableApp({
    //   installed_app_id,
    // });

    // add signal handler to listen for "NewApplet" events
    
    
    const sensemaker_properties = {
      ...properties,
      sensemaker_config: {
        neighbourhood: properties.name,
        wizard_version: "v0.1",
        community_activator: caPubKey
      },
      applet_configs: [],
    };
    const clonedSensemakerCell = await this.appWebsocket.createCloneCell({
      app_id: weParentAppInfo.installed_app_id,
      role_name: "sensemaker",
      modifiers: {
        network_seed: networkSeed,
        properties: sensemaker_properties,
      },
      name: sensemakerCloneName,
    });

    console.log("CREATED SM GROUP CELL CLONE: ", clonedSensemakerCell);
    console.log("...with DNA hash: ", encodeHashToBase64(clonedSensemakerCell.cell_id[0]));

    await this.adminWebsocket.authorizeSigningCredentials(clonedSensemakerCell.cell_id);
    // add signal handler to listen for "NewApplet" events
    // TODO: will probably want to add signal handler for sensemaker-lite as well
    appAgentWebsocket.on("signal", (signal) => {
      const payload = (signal.payload as SignalPayload);
      const cellId = signal.cell_id;

      // filter by cell id
      if (!payload.message || JSON.stringify(cellId) !== JSON.stringify(newWeGroupCellId)) return;

      switch (payload.message.type) {
        case "NewApplet":
          this._newAppletInstances.update((store) => {
            const newAppletInstanceInfo: NewAppletInstanceInfo = {
              appletId: payload.applet_hash,
              applet: payload.message.content,
              federatedGroups: payload.federated_groups,
            };

            let updatedList = store.get(newWeGroupCellId[0]);
            updatedList.push(newAppletInstanceInfo);

            store.put(newWeGroupCellId[0], updatedList);

            return store;
          });
          break;
      }
    });

    // Because createCloneCell currently returns InstalledCell instead of Cell, we need to manually get
    // the clone_id via appInfo at the moment.
    const appInfo = await this.appAgentWebsocket.appInfo();
    
    const cellInfo = appInfo.cell_info["we"].filter((cellInfo) => "cloned" in cellInfo)
      .find((cellInfo) => JSON.stringify((cellInfo as { [CellType.Cloned]: ClonedCell }).cloned.cell_id) === JSON.stringify(clonedCell.cell_id));
    const cell = (cellInfo as { [CellType.Cloned]: ClonedCell }).cloned!;
    const sensemakerCellInfo = appInfo.cell_info["sensemaker"].filter((cellInfo) => "cloned" in cellInfo)
      .find((cellInfo) => JSON.stringify((cellInfo  as { [CellType.Cloned]: ClonedCell }).cloned.cell_id) === JSON.stringify(clonedSensemakerCell.cell_id));
    const sensemakerCell = (sensemakerCellInfo as { [CellType.Cloned]: ClonedCell }).cloned!;

    const profilesStore = new ProfilesStore(new ProfilesClient(appAgentWebsocket, cell.clone_id!));
    const peerStatusStore = new PeerStatusStore(new PeerStatusClient(appAgentWebsocket, 'we'));
    const sensemakerStore = new SensemakerStore(appAgentWebsocket, sensemakerCell.clone_id!);

    // Delay widget registration until new Sensemaker cell is cached.
    setTimeout(async () => {
      const appletConfig = await sensemakerStore.registerApplet(defaultAppletConfig);
      sensemakerStore.registerWidget(
        [encodeHashToBase64(appletConfig.dimensions["thumbs_up"]), encodeHashToBase64(appletConfig.dimensions["total_thumbs_up"])],
        TotalThumbsUpDimensionDisplay,
        ThumbsUpDimenionAssessment,
      );
      sensemakerStore.registerWidget(
        [encodeHashToBase64(appletConfig.dimensions["five_star"]), encodeHashToBase64(appletConfig.dimensions["average_star"])],
        AverageStarDimensionDisplay,
        StarDimensionAssessment,
        );
      }, 1500);
    
    this._matrix.update((matrix) => {
      const weInfo: WeInfo = {
        logoSrc: properties.logoSrc,
        name: properties.name,
      };

      const weGroupInfo: WeGroupInfo = {
        info: weInfo,
        cell_id: clonedCell.cell_id,
        dna_hash: clonedCell.cell_id[0],
        cloneName: cell.name, // TODO! once implemented in the js-client
        enabled: cell.enabled,
      };

      const weGroupData: WeGroupData = {
        info: weGroupInfo,
        appAgentWebsocket,
        profilesStore,
        peerStatusStore,
        sensemakerStore,
      };

      if (!matrix.get(newWeGroupCellId[0])) {
        matrix.put(newWeGroupCellId[0], [weGroupData, []]);
      }

      return matrix;
    });

    return newWeGroupCellId[0];
  }

  async leaveWeGroup(weGroupId: DnaHash, deleteApplets?: boolean) {
    const weGroup = get(this._matrix).get(weGroupId);

    // uninstall all applet cells
    if (deleteApplets === true) {
      const groupApplets: AppletInstanceInfo[] = weGroup[1];

      await Promise.all(
        groupApplets.map(async (appletInfo) => {
          await this.adminWebsocket.uninstallApp({
            installed_app_id: appletInfo.appInfo.installed_app_id,
          });
          console.log(
            "uninstalled applet with installed_app_id: ",
            appletInfo.appInfo.installed_app_id
          );
        })
      );
    }

    // uninstall we group cell
    // disable we group cell
    await this.appWebsocket.disableCloneCell({
      app_id: this.weParentAppInfo.installed_app_id,
      clone_cell_id: weGroup[0].info.cell_id,
    })

    // delete archived we group cell
    await this.adminWebsocket.deleteCloneCell({
      app_id: this.weParentAppInfo.installed_app_id,
      clone_cell_id: weGroup[0].info.cell_id,
    });

    // update matrix
    await this.fetchMatrix();
  }

  public async removeInvitation(invitationActionHash: ActionHash) {
    await this.membraneInvitationsStore.removeInvitation(invitationActionHash);
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
    compressedWebHappInput?: Uint8Array
  ): Promise<void> {
    const isAlreadyInstalled = this.isInstalled(appletInstanceId);
    if (isAlreadyInstalled) return;

    const newApplets: DnaHashMap<NewAppletInstanceInfo[]> = get(
      this._newAppletInstances
    );
    let newAppletInfo = newApplets
      .get(weGroupId)
      .find(
        (info) =>
          JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
      );
    if (!newAppletInfo) {
      newAppletInfo = get(
        await this.fetchNewAppletInstancesForGroup(weGroupId)
      ).find(
        (info) =>
          JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
      );
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
        compressedWebHapp = await this.fetchWebHapp(
          newAppletInfo.applet.devhubHappReleaseHash,
          newAppletInfo.applet.devhubGuiReleaseHash,
        );
      } else {
        compressedWebHapp = compressedWebHappInput;
      }

      const [decompressedHapp, decompressedGui, _iconSrcOption] =
        this.decompressWebHapp(compressedWebHapp);

      const weGroupCellId = get(this._matrix).get(weGroupId)[0].info.cell_id;

      // just pick any network seed now because they are assumed to be the same across cells of the applet
      const networkSeed = Object.values(newAppletInfo.applet.networkSeed)[0];

      // hash network seed to not expose it in the app id but still
      // be able to detect the cell based on the network seed
      const hashedNetworkSeed = md5(networkSeed!, { asString: true });
      const installedAppId: InstalledAppId = `applet@we-${hashedNetworkSeed}-${newAppletInfo.applet.customName}`;

      // install app bundle
      const request: InstallAppRequest = {
        agent_key: weGroupCellId[1],
        installed_app_id: installedAppId,
        membrane_proofs: {},
        bundle: decompressedHapp,
        network_seed: networkSeed,
      };

      this.adminWebsocket
        .installApp(request)
        .then(
          async (appInfo) => {
            const installedCells = appInfo.cell_info;
            await Promise.all(
              Object.keys(installedCells).map(roleName => {
                installedCells[roleName].map(cellInfo => {
                  this.adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
                })
              })
            );
          }
        )
        .catch((e) => {
          // exact same applet can only be installed once to the conductor
          if (!(e.data.data as string).includes("AppAlreadyInstalled")) {
            throw new Error(e);
          }
        });

      const enabledAppInfo = await this.adminWebsocket.enableApp({
        installed_app_id: installedAppId,
      });

      const appInfo = enabledAppInfo.app;
      const anyPubKey = getCellId(Object.values(appInfo.cell_info)[0][0])![1];

      // register Applet entry in order to have it in the own source chain
      const registerAppletInput: RegisterAppletInput = {
        appletAgentPubKey: anyPubKey, // pick the pubkey of any of the cells
        applet: newAppletInfo.applet,
      };

      await this.appletsService.createApplet(weGroupCellId, registerAppletInput);

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
        appInfo: appInfo,
        applet: newAppletInfo.applet,
        federatedGroups: newAppletInfo.federatedGroups,
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
    appletMetaData: AppletMetaData,
    customName: InstalledAppId,
    compressedWebHapp?: Uint8Array
  ): Promise<EntryHash> {
    // --- Install hApp in the conductor---

    let decompressedHapp: AppBundle;
    let decompressedGui: Uint8Array;
    let iconSrcOption: IconSrcOption;

    if (!compressedWebHapp) {
      const compressedWebHapp = await this.fetchWebHapp(
        appletMetaData.devhubHappReleaseHash,
        appletMetaData.devhubGuiReleaseHash,
      );
      [decompressedHapp, decompressedGui, iconSrcOption] =
        await this.decompressWebHapp(compressedWebHapp);
    } else {
      [decompressedHapp, decompressedGui, iconSrcOption] =
        this.decompressWebHapp(compressedWebHapp);
    }

    const weGroupCellId = get(this._matrix).get(weGroupId)[0].info.cell_id;

    const networkSeed = uuidv4(); // generate random network seed if not provided

    // hash network seed to not expose it in the app id but still
    // be able to detect the cell based on the network seed
    const hashedNetworkSeed = md5(networkSeed, { asString: true });
    const installedAppId: InstalledAppId = `applet@we-${hashedNetworkSeed}-${customName}`;

    const request: InstallAppRequest = {
      agent_key: weGroupCellId[1],
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      network_seed: networkSeed,
    };

    await this.adminWebsocket
      .installApp(request)
      .then()
      .catch((e) => {
        if (!(e.data.data as string).includes("AppAlreadyInstalled")) {
          throw new Error(e);
        }
      });

    const enabledApp = await this.adminWebsocket.enableApp({
      installed_app_id: installedAppId,
    });
    const appInfo = enabledApp.app;

    // --- Commit UI in the lobby cell as private entry ---

    const appletGui: AppletGui = {
      devhubHappReleaseHash: appletMetaData.devhubHappReleaseHash,
      gui: decompressedGui,
    };

    const _ = await this.appletsService.commitGuiFile(appletGui);

    // --- Register hApp in the We DNA ---

    const dnaHashes: Record<string, DnaHash> = {};
    const networkSeedByRole: Record<string, string> = {};
    // add dna hashes and network seeds of all provisioned or deferred cells to the Applet entry
    Object.entries(appInfo.cell_info).forEach(([roleName, cellInfos]) => {
      const provisionedCell = cellInfos.find((cellInfo) => "provisioned" in cellInfo);
      const stemCell = cellInfos.find((cellInfo) => "stem" in cellInfo);
      if (stemCell && provisionedCell) {
        throw new Error(`Found a deferred cell and a provisioned cell for the role_name '${roleName}'`)
      }
      if (!stemCell && !provisionedCell) {
        throw new Error(`Found neither a deferred nor a provisioned cell for role_name '${roleName}'`)
      }
      if (provisionedCell) {
        dnaHashes[roleName] = (provisionedCell as { [CellType.Provisioned]: ProvisionedCell }).provisioned.cell_id[0];
        networkSeedByRole[roleName] = networkSeed!;
      }
      if (stemCell) {
        dnaHashes[roleName] = (stemCell as { [CellType.Stem]: StemCell }).stem.dna;
        networkSeedByRole[roleName] = networkSeed!;
      }
    });

    const applet: Applet = {
      customName,
      title: appletMetaData.title,
      description: appletMetaData.description,
      // logoSrc: appletInfo.icon, // this line should be taken instead once icons are supported by the devhub
      logoSrc: iconSrcOption,

      devhubHappReleaseHash: appletMetaData.devhubHappReleaseHash,
      devhubGuiReleaseHash: appletMetaData.devhubGuiReleaseHash,

      properties: {},
      networkSeed: networkSeedByRole,
      dnaHashes: dnaHashes,
    };

    const anyPubKey = getCellId(Object.values(appInfo.cell_info)[0][0])![1];

    const registerAppletInput: RegisterAppletInput = {
      appletAgentPubKey: anyPubKey, // pick the pubkey of any of the cells since it's the same for the whole hApp
      applet,
    };

    const appletInstanceId = await this.appletsService.createApplet(
      weGroupCellId,
      registerAppletInput
    );

    const appInstanceInfo: AppletInstanceInfo = {
      appletId: appletInstanceId,
      appInfo: appInfo,
      applet: applet,
      federatedGroups: [],
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

  /**
   * Installs the already existing applet in the specified We group to the conductor
   *
   * @param weGroupId : DnaHash
   * @param appletInstanceId : EntryHash
   * @returns void
   */
  async reinstallApplet(
    weGroupId: DnaHash,
    appletInstanceId: EntryHash,
    compressedWebHappInput?: Uint8Array
  ): Promise<void> {
    const isAlreadyInstalled = this.isInstalledInGroup(
      appletInstanceId,
      weGroupId
    );
    if (isAlreadyInstalled) return;

    const uninstalledApplets: DnaHashMap<NewAppletInstanceInfo[]> = get(
      this._uninstalledAppletInstances
    );
    let uninstalledAppletInfo = uninstalledApplets
      .get(weGroupId)
      .find(
        (info) =>
          JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
      );

    if (!uninstalledAppletInfo) {
      console.error(
        "Could not find the applet in the record of uninstalled applets."
      );
    } else {
      // fetch hApp and GUI   <---- COULD BE IMPROVED BY TAKING IT FROM LOCAL STORAGE IN CASE THE SAME APPLET CLASS HAS BEEN INSTALLED EARLIER
      // add logic here in case webhapp is installed from the file system.
      let compressedWebHapp: Uint8Array;

      if (!compressedWebHappInput) {
        compressedWebHapp = await this.fetchWebHapp(
          uninstalledAppletInfo.applet.devhubHappReleaseHash,
          uninstalledAppletInfo.applet.devhubGuiReleaseHash,
        );
      } else {
        compressedWebHapp = compressedWebHappInput;
      }

      const [decompressedHapp, decompressedGui, _iconSrcOption] =
        this.decompressWebHapp(compressedWebHapp);

      const weGroupCellId = get(this._matrix).get(weGroupId)[0].info.cell_id;

      const network_seed = Object.values(
        uninstalledAppletInfo.applet.networkSeed
      )[0];
      const installedAppId = `applet@we-${network_seed}-${uninstalledAppletInfo.applet.customName}`;

      // install app bundle
      const request: InstallAppRequest = {
        agent_key: weGroupCellId[1],
        installed_app_id: installedAppId,
        membrane_proofs: {},
        bundle: decompressedHapp,
        network_seed: network_seed,
      };

      this.adminWebsocket
        .installApp(request)
        .then()
        .catch((e) => {
          if (!(e.data.data as string).includes("AppAlreadyInstalled")) {
            throw new Error(e);
          }
        });

      const enabledAppInfo = await this.adminWebsocket.enableApp({
        installed_app_id: installedAppId,
      });

      const appInfo = enabledAppInfo.app;

      // <--- no need to re-register applet -->
      // <--- no need to re-commit GUI to source chain as private entry -->

      const appInstanceInfo: AppletInstanceInfo = {
        appletId: appletInstanceId,
        appInfo: appInfo,
        applet: uninstalledAppletInfo.applet,
        federatedGroups: uninstalledAppletInfo.federatedGroups,
      };
      // update stores
      // update _matrix
      this._matrix.update((matrix) => {
        matrix.get(weGroupId)[1].push(appInstanceInfo);
        return matrix;
      });

      // update _uninstalledAppletInstances
      this._uninstalledAppletInstances.update((hashMap) => {
        const filteredArray = hashMap
          .get(weGroupId)
          .filter((info) => info.appletId != appletInstanceId);
        hashMap.put(weGroupId, filteredArray);
        return hashMap;
      });

      // update _installedAppletClasses
      if (
        !get(this._installedAppletClasses).get(
          uninstalledAppletInfo.applet.devhubHappReleaseHash
        )
      ) {
        this._installedAppletClasses.update((hashMap) => {
          hashMap.put(uninstalledAppletInfo!.applet.devhubHappReleaseHash, {
            title: uninstalledAppletInfo!.applet.title,
            logoSrc: uninstalledAppletInfo!.applet.logoSrc,
            description: uninstalledAppletInfo!.applet.description,
            devhubHappReleaseHash:
              uninstalledAppletInfo!.applet.devhubHappReleaseHash,
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
  async federateApplet(
    callingGroupId: DnaHash, // Dna Hash of the group initiating the federation
    federatedGroupId: DnaHash, // Dna Hash of the group with which the applet is federated with
    appletInstanceInfo: AppletInstanceInfo // applet instance info of the applet to be federated
    // compressedWebHapp?: Uint8Array, // federating only possible via the devhub!
  ): Promise<EntryHash> {
    // --- Install hApp in the conductor---

    const compressedWebHapp = await this.fetchWebHapp(
      appletInstanceInfo.applet.devhubHappReleaseHash,
      appletInstanceInfo.applet.devhubGuiReleaseHash,
    );
    const [decompressedHapp, decompressedGui, iconSrcOption] =
      await this.decompressWebHapp(compressedWebHapp);

    const callingGroupCellId = get(this._matrix).get(callingGroupId)[0].info.cell_id;

    const weGroupCellId = get(this._matrix).get(federatedGroupId)[0].info.cell_id;

    const networkSeed = Object.values(appletInstanceInfo.applet.networkSeed)[0]; // assume network seed of all cells of this applet are equal
    const customName = appletInstanceInfo.applet.customName;

    const installedAppId: InstalledAppId = `applet@we-${networkSeed}-${customName}`;

    // if applet is already federated with this group, throw an error
    const existingApplets = get(
      this.getAppletInstanceInfosForGroup(federatedGroupId)
    );
    if (existingApplets) {
      existingApplets.forEach((appletInstanceInfo) => {
        if (
          appletInstanceInfo.appInfo.installed_app_id ===
          installedAppId
        ) {
          throw new Error(
            `The applet with id ${installedAppId} is already installed for this group.`
          );
        }
      });
    }

    const request: InstallAppRequest = {
      agent_key: weGroupCellId[1],
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      network_seed: networkSeed,
    };

    this.adminWebsocket
      .installApp(request)
      .then()
      .catch((e) => {
        if (!(e.data.data as string).includes("AppAlreadyInstalled")) {
          throw new Error(e);
        }
      });

    const enabledApp = await this.adminWebsocket.enableApp({
      installed_app_id: installedAppId,
    });
    const appInfo = enabledApp.app;

    // --- Commiting UI in the lobby cell as private entry not required ---

    // --- Register hApp in the We DNA ---

    const dnaHashes: Record<string, DnaHash> = {};
    const networkSeedByRole: Record<string, string> = {};

    // add dna hashes and network seeds of all provisioned cells to the Applet entry
    Object.entries(appInfo.cell_info).forEach(([roleName, cellInfos]) => {
      const provisionedCell = cellInfos.find((cellInfo) => "provisioned" in cellInfo);
      if (provisionedCell) {
        dnaHashes[roleName] = (provisionedCell as { [CellType.Provisioned]: ProvisionedCell }).provisioned.cell_id[0];
        networkSeedByRole[roleName] = networkSeed!;
      }
    });

    const applet: Applet = {
      customName,
      title: appletInstanceInfo.applet.title,
      description: appletInstanceInfo.applet.description,
      // logoSrc: appletInfo.icon, // this line should be taken instead once icons are supported by the devhub
      logoSrc: iconSrcOption,

      devhubHappReleaseHash: appletInstanceInfo.applet.devhubHappReleaseHash,
      devhubGuiReleaseHash: appletInstanceInfo.applet.devhubGuiReleaseHash,

      properties: {},
      networkSeed: networkSeedByRole,
      dnaHashes: dnaHashes,
    };

    const anyPubKey = getCellId(Object.values(appInfo.cell_info)[0][0])![1];

    const registerAppletInput: RegisterAppletInput = {
      appletAgentPubKey: anyPubKey, // pick the pubkey of any of the cells since it's the same for the whole hApp
      applet,
    };

    const appletInstanceId = await this.appletsService.createApplet(
      weGroupCellId,
      registerAppletInput
    );

    // federate applet in the backend, once for the calling group and once for the federated group
    await this.appletsService.federateApplet(
      callingGroupCellId,
      appletInstanceId,
      callingGroupId
    );
    await this.appletsService.federateApplet(
      callingGroupCellId,
      appletInstanceId,
      federatedGroupId
    );

    const appInstanceInfo: AppletInstanceInfo = {
      appletId: appletInstanceId,
      appInfo: appInfo,
      applet: applet,
      federatedGroups: [callingGroupId],
    };

    // update stores
    // update _matrix
    this._matrix.update((matrix) => {
      matrix.get(federatedGroupId)[1].push(appInstanceInfo);
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

  async disableApp(appInfo: AppInfo): Promise<void> {
    await this.adminWebsocket.disableApp({
      installed_app_id: appInfo.installed_app_id,
    });
    // update matrix to reflect the change in rendering
    await this.fetchMatrix();
  }

  async enableApp(appInfo: AppInfo): Promise<void> {
    await this.adminWebsocket.enableApp({
      installed_app_id: appInfo.installed_app_id,
    });
    // update matrix to reflect the change in rendering
    await this.fetchMatrix();
  }

  async uninstallApp(appInfo: AppInfo): Promise<void> {
    await this.adminWebsocket.uninstallApp({
      installed_app_id: appInfo.installed_app_id,
    });
    // update matrix to reflect the change in rendering
    await this.fetchMatrix();
  }

  async fetchWebHapp(releaseEntryHash: EntryHash, guiEntryHash: EntryHash): Promise<Uint8Array> {
    const devhubHapp = await this.getDevhubHapp();

    const compressedWebHapp = await fetchWebHapp(
      this.appWebsocket,
      devhubHapp,
      "hApp", // This is chosen arbitrarily at the moment
      releaseEntryHash,
      guiEntryHash,
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

  // +++++++++++++++      P L U G I N   Z O M E  M E T H O D S ++++++++++++++++++++++++++++++++++++++++++++++++++

  // public async supportsFederation(appletInstanceId: EntryHash): Promise<boolean> {

  //   let appletInstanceInfo = this.getAppletInstanceInfo(appletInstanceId);
  //   appletInstanceInfo?.installedAppInfo.

  //   return false;
  // }

  // +++++++++++++++      H E L P E R    M E T H O D S    B E L O W      +++++++++++++++++++++++++++++++

  public async getDevhubHapp(): Promise<AppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find(
      (app) => app.installed_app_id === getDevHubAppId()
    )!;
  }

  getWeGroupInfoForAppletInstance(appletInstanceId: EntryHash): WeGroupInfo {
    return get(this._matrix)
      .values()
      .filter(([_groupData, appletInfos]) => {
        return (
          appletInfos.filter(
            (appletInfo) =>
              JSON.stringify(appletInfo.appletId) ===
              JSON.stringify(appletInstanceId)
          ).length > 0
        );
      })[0][0].info;
  }

  /**
   * Gets info about an uninstalled applet
   *
   * @param appletInstanceId : EntryHash
   * @returns NewAppletInstanceInfo | undefined
   */
  public getUninstalledAppletInstanceInfo(
    appletInstanceId: EntryHash
  ): NewAppletInstanceInfo | undefined {
    return get(this._uninstalledAppletInstances)
      .values()
      .flat()
      .find(
        (info) =>
          JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
      );
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
    console.log(
      "@matrix-store: @getNewAppletInstanceInfo: this._newAppletInstances: ",
      get(this._newAppletInstances)
    );
    return get(this._newAppletInstances)
      .values()
      .flat()
      .find(
        (info) =>
          JSON.stringify(info.appletId) === JSON.stringify(appletInstanceId)
      );
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
        (appletInstanceInfo) =>
          JSON.stringify(appletInstanceInfo.appletId) ===
          JSON.stringify(appletInstanceId)
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
  ): AppletInfo[] {
    const matrix = get(this._matrix);
    let appletInfosOfClass: AppletInfo[] = [];
    matrix.values().forEach(([weGroupData, appletInstanceInfos]) => {
      const weInfo: WeInfo = weGroupData.info.info;
      const relevantAppletInstanceInfos = appletInstanceInfos.filter(
        (info) =>
          JSON.stringify(info.applet.devhubHappReleaseHash) ===
          JSON.stringify(devhubHappReleaseHash)
      );
      const relevantInstalledAppletInfos = relevantAppletInstanceInfos.map(
        (appletInstanceInfo) => {
          const installedAppletInfo: AppletInfo = {
            weInfo,
            appInfo: appletInstanceInfo.appInfo,
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
   * It assumes that of every role
   * @param installedAppInfo
   * @param applet
   * @returns
   */
  isSameApp(appInfo: AppInfo, applet: Applet): boolean {
    let isSame = true;
    Object.entries(appInfo.cell_info).forEach(([roleName, cellInfos]) => {
      const provisionedCell = cellInfos.find((cellInfo) => "provisioned" in cellInfo);
      const stemCell = cellInfos.find((cellInfo) => "stem" in cellInfo);
      let dnaHash: Uint8Array;
      if (stemCell && provisionedCell) {
        throw new Error(`Found a deferred cell and a provisioned cell for the role_name '${roleName}'`)
      }
      if (!stemCell && !provisionedCell) {
        throw new Error(`Found neither a deferred nor a provisioned cell for role_name '${roleName}'`)
      }
      if (provisionedCell) {
        dnaHash = (provisionedCell as { [CellType.Provisioned]: ProvisionedCell }).provisioned.cell_id[0];
      }
      if (stemCell) {
        dnaHash = (stemCell as { [CellType.Stem]: StemCell }).stem.dna;
      }

      const dnaHashOfRoleId = applet.dnaHashes[roleName];
      if (
        !dnaHashOfRoleId ||
        encodeHashToBase64(dnaHashOfRoleId) !==
          encodeHashToBase64(dnaHash!)
      ) {
        isSame = false;
      }
    });

    return isSame;
  }
}
