import {
  writable,
  Writable,
  derived,
  Readable,
  get,
  readable,
} from "svelte/store";
import {
  AdminWebsocket,
  AppInfo,
  DnaHash,
  EntryHash,
  AgentPubKey,
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
  MembraneInvitationsStore,
  MembraneInvitationsClient,
} from "@neighbourhoods/membrane-invitations";
import { decode, encode } from "@msgpack/msgpack";
import {
  DnaHashMap,
  EntryHashMap,
} from "@holochain-open-dev/utils";
import {
  AppBlockDelegate,
  AppletRenderers,
  DimensionEh,
  InputAssessmentWidgetDelegate,
  NeighbourhoodApplet,
  NeighbourhoodAppletRenderers,
  NeighbourhoodInfo,
  OutputAssessmentWidgetDelegate,
  ResourceBlockDelegate,
  ResourceDefEh,
  ResourceEh,
  ResourceRenderers,
  SensemakerStore
} from "@neighbourhoods/client";
import {
  Applet,
  AppletInstanceInfo,
  AppletMetaData,
  NewAppletInstanceInfo,
  PlayingApplet,
  RegisterAppletInput,
  SignalPayload,
  UninstalledAppletInstanceInfo,
  WeGroupData,
  WeGroupInfo,
} from "./types";
import { getDevHubAppId } from "./processes/devhub/app-id";
import { fetchWebHapp } from "./processes/devhub/get-happs";
import { GlobalAppletsService } from "./global-applets-service";
import { ProfilesClient, ProfilesStore } from "@holochain-open-dev/profiles";
import { PeerStatusStore, PeerStatusClient } from "@holochain-open-dev/peer-status";
import {
  importModuleFromArrayBuffer,
  decompressWebHapp,
  toSha1
} from "./utils";
import {
  compareUint8Arrays,
  agentPubKey,
  dnaHash,
  getCellId,
  compareCellIds,
  getClonedCellId,
  getProvisionedDnaHash,
  getAppAgentWebsocket,
  createAppDelegate,
  createResourceBlockDelegate,
  createInputAssessmentWidgetDelegate,
  createOutputAssessmentWidgetDelegate
} from "@neighbourhoods/app-loader";

