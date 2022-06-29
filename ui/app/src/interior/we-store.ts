import { CellClient, HolochainClient } from "@holochain-open-dev/cell-client";
import {
  DnaHashB64,
  AgentPubKeyB64,
  EntryHashB64,
  serializeHash,
  deserializeHash,
} from "@holochain-open-dev/core-types";
import {
  AdminWebsocket,
  AppWebsocket,
  CellId,
  InstallAppBundleRequest,
  InstalledAppInfoStatus,
  InstalledAppInfo,
  InstalledCell,
  EntryHash,
  InstalledAppId,
  AgentPubKey,
  AppBundle,
} from "@holochain/client";
import {
  derived,
  get,
  Readable,
  readable,
  writable,
  Writable,
} from "svelte/store";
import { MembraneInvitationsService } from "@holochain-open-dev/membrane-invitations";
import { encode, decode } from "@msgpack/msgpack";
import { ProfilesStore, ProfilesService } from "@holochain-open-dev/profiles";
import { PeerStatusStore } from "@holochain-open-dev/peer-status";
import { AppletRenderers, WeApplet } from "@lightningrodlabs/we-applet";

import { decompressSync, unzipSync } from "fflate";
import { stringify, v4 as uuidv4 } from "uuid";

import { importModuleFromFile } from "../processes/import-module-from-file";
import { fetchWebHapp } from "../processes/devhub/get-happs";
import {
  Applet,
  AppletInfo,
  GuiFile,
  PlayingApplet,
  RegisterAppletInput,
  WeInfo,
} from "./types";
import { AppletsService } from "./applets-service";
import { WeService } from "./we-service";

export class WeStore {
  private appletsService: AppletsService;
  private weService: WeService;
  public profilesStore: ProfilesStore;
  public peerStatusStore: PeerStatusStore;

  private _allApplets: Writable<Record<EntryHashB64, Applet>> = writable({});
  private _appletsIAmPlaying: Writable<Record<EntryHashB64, AgentPubKeyB64>> =
    writable({});
  private _appletRenderers: Record<EntryHashB64, AppletRenderers> = {};

  /*
  public applet(appletHash: EntryHashB64): Readable<
    | {
        info: Applet;
        renderers: Renderers | undefined;
        areWePlaying: boolean;
      }
    | undefined
  > {
    return derived(this.state, (s) => {
      return {
        applet_hash: appletHash,
        info: s.applets[appletHash],
        renderers: s.renderers[appletHash],
        areWePlaying: !!s.appletsAlreadyPlaying[appletHash],
      };
    });
  }
 */
  public get appWebsocket(): AppWebsocket {
    return (this.cellClient as any).client.appWebsocket;
  }

  public get myAgentPubKey(): AgentPubKey {
    return this.cellClient.cell.cell_id[1];
  }

  public get cellData(): InstalledCell {
    return (this.cellClient as any).cellData;
  }

  public get allApplets() {
    return derived(this._allApplets, (allApplets) => allApplets);
  }

  public get appletsIAmPlaying() {
    return derived(
      this._appletsIAmPlaying,
      (appletsIAmPlaying) => appletsIAmPlaying
    );
  }

  constructor(
    protected cellClient: CellClient,
    protected weDnaHash: DnaHashB64,
    public adminWebsocket: AdminWebsocket,
    protected membraneInvitationsService: MembraneInvitationsService
  ) {
    this.appletsService = new AppletsService(cellClient);
    this.weService = new WeService(cellClient);
    this.profilesStore = new ProfilesStore(new ProfilesService(cellClient));
    this.peerStatusStore = new PeerStatusStore(cellClient);

    cellClient.addSignalHandler((signal) => {
      const payload = signal.data.payload;

      if (!payload.message) return;

      switch (payload.message.type) {
        case "NewApplet":
          this._allApplets.update((s) => {
            if (!s[payload.appletHash]) {
              s[payload.appletHash] = payload.message.content;
            }
            return s;
          });
          break;
      }
    });
  }

