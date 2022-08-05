

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
  InstalledCell,
  AppBundle,
  AppWebsocket,
} from "@holochain/client";
import {
  MembraneInvitationsService,
  MembraneInvitationsStore,
} from "@holochain-open-dev/membrane-invitations";
import { decode, encode } from "@msgpack/msgpack";
import { WeGroupStore } from "./we-group-store";
import { DnaHashMap, EntryHashMap, HoloHashMap } from "./holo-hash-map-temp";
import { AppletRenderers, WeApplet, InstalledAppletInfo } from "@lightningrodlabs/we-applet";
import { WeInfo } from "./interior/types";
import { Applet, AppletGui, DashboardMode, GuiFile, IconFileOption, IconSrcOption, PlayingApplet } from "./types";
import { importModuleFromFile } from "./processes/import-module-from-file";
import { getDevHubAppId } from "./processes/devhub/app-id";
import { fetchWebHapp } from "./processes/devhub/get-happs";
import { decompressSync, unzipSync } from "fflate";
import { toSrc } from "./processes/import-logsrc-from-file";


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
// export interface AppletInstanceData {
//   info: AppletInstanceInfo,
//   renderers: AppletRenderers,
// }

/**Info about a specific instance of an installed Applet */
export interface AppletInstanceInfo {
  appletId: EntryHash, // hash of the Applet entry in the applets zome of the group's we dna
  devHubHappReleaseHash: EntryHash,   // devhub hApp release hash --> allows to recognize applets of the same base dna across groups
  installedAppInfo: InstalledAppInfo, // InstalledAppInfo
  name: string,                // name of the applet (applet Class (!), i.e. name from the devHub)
  logoSrc: string | undefined, // logo of the applet (logo from the devHub)
}

/**Info about an Applet that was added to the We group by another agent and isn't installed locally yet. */
export interface NewAppletInstanceInfo {
  appletId: EntryHash, // hash of the Applet entry in the applets zome of the group's we dna
  devHubHappReleaseHash: EntryHash, // devhub hApp release hash --> allows to recognize applets of the same base dna across groups
  name: string,
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






/**stores the Group/Applet matrix */
export class MatrixStore {
  /** Private */
  public membraneInvitationsStore: MembraneInvitationsStore;

  private _matrix: Writable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> = // We Group DnaHashes as keys
    writable(new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>());           // AppletInstanceInfo are only the one's that the agent has joined,
                                                                                // not the ones added to the We by someone else but not installed yet

  private _newAppletInstances: Writable<DnaHashMap<NewAppletInstanceInfo[]>> =  // We Group DnaHashes as keys
    writable(new DnaHashMap<NewAppletInstanceInfo[]>());                        // Applet instances that have been added to the we group by someone else
                                                                               // but aren't installed locally yet by the agent.

  // private _groups: Writable<DnaHashMap<WeGroupStore>> =
  //   writable(new DnaHashMap<WeGroupStore>()); // We Group DnaHashes as keys

  private _installedAppletClasses: Writable<EntryHashMap<AppletClassInfo>> =
    writable(new EntryHashMap<AppletClassInfo>()); // devhub release entry hashes of Applets as keys

  private _appletGuis: EntryHashMap<WeApplet> = new EntryHashMap<WeApplet>(); // devhub hApp release entry hashes of Applets as keys --> no duplicate applet renderers for the same applet class
  private _appletInstanceRenderers: EntryHashMap<AppletRenderers> = new EntryHashMap<AppletRenderers>; // EntryHash of Applet entries in the respective we DNA as keys
  private _appletClassRenderers: EntryHashMap<AppletRenderers> = new EntryHashMap<AppletRenderers>; // devhub hApp release hashes of applets as keys

  private lobbyCell: InstalledCell;

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
    protected weParentAppInfo: InstalledAppInfo,
  ) {
    const lobbyCell = weParentAppInfo.cell_data.find((cell) => cell.role_id=="lobby")!;
    this.lobbyCell = lobbyCell;
    const cellClient = new CellClient(holochainClient, lobbyCell);
    this.membraneInvitationsStore = new MembraneInvitationsStore(cellClient);
    this.myAgentPubKey = lobbyCell.cell_id[1];
  }





  public matrix(): Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>> {
    return derived(this._matrix, (matrix) => matrix);
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
      .find((appletInstanceInfo) => appletInstanceInfo.appletId == appletInstanceId);

    if (maybeInstalled) return true;
    return false;
  }





  public weGroupInfos(): Readable<DnaHashMap<WeGroupInfo>> {
    return derived(this._matrix, (matrix) => {
      let groupInfos = new DnaHashMap<WeGroupInfo>();
      matrix.entries().forEach(([groupId, [groupData, _appletInstanceInfos]]) => {
        groupInfos.put(groupId, groupData.info)
      })
      return groupInfos;
    })
  }