declare global {
  interface Crypto {
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}`;
  }
}

/*
TODO: it would be wonderful to be able to keep a separate list of the
installed applets. It's really inefficient to keep using this structure.
*/

/**
 * stores the Group/Applet matrix
 */
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

  private _appletGuis: EntryHashMap<NeighbourhoodApplet> = new EntryHashMap<NeighbourhoodApplet>(); // devhub hApp release entry hashes of Applets as keys

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
    const appAgentWebsocket = await getAppAgentWebsocket("we");

    console.log("@matrix-store: Creating new MembraneInvitationsStore");
    const membraneInvitationsStore = new MembraneInvitationsStore(new MembraneInvitationsClient(
      appAgentWebsocket,
      "lobby",
      "membrane_invitations_coordinator"
    ));

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
   * Returns the we group infos indexed by group hash
  */
 public weGroupInfos(): Readable<DnaHashMap<WeGroupInfo>> {
   return derived(this._matrix, (matrix) => {
     let groupInfos = new DnaHashMap<WeGroupInfo>();
     matrix
     .forEach(([groupData, _appletInstanceInfos], groupId) => {
       groupInfos.set(groupId, groupData.info);
      });
      return groupInfos;
    });
  }

    /**
     * Gets we group info from the matrix store
     * @param weGroupId : DnaHash
     * @returns : WeInfo
     */
    public getNeighbourhoodInfo(weGroupId: DnaHash): NeighbourhoodInfo | undefined {
      if (weGroupId) {
        const weGroupInfoMap = this.weGroupInfos()
        return get(weGroupInfoMap).get(weGroupId)
          ? get(weGroupInfoMap).get(weGroupId)[0].info
          : undefined;
      }
    }

  /**
   * Fetches we group info from the conductor
   *
   * @param weGroupId : DnaHash
   * @returns : Promise<Readable<WeInfo>>
   */
  public async fetchWeGroupInfo(weGroupId: DnaHash): Promise<Readable<NeighbourhoodInfo>> {
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
   * Checks whether the specified applet Instance is installed in the conductor
   *
   * @param weGroupId
   * @param appletInstanceId
   */
  public isInstalled(appletInstanceId: EntryHash): boolean {
    return [...get(this._matrix).values()]
      .map(
        ([_groupData, appletInfos]) => appletInfos.map(
          (appletInfo) => appletInfo.appletId
        )
      )
      .flat()
      .reduce(
        (installed, appletId) => installed || compareUint8Arrays(appletInstanceId, appletId),
        false as boolean
      );
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
    return get(this._matrix)
      .get(weGroupId)[1]
      .map(
        (appletInfo) => appletInfo.appletId
      )
      .reduce(
        (installed, appletId) => installed || compareUint8Arrays(appletInstanceId, appletId),
        false as boolean
      );
  }

  public getAppletInstanceInfoWithGroup(
    weGroupId: EntryHash,
    appletInstanceId: EntryHash,
  ) {
    const appInstanceInfo = get(this._matrix).get(weGroupId)[1].find(
      (info: { appletId: Uint8Array; }) => compareUint8Arrays(info.appletId, appletInstanceId)
    )
    if(appInstanceInfo) {
      return appInstanceInfo;
    } else {
      throw Error(`Could not find applet instance ${appletInstanceId.toString()}`)
    }
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
   * @param appletInstanceId
   * @returns
   */
  async fetchAppletInstanceRenderers(
    appletInstanceId: EntryHash
  ) {
    // Get app release hash
    const devhubHappReleaseHash = this.releaseHashOfAppletInstance(appletInstanceId)!;

    // Fetch the Applet
    const applet: NeighbourhoodApplet = await this.queryAppletGui(devhubHappReleaseHash);

    // Get Neighbourhood id
    // XXX: This seems like a very round-about way of getting the weGroupId, especially since
    // we get the same data we get from the matrix one step later.
    const weGroupId = dnaHash(this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id);
    const appInstanceInfo = get(this._matrix).get(weGroupId)[1].find(
      info => compareUint8Arrays(info.appletId, appletInstanceId)
    )!;

    // Check if the applets app agent websocket has been instantiated yet
    let appletAppAgentWebsocket: AppAgentClient;
    if (!appInstanceInfo.appAgentWebsocket) {
      //instantiate the websocket
      appletAppAgentWebsocket = await getAppAgentWebsocket(appInstanceInfo.appInfo.installed_app_id);
      appInstanceInfo.appAgentWebsocket = appletAppAgentWebsocket;
    }
    else {
      appletAppAgentWebsocket = appInstanceInfo.appAgentWebsocket;
    }

    // Build the Renderers Object
    const renderers: NeighbourhoodAppletRenderers = {
      appletRenderers: applet.appletRenderers,
      resourceRenderers: applet.resourceRenderers,
      assessmentWidgets: applet.assessmentWidgets
    }

    // now that the applet instance renderers have been fetched and instantiated, add them to the AppletInstanceInfo
    this._matrix.update((matrix) => {
      const appInstanceInfo = this.getAppletInstanceInfoWithGroup(weGroupId, appletInstanceId)
      appInstanceInfo.renderers = renderers;
      return matrix;
    })

    return renderers;
  }

  /**
   * Fetches the corresponding applet GUI from the lobby DNA if not already stored locally
   *
   * @param devhubHappReleaseHash
   * @returns
   */
  async queryAppletGui(devhubHappReleaseHash: Uint8Array): Promise<NeighbourhoodApplet> {
    let gui = this._appletGuis.get(devhubHappReleaseHash);

    if (!gui) {
      const appletGui = await this.appletsService.queryAppletGui(devhubHappReleaseHash);
      const appletUiBytes = appletGui.gui;
      const mod = await importModuleFromArrayBuffer(appletUiBytes)
      gui = mod.default;

      // update the renderers
      this._appletGuis.set(devhubHappReleaseHash, gui);
    }

    return gui;
  }

  /**
   * Creates an AppBlockDelegate to be passed into an applet block
   */
  public createAppDelegate(appletInstanceId: Uint8Array): AppBlockDelegate {
    // Get Neighbourhood id
    // XXX: This seems like a very round-about way of getting the weGroupId, especially since
    // we get the same data we get from the matrix one step later.
    const weGroupId = dnaHash(this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id);
    const weGroup = get(this._matrix).get(weGroupId);
    const appInstanceInfo = weGroup[1].find(
      info => compareUint8Arrays(info.appletId, appletInstanceId)
    )!;
    const weGroupData = weGroup[0];

    return createAppDelegate(
      appInstanceInfo.appAgentWebsocket!,
      appInstanceInfo.appInfo!,
      weGroupData.info.info,
      weGroupData.sensemakerStore
    );
  }

  /**
   * Creates an ResourceBlockDelegate to be passed into an resource block
   */
  public createResourceBlockDelegate(appletInstanceId: Uint8Array): ResourceBlockDelegate {
    // Get Neighbourhood id
    // XXX: This seems like a very round-about way of getting the weGroupId, especially since
    // we get the same data we get from the matrix one step later.
    const weGroupId = dnaHash(this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id);
    const weGroup = get(this._matrix).get(weGroupId);
    const appInstanceInfo = weGroup[1].find(
      info => compareUint8Arrays(info.appletId, appletInstanceId)
    )!;
    const weGroupData = weGroup[0];
    return createResourceBlockDelegate(
      appInstanceInfo.appAgentWebsocket!,
      appInstanceInfo.appInfo!,
      weGroupData.info.info
    );
  }

  /**
   * Creates an ResourceBlockDelegate to be passed into an resource block
   */
  public createOutputAssessmentWidgetDelegate(
    appletInstanceId: Uint8Array,
    dimensionEh: DimensionEh,
    resourceEh: ResourceEh
  ): OutputAssessmentWidgetDelegate {
    // Get Neighbourhood id
    // XXX: This seems like a very round-about way of getting the Neighbourhood id & weGroupInfo
    const weGroupId = dnaHash(this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id);
    const weGroup = get(this._matrix).get(weGroupId);
    const weGroupData = weGroup[0];

    return createOutputAssessmentWidgetDelegate(
      weGroupData.sensemakerStore,
      dimensionEh,
      resourceEh
    );
  }

  /**
   * Creates an ResourceBlockDelegate to be passed into an resource block
   */
  public createInputAssessmentWidgetDelegate(
    appletInstanceId: Uint8Array,
    dimensionEh: DimensionEh,
    resourceDefEh: ResourceDefEh,
    resourceEh: ResourceEh
  ): InputAssessmentWidgetDelegate {
    // Get Neighbourhood id
    // XXX: This seems like a very round-about way of getting the Neighbourhood id & weGroupInfo
    const weGroupId = dnaHash(this.getWeGroupInfoForAppletInstance(appletInstanceId).cell_id);
    const weGroup = get(this._matrix).get(weGroupId);
    const weGroupData = weGroup[0];

    return createInputAssessmentWidgetDelegate(
      weGroupData.sensemakerStore,
      dimensionEh,
      resourceDefEh,
      resourceEh
    );
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
   * Fetching all applets for the specified we group (query to the DHT)
   *
   * @param weGroupId : DnaHash
   * @returns Promise<Readable<[EntryHash, Applet][]>>
   */
  public async fetchAllApplets(
    weGroupId: DnaHash
  ): Promise<Readable<[EntryHash, Applet, DnaHash[]][]>> {
    const weGroupCellId = this.weGroupCellId(weGroupId);
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

    const weGroupCellId = this.weGroupCellId(weGroupId);

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
      hashMap.set(weGroupId, newAppletInstanceInfos);
      return hashMap;
    });

    return derived(this._newAppletInstances, (groupInstances) => groupInstances.get(weGroupId));
  }

  /**
   * Updates the matrix:
   * 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them
   * 2. fetch installed applet instances from the source chain for each we group (fast source chain query)
   *
   * XXX: This feels very antithetical to how stores should be used
   */
  public async fetchMatrix(): Promise<
    Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>>
  > {
    let matrix = new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>();
    let uninstalledAppletInstances = new DnaHashMap<
      UninstalledAppletInstanceInfo[]
    >();

    console.log("app info from matrix", this.weParentAppInfo);
    let weParentAppInfo: AppInfo = await this.appWebsocket.appInfo({ installed_app_id: this.weParentAppInfo.installed_app_id });
    console.log("parent app info after fetch", weParentAppInfo);

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
        const weGroupAgentWebsocket = await getAppAgentWebsocket("we");

        // TODO! Add unsubscribe handle to WeGroupData as well.
        // TODO: add signal handling for sensemaker cell
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

                store.set(weGroupDnaHash, updatedList);

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
        // await this.adminWebsocket.authorizeSigningCredentials(sensemakerGroupCellId)
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

        // 2. fetch installed applet instances from the source chain for each we group
        const appletsIAmPlaying =
          await this.appletsService.getAppletsIAmPlaying(weGroupCellId);

        const appletInstanceInfos: AppletInstanceInfo[] = [];
        const uninstalledAppletInstanceInfos: UninstalledAppletInstanceInfo[] = []
        for (let [entryHash, playingApplet, federatedGroups] of appletsIAmPlaying) {
          /**
           * XXX: This is kind of a bottleneck, maybe we should create a MerkleTree
           * of installed cells so we can just compare roots instead of cycling
           * through all of this every time. But really, that should be a Holochain
           * feature.
           */
          const appInfo = allApps.find((app) =>
            this.isSameApp(app, playingApplet.applet)
          );
          if (appInfo) {
            appletInstanceInfos.push({
              appletId: entryHash,
              appInfo,
              applet: playingApplet.applet,
              federatedGroups,
            })
          } else {
            uninstalledAppletInstanceInfos.push({
              appletId: entryHash,
              applet: playingApplet.applet,
              federatedGroups,
            })
          }
        }

        uninstalledAppletInstances.set(
          weGroupDnaHash,
          uninstalledAppletInstanceInfos
        );

        matrix.set(weGroupDnaHash, [weGroupData, appletInstanceInfos]);
      })
    );

    this._matrix.set(matrix);

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
    // Get the dna hash and look up the recipe to clone it
    const weDnaHash = getProvisionedDnaHash(this.weParentAppInfo, 'we')
    const records = await this.membraneInvitationsStore.client.getCloneRecipesForDna(
      weDnaHash
    );
    const recipe = records.find((c) => compareUint8Arrays(c.entry.resulting_dna_hash, weGroupId));
    if(recipe) {
      // membrane invitations API will need to change uid --> network_seed
      await this.membraneInvitationsStore.client.inviteToJoinMembrane(
        recipe.entry,
        agentPubKey,
        undefined
      );
    } else {
      throw Error("Could not find recipe for inviting to group.")
    }
  }

  /**
   * Clones the We DNA with a new unique weId as its UID
   * @param weName
   * @param weLogo
   */
  public async createWeGroup(name: string, logo: string): Promise<DnaHash> {

    // generate random network seed (maybe use random words instead later, e.g. https://www.npmjs.com/package/generate-passphrase)
    const networkSeed = crypto.randomUUID();

    // Install group and update the matrix store
    const newWeGroupDnaHash = await this.installWeGroup(
      name,
      logo,
      networkSeed,
      encodeHashToBase64(this.myAgentPubKey)
    );

    const weDnaHash = getProvisionedDnaHash(this.weParentAppInfo, 'we')

    const properties = {
      logoSrc: logo,
      name: name,
      networkSeed,
      caPubKey: encodeHashToBase64(this.myAgentPubKey),
    };
    const _recipeActionHash =
      await this.membraneInvitationsStore.client.createCloneDnaRecipe({
        original_dna_hash: weDnaHash,
        network_seed: undefined,
        properties: encode(properties),
        resulting_dna_hash: newWeGroupDnaHash,
        custom_content: encode(null),
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
    await this.membraneInvitationsStore.client.removeInvitation(invitationActionHash);
    return newWeGroupDnaHash;
  }

  private async installWeGroup(
    name: string,
    logo: string,
    networkSeed: string,
    caPubKey: string,
  ): Promise<DnaHash> {
    const weParentAppInfo = this.weParentAppInfo;

    const properties = {
      logoSrc: logo,
      name: name,
      networkSeed,
    };

    // hash network seed to not expose it in the app id but still
    // be able to detect the cell based on the network seed
    const hashedNetworkSeed = toSha1(networkSeed)
    const cloneName = `group@we-${name}-${hashedNetworkSeed}`
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

    const appAgentWebsocket = await getAppAgentWebsocket(weParentAppInfo.installed_app_id);

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
    // XXX: WTF? Why are we adding signal handlers here? This should happen once.
    // If we need to filter by apps we know we've queued, then we should have a list
    // of apps the listen for event for and then remove from the list when done.
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

            store.set(newWeGroupCellId[0], updatedList);

            return store;
          });
          break;
      }
    });

    // Because createCloneCell currently returns InstalledCell instead of Cell, we need to manually get
    // the clone_id via appInfo at the moment.
    const appInfo = await this.appAgentWebsocket.appInfo();

    const cellInfo = appInfo.cell_info["we"]
      .filter((cellInfo) => "cloned" in cellInfo)
      .find((cellInfo) => compareCellIds(getClonedCellId(cellInfo), clonedCell.cell_id));
    const cell = (cellInfo as { [CellType.Cloned]: ClonedCell }).cloned!;
    const sensemakerCellInfo = appInfo.cell_info["sensemaker"]
      .filter((cellInfo) => "cloned" in cellInfo)
      .find((cellInfo) => compareCellIds(getClonedCellId(cellInfo), clonedSensemakerCell.cell_id));
    const sensemakerCell = (sensemakerCellInfo as { [CellType.Cloned]: ClonedCell }).cloned!;

    const profilesStore = new ProfilesStore(new ProfilesClient(appAgentWebsocket, cell.clone_id!));
    const peerStatusStore = new PeerStatusStore(new PeerStatusClient(appAgentWebsocket, 'we'));
    const sensemakerStore = new SensemakerStore(appAgentWebsocket, sensemakerCell.clone_id!);

    this._matrix.update((matrix) => {
      const weInfo: NeighbourhoodInfo = {
        logoSrc: properties.logoSrc,
        name: properties.name,
      };

      const weGroupInfo: WeGroupInfo = {
        info: weInfo,
        cell_id: clonedCell.cell_id,
        dna_hash: dnaHash(clonedCell.cell_id),
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
        matrix.set(newWeGroupCellId[0], [weGroupData, []]);
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
    await this.membraneInvitationsStore.client.removeInvitation(invitationActionHash);
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
        (info) => compareUint8Arrays(info.appletId, appletInstanceId)
      );
    if (!newAppletInfo) {
      newAppletInfo = get(
        await this.fetchNewAppletInstancesForGroup(weGroupId)
      ).find(
        (info) => compareUint8Arrays(info.appletId, appletInstanceId)
      );
    }

    if (!newAppletInfo) {
      console.error(
        "Could not fetch the applet of the specified appletInstanceId from the we group dna."
      );
    } else {
      const { applet, federatedGroups } = newAppletInfo;

      // Fetch hApp and GUI
      const [appBundle, decompressedGui, iconSrcOption] = await this.fetchAndDecompressWebHapp(
        applet.devhubHappReleaseHash,
        applet.devhubGuiReleaseHash,
        compressedWebHappInput
      );

      // Pick any network seed (now because they are assumed to be the same across all cells)
      const networkSeed = Object.values(applet.networkSeed)[0];

      // Install the happ
      const { installedAppId, enabledApp } = await this.installAndEnableHapp(weGroupId, appBundle, applet.customName, networkSeed)

      const appInfo = enabledApp.app;

      const anyCellInfo = Object.values(appInfo.cell_info)![0]![0]; // pick the cell info of any of the cells
      const appletAgentPubKey = agentPubKey(getCellId(anyCellInfo));

      if (appletAgentPubKey) {

        // Create/Register the applet
        const appletInstanceId = await this.createAppletCall(weGroupId, appletAgentPubKey, applet);

        // commit GUI to source chain as private entry
        try {
          const _ = await this.appletsService.commitGuiFile({
            devhubHappReleaseHash: applet.devhubHappReleaseHash,
            gui: decompressedGui,
          });
        } catch (e) {
          console.error(e)
        }

        await this.registerAppletWithSensemaker(
          weGroupId,
          installedAppId,
          applet.devhubHappReleaseHash
        );

        if(appletInstanceId != undefined && appletInstanceId instanceof Uint8Array) {
          const appletAppAgentWebsocket = await getAppAgentWebsocket(installedAppId);

          // Add AppInstanceInfo to we group store
          // XXX: This should really have an index to check against
          this._matrix.update((matrix) => {
            matrix.get(weGroupId)[1].push({
              appletId: appletInstanceId!,
              appInfo,
              applet,
              federatedGroups,
              appAgentWebsocket: appletAppAgentWebsocket,
            });
            return matrix;
          });

          // Remove the newly joined app instance from the list of new apps available to join
          this._newAppletInstances.update((hashMap) => {
            const withoutCurrentAppInstance = hashMap
              .get(weGroupId)
              .filter((info) => info.appletId != appletInstanceId);
            hashMap.set(weGroupId, withoutCurrentAppInstance);
            return hashMap;
          });
        }
      } else {
        throw Error(`Unable to get public key for applet: ${installedAppId}`)
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
    customName: string,
    compressedWebHappInput?: Uint8Array
  ): Promise<EntryHash|undefined> {

    // Fetch hApp and GUI
    const [appBundle, decompressedGui, iconSrcOption] = await this.fetchAndDecompressWebHapp(
      appletMetaData.devhubHappReleaseHash,
      appletMetaData.devhubGuiReleaseHash,
      compressedWebHappInput
    );

    // Install the happ
    const { installedAppId, enabledApp, networkSeed } = await this.installAndEnableHapp(weGroupId, appBundle, customName)

    const appInfo = enabledApp.app;

    // Register hApp in the We DNA
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
        networkSeedByRole[roleName] = networkSeed;
      }
      if (stemCell) {
        dnaHashes[roleName] = (stemCell as { [CellType.Stem]: StemCell }).stem.dna;
        networkSeedByRole[roleName] = networkSeed;
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

    // Pick any network seed (now because they are assumed to be the same across all cells)
    const anyCellInfo = Object.values(enabledApp.app.cell_info)![0]![0];
    const appletAgentPubKey = agentPubKey(getCellId(anyCellInfo));

    if (appletAgentPubKey) {

      // Create/Register the applet
      const appletInstanceId = await this.createAppletCall(weGroupId, appletAgentPubKey, applet);

      // commit GUI to source chain as private entry
      try {
        const _ = await this.appletsService.commitGuiFile({
          devhubHappReleaseHash: applet.devhubHappReleaseHash,
          gui: decompressedGui,
        });
      } catch (e) {
        console.error(e)
      }

      await this.registerAppletWithSensemaker(
        weGroupId,
        installedAppId,
        applet.devhubHappReleaseHash
      );

      if(appletInstanceId != undefined && appletInstanceId instanceof Uint8Array) {
        const appletAppAgentWebsocket = await getAppAgentWebsocket(installedAppId);

        // Add AppInstanceInfo to we group store
        // XXX: This should really have an index to check against
        this._matrix.update((matrix) => {
          matrix.get(weGroupId)[1].push({
            appletId: appletInstanceId!,
            appInfo,
            applet,
            federatedGroups: [],
            appAgentWebsocket: appletAppAgentWebsocket,
          });
          return matrix;
        });

        return appletInstanceId;
      }
    } else {
      throw Error(`Unable to get public key for applet: ${installedAppId}`)
    }
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
      // Fetch hApp and GUI
      const [appBundle, decompressedGui, _iconSrcOption] = await this.fetchAndDecompressWebHapp(
        uninstalledAppletInfo.applet.devhubHappReleaseHash,
        uninstalledAppletInfo.applet.devhubGuiReleaseHash,
        compressedWebHappInput
      );

      // Network seed
      const networkSeed = Object.values(uninstalledAppletInfo.applet.networkSeed)[0];

      // Install the happ
      const { installedAppId, enabledApp } = await this.installAndEnableHapp(weGroupId, appBundle, uninstalledAppletInfo.applet.customName, networkSeed)


      const appInfo = enabledApp.app;

      // <--- no need to re-register applet -->
      // <--- no need to re-commit GUI to source chain as private entry -->

      const appInstanceInfo: AppletInstanceInfo = {
        appletId: appletInstanceId,
        appInfo,
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
        hashMap.set(weGroupId, filteredArray);
        return hashMap;
      });

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

    const [decompressedHapp, decompressedGui, iconSrcOption] = await this.fetchAndDecompressWebHapp(
      appletInstanceInfo.applet.devhubHappReleaseHash,
      appletInstanceInfo.applet.devhubGuiReleaseHash,
    );

    const callingGroupCellId = this.weGroupCellId(callingGroupId);
    const weGroupCellId = this.weGroupCellId(federatedGroupId);

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
          appletInstanceInfo.appInfo.installed_app_id === installedAppId
        ) {
          throw new Error(
            `The applet with id ${installedAppId} is already installed for this group.`
          );
        }
      });
    }

    const { enabledApp } = await this.installAndEnableHapp(federatedGroupId, decompressedHapp, customName, networkSeed);
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

    // get the first public key
    const anyPubKey = agentPubKey(getCellId(Object.values(appInfo.cell_info)[0][0]));

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

  async fetchAndDecompressWebHapp(devhubHappReleaseHash: EntryHash, devhubGuiReleaseHash: EntryHash, compressedWebHappInput?: Uint8Array) {
    // add logic here in case webhapp is installed from the file system.
    let compressedWebHapp: Uint8Array;

    if (!compressedWebHappInput) {
      const devhubHapp = await this.getDevhubHapp();
      compressedWebHapp = await fetchWebHapp(
        this.appWebsocket,
        devhubHapp,
        "hApp", // This is chosen arbitrarily at the moment
        devhubHappReleaseHash,
        devhubGuiReleaseHash,
      );
    } else {
      compressedWebHapp = compressedWebHappInput;
    }

    return await decompressWebHapp(compressedWebHapp);
  }

  // +++++++++++++++      H E L P E R    M E T H O D S    B E L O W      +++++++++++++++++++++++++++++++

  public async getDevhubHapp(): Promise<AppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find(
      (app) => app.installed_app_id === getDevHubAppId()
    )!;
  }

  getWeGroupInfoForAppletInstance(appletInstanceId: EntryHash): WeGroupInfo {
    return [...get(this._matrix)
      .values()]
      .filter(([_groupData, appletInfos]) => {
        return (
          appletInfos.filter(
            (appletInfo) => compareUint8Arrays(appletInfo.appletId, appletInstanceId)
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
    return [...get(this._uninstalledAppletInstances)
      .values()]
      .flat()
      .find(
        (info) => compareUint8Arrays(info.appletId, appletInstanceId)
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
    return [...get(this._newAppletInstances)
      .values()]
      .flat()
      .find(
        (info) => compareUint8Arrays(info.appletId, appletInstanceId)
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
    return [...get(this._matrix)
      .values()]
      .map(([_groupData, appletInfos]) => appletInfos)
      .flat()
      .find(
        (appletInstanceInfo) => compareUint8Arrays(appletInstanceInfo.appletId, appletInstanceId)
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
   * Checks whether an InstalledAppInfo and an Applet refer to the same applet
   * It assumes that of every role
   * @param installedAppInfo
   * @param applet
   * @returns
   */
  isSameApp(appInfo: AppInfo, applet: Applet): boolean {
   return  Object.entries(appInfo.cell_info).reduce((prev, [roleName, cellInfos]) => {
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
      return prev && dnaHashOfRoleId && compareUint8Arrays(dnaHashOfRoleId, dnaHash!)
    }, true as boolean);
  }

  weGroupCellId(weGroupId: DnaHash): CellId {
    return get(this._matrix).get(weGroupId)[0].info.cell_id;
  }

  getPubKey(weGroupId: DnaHash): AgentPubKey {
    return agentPubKey(this.weGroupCellId(weGroupId))
  }

  async installAndEnableHapp(weGroupId: Uint8Array, bundle: AppBundle, customName: string, networkSeedInput?: string) {

    const network_seed = networkSeedInput ? networkSeedInput : crypto.randomUUID();

    // hash network seed to not expose it in the app id but still
    // be able to detect the cell based on the network seed
    const hashedNetworkSeed = toSha1(network_seed)
    const installed_app_id: InstalledAppId = `applet@we-${hashedNetworkSeed}-${customName}`;

    // install app bundle
    try {
      await this.adminWebsocket.installApp({
        agent_key: this.getPubKey(weGroupId),
        installed_app_id,
        membrane_proofs: {},
        bundle,
        network_seed,
      });
    } catch (e: any) {
      console.error(JSON.stringify(e.data));
      // exact same applet can only be installed once to the conductor
      if (!(e.data.data as string).includes("AppAlreadyInstalled")) {
        console.error("AppAlreadyInstalled")
      }
    }

    const enabledApp = await this.adminWebsocket.enableApp({
      installed_app_id,
    });

    for (const [_roleName, cells] of Object.entries(enabledApp.app.cell_info)) {
      for (const cellInfo of cells) {
        try {
          await this.adminWebsocket.authorizeSigningCredentials(getCellId(cellInfo)!);
        } catch (e) {
          console.error(JSON.stringify(e))
        }
      }
    }

    return {
      installedAppId: installed_app_id,
      enabledApp,
      networkSeed: network_seed
    };
  }

  async createAppletCall(weGroupId: DnaHash, appletAgentPubKey: AgentPubKey, applet: Applet): Promise<DnaHash> {
    let appletInstanceId: DnaHash | undefined;

    // register Applet entry in order to have it in the own source chain
    try {
      appletInstanceId = await this.appletsService.createApplet(
        this.weGroupCellId(weGroupId),
        {
          appletAgentPubKey,
          applet,
        }
      );
    } catch (e) {
      console.error(e)
      throw e
    }
    return appletInstanceId
  }

  async registerAppletWithSensemaker(weGroupId: DnaHash, installedAppId: string, devhubHappReleaseHash: DnaHash) {
    const applet = await this.queryAppletGui(devhubHappReleaseHash);

    const appletConfig = applet.appletConfig;
    appletConfig.name = installedAppId;

    const sensemakerStore = get(this.sensemakerStore(weGroupId));
    if (sensemakerStore) {
      try {
        const registeredConfig = await sensemakerStore.registerApplet(appletConfig);
        console.log('registeredConfig', registeredConfig)
        console.log('registering widgets to SM store')
        for (let widgetKey in applet.assessmentWidgets) {
          const widgetConfig = applet.assessmentWidgets[widgetKey]
          // const registration: AssessmentWidgetRegistrationInput = {
          //   appletEh
          // }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  public async initializeStateForGroup(weGroupId: DnaHash) {
    const [weGroupData, appletInstanceInfos] = get(this._matrix).get(weGroupId);
    // initalize assessment data
    await weGroupData.sensemakerStore.getAssessmentsForResources({});
    // loop through each applet in the group
    appletInstanceInfos.forEach(async (appletInstanceInfo) => {
      await this.fetchAppletInstanceRenderers(appletInstanceInfo.appletId);
      await this.registerAppletWithSensemaker(
        weGroupId,
        appletInstanceInfo.appInfo.installed_app_id,
        appletInstanceInfo.applet.devhubHappReleaseHash
      );
    });
  }

  getResourceView(weGroupId: DnaHash, resourceDefEh: EntryHash) {
    return ``;
  }
}