  public async getDevhubHapp(): Promise<InstalledAppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find((app) => app.installed_app_id === "DevHub")!;
  }

  async fetchInfo(): Promise<Readable<WeInfo>> {
    const info = await this.weService.getInfo();
    return readable(info);
  }

  async fetchAllApplets(): Promise<Readable<Record<EntryHashB64, Applet>>> {
    const allApplets = await this.appletsService.getAllApplets();

    if (!this._allApplets) {
      this._allApplets = writable(allApplets);
    }

    return derived(this._allApplets, (i) => i);
  }

  async fetchAppletsIAmPlaying(): Promise<
    Readable<Record<EntryHashB64, PlayingApplet>>
  > {
    const appletsIAmPlaying = await this.appletsService.getAppletsIAmPlaying();

    const applets: Record<EntryHashB64, Applet> = {};
    const myOtherPubKeys: Record<EntryHashB64, AgentPubKeyB64> = {};

    for (const [appletHash, playingApplet] of Object.entries(
      appletsIAmPlaying
    )) {
      myOtherPubKeys[appletHash] = playingApplet.agentPubKey;
      applets[appletHash] = playingApplet.applet;
    }

    this._appletsIAmPlaying.set(myOtherPubKeys);
    this._allApplets.update((g) => ({
      ...g,
      ...applets,
    }));

    return derived(
      [this._appletsIAmPlaying, this._allApplets],
      ([playing, allApplets]) => {
        const playingApplets: Record<EntryHashB64, PlayingApplet> = {};

        for (const [appletHash, agentPubKey] of Object.entries(playing)) {
          playingApplets[appletHash] = {
            agentPubKey,
            applet: allApplets[appletHash],
          };
        }

        return playingApplets;
      }
    );
  }

  isInstalled(appletHash: EntryHashB64) {
    const installedIds = Object.entries(get(this._appletsIAmPlaying)).map(
      ([entryHash, agentPubKey]) => entryHash
    );
    console.log("installedIds: ", installedIds);
    console.log("appletHash: ", appletHash);
    console.log("included: ", installedIds.includes(appletHash));
    return installedIds.includes(appletHash);
  }

  getAppletInfo(appletHash: EntryHashB64): Applet | undefined {
    return get(this._allApplets)[appletHash];
  }

  // async fetchOrderedAppletsList(): Promise<Readable<Record<"joined"|"unjoined", Readable<<EntryHashB64, Applet>> {

  //   const appletsIamPlaying = get(await this.fetchAppletsIAmPlaying());
  //   const allApplets = get(await this.fetchAllApplets());

  //   return derived(this._allApplets, (allApplets) => {
  //     const unjoinedApplets: Record<EntryHashB64, Applet> = {};
  //     const appletsIAmPlaying = get(this._appletsIAmPlaying);

  //     Object.entries(allApplets).map(([appletHash, applet]) => {
  //       if (!appletsIAmPlaying[appletHash]) {
  //         unjoinedApplets[appletHash] = applet;
  //       }
  //     });
  //     return unjoinedApplets;
  //   });

  // }

  async fetchAppletRenderers(
    appletHash: EntryHashB64
  ): Promise<AppletRenderers> {
    const renderer = this._appletRenderers[appletHash];
    if (renderer) return renderer;

    const applet = get(this._allApplets)[appletHash];
    const appletAgentPubKey = get(this._appletsIAmPlaying)[appletHash];
    const rendererBytes = await this.appletsService.queryAppletGui(
      applet.guiFileHash
    );

    const file = new File(
      [new Blob([new Uint8Array(rendererBytes)])],
      "filename"
    );

    const mod = await importModuleFromFile(file);
    const appletGui: WeApplet = mod.default; // for a Gui to be we-compatible it's default export must be of type WeApplet

    const cell_data: InstalledCell[] = [];

    for (const [role_id, dnaHash] of Object.entries(applet.dnaHashes)) {
      cell_data.push({
        cell_id: [deserializeHash(dnaHash), deserializeHash(appletAgentPubKey)],
        role_id,
      });
    }

    const renderers = await appletGui.appletRenderers(
      this.appWebsocket,
      this.adminWebsocket,
      { profilesStore: this.profilesStore },
      {
        installed_app_id: "",
        cell_data,
        status: { running: null },
      }
    );

    // s.renderers is undefined --> maybe because this._appletRenderers is still empty at that point?
    this._appletRenderers[appletHash] = renderers;

    return renderers;
  }

  async fetchAndDecompressWebHapp(
    entryHash: EntryHashB64
  ): Promise<[AppBundle, GuiFile]> {
    const devhubHapp = await this.getDevhubHapp();

    const compressedWebHapp = await fetchWebHapp(
      this.appWebsocket,
      devhubHapp,
      "hApp", // This is chosen arbitrarily at the moment
      deserializeHash(entryHash)
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
    this.adminWebsocket.listCellIds;
    return [decompressedHapp, decompressedGui];
  }

  // Installs the given applet to the conductor, and registers it in the We DNA
  async createApplet(
    appletInfo: AppletInfo,
    customName: InstalledAppId
  ): Promise<EntryHashB64> {
    // --- Install hApp in the conductor---

    const [decompressedHapp, decompressedGui] =
      await this.fetchAndDecompressWebHapp(serializeHash(appletInfo.entryHash));

    const uid = uuidv4();
    const installedAppId: InstalledAppId = `${uid}-${customName}`;

    const request: InstallAppBundleRequest = {
      agent_key: this.myAgentPubKey,
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      uid: uid,
    };

    const appInfo = await this.adminWebsocket.installAppBundle(request);

    await this.adminWebsocket.enableApp({ installed_app_id: installedAppId });

    // // --- Register hApp and UI in the We DNA ---

    const guiEntryHash = await this.appletsService.commitGuiFile(
      decompressedGui
    );

    const dnaHashes: Record<string, DnaHashB64> = {};
    const uidByRole: Record<string, string> = {};
    appInfo.cell_data.forEach((cell) => {
      dnaHashes[cell.role_id] = serializeHash(cell.cell_id[0]);
      uidByRole[cell.role_id] = uid;
    });

    const applet: Applet = {
      name: customName,
      description: appletInfo.description,
      logoSrc: appletInfo.icon,

      devhubHappReleaseHash: serializeHash(appletInfo.entryHash),
      guiFileHash: guiEntryHash,

      properties: {},
      uid: uidByRole,
      dnaHashes: dnaHashes,
    };

    const registerAppletInput: RegisterAppletInput = {
      appletAgentPubKey: serializeHash(appInfo.cell_data[0].cell_id[1]), // pick the pubkey of any of the cells
      applet,
    };

    const appletHash = await this.appletsService.createApplet(
      registerAppletInput
    );

    this._appletsIAmPlaying.update((appletsIAmPlaying) => {
      appletsIAmPlaying[appletHash] = serializeHash(this.myAgentPubKey);
      return appletsIAmPlaying;
    });

    this._allApplets.update((allApplets) => {
      allApplets[appletHash] = applet;
      return allApplets;
    });

    return appletHash;
  }

  // Installs the already existing applet in this We to the conductor
  async joinApplet(appletHash: EntryHashB64): Promise<void> {
    const installedAppletsHashes = Object.entries(
      get(this._appletsIAmPlaying)
    ).map(([entryHash, agentPubKey]) => entryHash);
    if (installedAppletsHashes.includes(appletHash)) return;

    const allApplets: Record<EntryHashB64, Applet> = get(this._allApplets);
    let applet = allApplets[appletHash];

    console.log("devhubreleasehash: ", applet.devhubHappReleaseHash);
    // fetch hApp and GUI
    const [decompressedHapp, decompressedGui] =
      await this.fetchAndDecompressWebHapp(applet.devhubHappReleaseHash);

    if (!applet) {
      applet = get(await this.fetchAllApplets())[appletHash];
    }

    const uid = Object.values(applet.uid)[0];
    const installedAppId = `${uid}-${applet.name}`;

    // install app bundle
    const request: InstallAppBundleRequest = {
      agent_key: this.myAgentPubKey,
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      uid,
    };

    const appInfo = await this.adminWebsocket.installAppBundle(request);

    await this.adminWebsocket.enableApp({
      installed_app_id: installedAppId,
    });

    // register Applet entry in order to have it in the own source chain
    const registerAppletInput: RegisterAppletInput = {
      appletAgentPubKey: serializeHash(appInfo.cell_data[0].cell_id[1]), // pick the pubkey of any of the cells
      applet,
    };

    await this.appletsService.createApplet(registerAppletInput);

    // commit GUI to source chain as private entry
    const guiEntryHash = await this.appletsService.commitGuiFile(
      decompressedGui
    );

    this._appletsIAmPlaying.update((appletsIAmPlaying) => {
      appletsIAmPlaying[appletHash] = serializeHash(this.myAgentPubKey);
      return appletsIAmPlaying;
    });
  }

  public async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    const weCell = this.cellClient.cell.cell_id;
    const myAgentPubKey = serializeHash(weCell[1]);
    const weDnaHash = serializeHash(weCell[0]);

    const info = await this.weService.getInfo();

    const properties = encode(info);
    console.log(
      {
        originalDnaHash: this.weDnaHash,
        properties,
        uid: undefined,
        resultingDnaHash: weDnaHash,
      } as any,
      agentPubKey
    );
    await this.membraneInvitationsService.inviteToJoinMembrane(
      {
        originalDnaHash: this.weDnaHash,
        properties,
        uid: undefined,
        resultingDnaHash: weDnaHash,
      },
      agentPubKey,
      undefined
    );
  }
}