  public appletClasses(): Readable<EntryHashMap<AppletClassInfo>> {
    return derived(this._installedAppletClasses, (appletClasses) => appletClasses);
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
  async fetchAppletInstanceRenderers(weGroupId: DnaHash, appletInstanceId: EntryHash) {
    // 1. check whether the renderers for this applet instance are already stored, if yes return them
    const maybeRenderers = this._appletInstanceRenderers.get(appletInstanceId);
    if (maybeRenderers) return maybeRenderers;

    // 2. check whether the GUI is already loaded, if not load fetch from the lobby DNA
    const devhubHappReleaseHash = this.releaseHashOfAppletInstance(appletInstanceId)!;
    // ATTENTION: IT IS ASSUMED HERE THAT THE APPLET IS ALREADY IN THE MATRIX!!

    let gui = this._appletGuis.get(devhubHappReleaseHash);
    if (!gui) {
      gui = await this.queryAppletGui(devhubHappReleaseHash);
    }

    // 3. create the renderers and return them
    const [weGroupData, appInstanceInfos] = get(this._matrix).get(weGroupId);
    const profilesStore = weGroupData.store.profilesStore;
    const installedAppInfo = appInstanceInfos.find((info) => info.appletId === appletInstanceId)!.installedAppInfo;

    const renderers = await gui.appletRenderers(
      this.holochainClient.appWebsocket,
      this.adminWebsocket,
      { profilesStore },
      installedAppInfo,
    );

    return renderers;
  }

  /**
   * Fetches the AppletRenderers for an applet class
   * @param devhubHappReleaseHash
   */
  async fetchAppletClassRenderers(devhubHappReleaseHash: EntryHash): Promise<AppletRenderers> {
    // 1. check whether the renderers for this applet class are already stored, if yes return them
    const maybeRenderers = this._appletClassRenderers.get(devhubHappReleaseHash);
    if (maybeRenderers) return maybeRenderers;

    // 2. check whether the GUI is already loaded, if not fetch it from the lobby DNA
    let gui = this._appletGuis.get(devhubHappReleaseHash);
    if (!gui) {
      gui = await this.queryAppletGui(devhubHappReleaseHash);
    }

    // 3. create the renderers and return them
    const renderers = await gui.appletRenderers(
      this.holochainClient.appWebsocket,
      this.adminWebsocket,
      {},
      this.getInstalledAppletInfoListForClass(devhubHappReleaseHash),
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
    const appletGui = await lobbyClient.callZome("applet_guis", "query_applet_gui", devhubHappReleaseHash);

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
  public getAppletInstanceInfosForGroup(groupDnaHash: DnaHash): Readable<AppletInstanceInfo[]> {
    // todo
    return derived(this._matrix, (matrix) => {
      matrix.get(groupDnaHash)[1];
    })
  }


  /**
   * Gets an array of [GroupInfo, AppletInstanceInfo] of the installed applet instances of the specified applet class
   * Used to display the group icons in NavifationMode.AppletCentric in the secondary navigation panel.
   */
  public getInstanceInfosForAppletClass(devHubReleaseHash: EntryHash): Readable<[WeGroupInfo, AppletInstanceInfo][]> {
    // todo
    return derived(this._matrix, (matrix) => {
      let result: [WeGroupInfo, AppletInstanceInfo][] = [];
      matrix.values().forEach(([groupData, appletInfos]) => {
        appletInfos.filter((appletInfo) => appletInfo.devHubHappReleaseHash === devHubReleaseHash)
          .forEach((appletInfo) => result.push([groupData.info, appletInfo]));
      });
    });
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



  /**
  Fetching Applet instances that have been added to the specified we group by someone else
  but aren't installed locally yet by the agent
  */
  public async fetchNewAppletInstancesForGroup(weGroupId: EntryHash): Promise<Readable<AppletInstanceInfo[]>> {

    const [weGroupData, installedApplets] = get(this._matrix).get(weGroupId);
    const appletsIAmPlaying: EntryHashMap<PlayingApplet> = get(await weGroupData.store.fetchAppletsIAmPlaying());  // where the applet entry hashes are the keys

    // return derived(this._matrix, (matrix) => {
    //   const
    // })


    // update the _newAppletInstances store


  }

  /**
   * Fetching all the applet instances that havent been installed yet.
   *
   *
   */
  public async fetchNewAppletInstances(): Promise<Readable<DnaHashMap<NewAppletInstanceInfo[]>>> {

    get(this._matrix).entries().map(([weGroupDnaHash, [weGroupData, appletInstanceInfos]]) => {
      const allApplets: EntryHashMap<Applet> = get(await weGroupData.store.fetchAllApplets());

    });


  }


  /** Static info */
  public weGroupStore(weId: DnaHash): Readable<WeGroupStore> {
    return derived(this._matrix, (matrix) => matrix.get(weId)[0].store);
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
  public async fetchMatrix(): Promise<Readable<DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>>>{

    const lobbyClient = new CellClient(this.holochainClient, this.lobbyCell);

    let matrrrrriiix = new DnaHashMap<[WeGroupData, AppletInstanceInfo[]]>();
    let installedAppletClasses = new EntryHashMap<AppletClassInfo>();

    // 1. fetch we group cells from the conductor and create WeGroupStore and WeGroupData for each one of them

    // fetch groups from conductor
    let allApps = await this.adminWebsocket.listApps({});
    let allWeGroups = allApps.filter((app) => app.installed_app_id.startsWith("we-"));

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
            installedAppInfo: allApps.find((app) => this.isSameApp(app, playingApplet.applet))!,
            logoSrc: playingApplet.applet.logoSrc,
            name: playingApplet.applet.name,
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




  public async getDevhubHapp(): Promise<InstalledAppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find((app) => app.installed_app_id === getDevHubAppId())!;
  }



  /**
   * Fetches and decompresses a webhapp from the devhub
   *
   * @param entryHash
   * @returns [AppBundle, GuiFile, IconSrcOption]
   */
  async fetchAndDecompressWebHapp(
    entryHash: EntryHash
  ): Promise<[AppBundle, GuiFile, IconSrcOption]> {

    const devhubHapp = await this.getDevhubHapp();

    const compressedWebHapp = await fetchWebHapp(
      this.appWebsocket,
      devhubHapp,
      "hApp", // This is chosen arbitrarily at the moment
      entryHash
    );

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
   * Clones the We DNA with a new unique weId as its UID
   * @param weName
   * @param weLogo
   */
  public async createWe(name: string, logo: string): Promise<DnaHash> {
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

    return deserializeHash(newWeHash);
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

    const lobbyClient = new CellClient(this.holochainClient, this.lobbyCell);

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





  // +++++++++++++++      H E L P E R    M E T H O D S    B E L O W      +++++++++++++++++++++++++++++++



  /**
   * Gets the AppletInstanceInfo for the specified applet instance id
   *
   * @param appletInstanceId
   * @returns AppletInstanceInfo for this applet instance id or undefined.
   */
   getAppletInstanceInfo(appletInstanceId: EntryHash): AppletInstanceInfo | undefined {
    return get(this._matrix).values()
    .map(([_groupData, appletInfos]) => appletInfos)
    .flat()
    .find((appletInstanceInfo) => appletInstanceInfo.appletId == appletInstanceId)
  }




  /**
   * Retrieves the devhub hApp release hash associated to the specified applet instance
   *
   * @param appletInstanceId: EntryHash
   * @returns: EntryHash | undefined : devhub hApp release hash for this applet instance id or undefined.
   */
  releaseHashOfAppletInstance(appletInstanceId: EntryHash): EntryHash | undefined {
    return this.getAppletInstanceInfo(appletInstanceId)
      ?.devHubHappReleaseHash
  }




  /**
   * Gets InstalledAppletInfo of all applets of this class across all we groups
   * @param devhubHappReleaseHash
   * @returns
   */
  getInstalledAppletInfoListForClass(devhubHappReleaseHash: EntryHash): InstalledAppletInfo[] {
    const matrix = get(this._matrix)
    let appletInfosOfClass: InstalledAppletInfo[] = [];
    matrix.values().forEach(([weGroupData, appletInstanceInfos]) => {
      const weInfo: WeInfo = weGroupData.info.info;
      const weGroupId: DnaHash = weGroupData.info.dna_hash;
      const relevantAppletInstanceInfos = appletInstanceInfos.filter((info) => info.devHubHappReleaseHash == devhubHappReleaseHash);
      const relevantInstalledAppletInfos = relevantAppletInstanceInfos.map((appletInstanceInfo) => {
        const installedAppletInfo: InstalledAppletInfo = {
          weInfo,
          installedAppInfo: appletInstanceInfo.installedAppInfo,
        };
        return installedAppletInfo;
      });

      appletInfosOfClass = [...appletInfosOfClass, ...relevantInstalledAppletInfos]
    })

    return appletInfosOfClass;
  }



  /**
   * Checks whether an InstalledAppInfo and an Applet refer to the same applet
   * @param installedAppInfo
   * @param applet
   * @returns
   */
   isSameApp(installedAppInfo: InstalledAppInfo, applet: Applet): boolean {
    installedAppInfo.cell_data.forEach((installedCell) => {
      if (applet.dnaHashes[installedCell.role_id] != installedCell.cell_id[0]) {
        return false;
      }
    });
    return true;
  }


}
