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
  DnaHash,
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

import { importModuleFromFile } from "./processes/import-module-from-file";
import { fetchWebHapp } from "./processes/devhub/get-happs";
import {
  Applet,
  AppletGui,
  AppletInfo,
  GuiFile,
  IconFileOption,
  IconSrcOption,
  PlayingApplet,
  RegisterAppletInput,
  WeInfo,
} from "./types";
import { AppletsService } from "./applets-service";
import { WeGroupService } from "./we-group-service";
import { toSrc } from "./processes/import-logsrc-from-file";
import { getDevHubAppId } from "./processes/devhub/app-id";
import { EntryHashMap } from "./holo-hash-map-temp";
import { GlobalAppletsService } from "./global-applets-service";
import { contextProvided } from "@lit-labs/context";

export class WeGroupStore {

  private weGroupService: WeGroupService;
  public profilesStore: ProfilesStore;
  public peerStatusStore: PeerStatusStore;
  public weGroupId: DnaHash;

  public get appWebsocket(): AppWebsocket {
    return (this.cellClient as any).client.appWebsocket;
  }

  public get myAgentPubKey(): AgentPubKey {
    return this.cellClient.cell.cell_id[1];
  }

  public get cellData(): InstalledCell {
    return (this.cellClient as any).cellData;
  }

  public get cellClient(): CellClient {
    return this.cellClient;
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
    cellClient: CellClient,
    protected lobbyClient: CellClient,
    protected weParentDnaHash: DnaHashB64,
    public adminWebsocket: AdminWebsocket,
    protected membraneInvitationsService: MembraneInvitationsService
  ) {
    this.weGroupService = new WeGroupService(cellClient);
    this.profilesStore = new ProfilesStore(new ProfilesService(cellClient));
    this.peerStatusStore = new PeerStatusStore(cellClient);
    this.weGroupId = cellClient.cell.cell_id[0];

    cellClient.addSignalHandler((signal) => {
      const payload = signal.data.payload;

      if (!payload.message) return;

      switch (payload.message.type) {
        case "NewApplet":
          this._matrixStore.addNewApplet()
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



  async fetchInfo(): Promise<Readable<WeInfo>> {
    const info = await this.weGroupService.getInfo();
    return readable(info);
  }


  public async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    const weCell = this.cellClient.cell.cell_id;
    const myAgentPubKey = serializeHash(weCell[1]);
    const weDnaHash = serializeHash(weCell[0]);

    const info = await this.weGroupService.getInfo();

    const properties = encode(info);
    console.log(
      {
        originalDnaHash: this.weParentDnaHash,
        properties,
        uid: undefined,
        resultingDnaHash: weDnaHash,
      } as any,
      agentPubKey
    );
    await this.membraneInvitationsService.inviteToJoinMembrane(
      {
        originalDnaHash: this.weParentDnaHash,
        properties,
        uid: undefined,
        resultingDnaHash: weDnaHash,
      },
      agentPubKey,
      undefined
    );
  }
}
