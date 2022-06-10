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
import { encode } from "@msgpack/msgpack";
import { ProfilesStore } from "@holochain-open-dev/profiles";

import { importModuleFromFile } from "../processes/import-module-from-file";
import { fetchWebHapp } from "../processes/devhub/get-happs";
import { Game, GameInfo, PlayingGame, WeInfo } from "./types";
import { GameRenderers, WeGame } from "../we-game";
import { GamesService } from "./games-service";
import { WeService } from "./we-service";

import { decompressSync, unzipSync } from "fflate";
import { decode } from "@msgpack/msgpack";
import { v4 as uuidv4 } from 'uuid';

export class WeStore {
  private gamesService: GamesService;
  private weService: WeService;
  public profilesStore: ProfilesStore;

  private _allGames: Writable<Record<EntryHashB64, Game>> = writable({});
  private _gamesIAmPlaying: Writable<Record<EntryHashB64, AgentPubKeyB64>> =
    writable({});
  private _gameRenderers: Writable<Record<EntryHashB64, GameRenderers>> =
    writable({});
  /*
  public game(gameHash: EntryHashB64): Readable<
    | {
        info: Game;
        renderers: Renderers | undefined;
        areWePlaying: boolean;
      }
    | undefined
  > {
    return derived(this.state, (s) => {
      return {
        game_hash: gameHash,
        info: s.games[gameHash],
        renderers: s.renderers[gameHash],
        areWePlaying: !!s.gamesAlreadyPlaying[gameHash],
      };
    });
  }
 */
  public get appWebsocket(): AppWebsocket {
    return (this.cellClient as any).client.appWebsocket;
  }

  public get myAgentPubKeyB64(): AgentPubKeyB64 {
    return serializeHash(this.cellClient.cellId[1]);
  }

  public get myAgentPubKey(): AgentPubKey {
    return this.cellClient.cellId[1];
  }

  public get cellData(): InstalledCell {
    return (this.cellClient as any).cellData;
  }



  constructor(
    protected cellClient: CellClient,
    protected weDnaHash: DnaHashB64,
    public adminWebsocket: AdminWebsocket,
    protected membraneInvitationsService: MembraneInvitationsService
  ) {
    this.gamesService = new GamesService(cellClient);
    this.weService = new WeService(cellClient);
    this.profilesStore = new ProfilesStore(cellClient);

    cellClient.addSignalHandler((signal) => {
      const payload = signal.data.payload;
      switch (payload.message.type) {
        case "NewGame":
          this._allGames.update((s) => {
            if (!s.games[payload.gameHash]) {
              s.games[payload.gameHash] = payload.message.content;
            }
            return s;
          });
          break;
      }
    });
  }

  public async getDevhubHapp(): Promise<InstalledAppInfo> {
    const installedApps = await this.adminWebsocket.listApps({});
    return installedApps.find(
      (app) => app.installed_app_id === "DevHub"
    )!;
  }

  async fetchInfo(): Promise<Readable<WeInfo>> {
    const info = await this.weService.getInfo();

    return readable(info);
  }

  async fetchAllGames(): Promise<Readable<Record<EntryHashB64, Game>>> {
    const allGames = await this.gamesService.getAllGames();

    this._allGames = writable(allGames);

    return derived(this._allGames, (i) => i);
  }

  async fetchGamesIAmPlaying(): Promise<
    Readable<Record<EntryHashB64, PlayingGame>>
  > {
    const gamesIAmPlaying = await this.gamesService.getGamesIAmPlaying();

    const games: Record<EntryHashB64, Game> = {};
    const myOtherPubKeys: Record<EntryHashB64, AgentPubKeyB64> = {};

    for (const [gameHash, playingGame] of Object.entries(gamesIAmPlaying)) {
      myOtherPubKeys[gameHash] = playingGame.agentPubKey;
      games[gameHash] = playingGame.game;
    }

    this._gamesIAmPlaying.set(myOtherPubKeys);
    this._allGames.update((g) => ({
      ...g,
      ...games,
    }));

    return derived(
      [this._gamesIAmPlaying, this._allGames],
      ([playing, allGames]) => {
        const playingGames: Record<EntryHashB64, PlayingGame> = {};

        for (const [gameHash, agentPubKey] of Object.entries(playing)) {
          playingGames[gameHash] = {
            agentPubKey,
            game: allGames[gameHash],
          };
        }

        return playingGames;
      }
    );
  }

  async fetchGameRenderers(gameHash: EntryHashB64): Promise<GameRenderers> {

    const renderer = get(this._gameRenderers)[gameHash];
    if (renderer) return renderer;

    const game = get(this._allGames)[gameHash];
    const gamesIAmPlaying = get(this._gamesIAmPlaying)[gameHash];
    debugger
    const rendererBytes = await this.gamesService.queryGameGui(game.guiFileHash);
    // { type: "ribosome_error", data: "Wasm error while working with Ribosome: Serialize(Deserialize(\"invalid type: map, expected byte array\"))" }

    const file = new File(
      [new Blob([new Uint8Array(rendererBytes)])],
      "filename"
    );

    const mod = await importModuleFromFile(file);
    const gameGui: WeGame = mod.default; // for a Gui to be we-compatible it's default export must be of type WeGame

    const cell_data: InstalledCell[] = [];

    for (const [role_id, dnaHash] of Object.entries(game.dnaHashes)) {
      cell_data.push({
        cell_id: [
          deserializeHash(dnaHash),
          deserializeHash(gamesIAmPlaying[gameHash]),
        ],
        role_id,
      });
    }

    const renderers = gameGui.gameRenderers(this, {
      installed_app_id: "",
      cell_data,
      status: { running: null },
    });
    this._gameRenderers.update((s) => {
      s.renderers[gameHash] = renderers;
      return s;
    });

    return renderers;
  }



  // Installs the given game to the conductor, and registers it in the We DNA
  async createGame(
    gameInfo: GameInfo,
    installedAppId: InstalledAppId,
  ): Promise<EntryHashB64> {

    // --- Installing ---

    const devhubHapp = await this.getDevhubHapp();

    const compressedWebHapp = await fetchWebHapp(
      this.appWebsocket,
      devhubHapp,
      "hApp", // This is chosen arbitrarily at the moment
      gameInfo.entryHash,
      )

    // decompress bytearray into .happ and ui.zip (zlibt2)
    const bundle = decode(decompressSync(new Uint8Array(compressedWebHapp))) as any;

    // find out format of this decompressed object (see /devhub-dnas/zomes/happ_library/src/packaging.rs --> get_webhapp_package())
    const webappManifest = bundle.manifest;
    const resources = bundle.resources;


    const compressedHapp = resources[webappManifest.happ_manifest.bundled];
    const decompressedHapp = decode(decompressSync(new Uint8Array(compressedHapp))) as AppBundle;

    const uid = uuidv4();

    const request: InstallAppBundleRequest = {
      agent_key: this.myAgentPubKey,
      installed_app_id: installedAppId,
      membrane_proofs: {},
      bundle: decompressedHapp,
      uid: uid,
    }

    const appInfo = await this.adminWebsocket.installAppBundle(request);


    // console.log("worked :)");

    // // --- registering in the We DNA ---


    // decompress and etract index.js
    const compressedGui = resources[webappManifest.ui.bundled];

    const decompressedGui = unzipSync(new Uint8Array(compressedGui)) as any;

    const guiEntryHash = await this.gamesService.commitGuiFile(decompressedGui["index.js"]);


    console.log("cells:", appInfo.cell_data);

    const dnaHashes: Record<string, DnaHashB64> = {};
    appInfo.cell_data.forEach((cell) => {
      dnaHashes[cell.role_id] = serializeHash(cell.cell_id[0]);
    });

    console.log("DNA hashes", dnaHashes);

    const game: Game = {
      name: installedAppId,
      description: gameInfo.description,
      logoSrc: gameInfo.icon,

      devhubHappReleaseHash: serializeHash(gameInfo.entryHash),
      guiFileHash: guiEntryHash,

      properties: {},
      uid: { "hApp": uid },
      dnaHashes: dnaHashes,
    }

    // export interface Game {
    //   name: string;
    //   description: string;
    //   logoSrc: string;

    //   devhubHappReleaseHash: EntryHashB64;
    //   guiFileHash: EntryHashB64;

    //   properties: Record<string, Uint8Array>; // Segmented by RoleId
    //   uid: Record<string, string | undefined>; // Segmented by RoleId
    //   dnaHashes: Record<string, DnaHashB64>; // Segmented by RoleId
    // }

    const entryHash = await this.gamesService.createGame(game);
    console.log("Installation successful. EntryHash: ", entryHash);
    console.log("fetching all games to update this._allGames");
    await this.fetchAllGames();
    console.log("trying to fetch gameRenderers for game...");
    const renderers = await this.fetchGameRenderers(entryHash);
    console.log("renderers: ", renderers);
    return entryHash;
  }

/*
  gameUid(gameName: string) {
    return `wegame-${get(this.state).name}-game-${gameName}`;
  }

  // Installs the already existing game in this We to the conductor
  async playGame(gameHash: EntryHashB64) {
    const cellIds = await this.adminWebsocket.listCellIds();

    const dnaHashes = cellIds.map((cellId) => serializeHash(cellId[0]));

    // If the game is already installed, nothing to do
    if (dnaHashes.includes(gameHash)) return;

    const state = get(this.state);
    const game = state.games[gameHash];
    if (!game) {
      //TODO: fetch game entry
    }

    const name = this.gameUid(game.name);
    const file = await this.fileStorageService.downloadFile(game.dna_file_hash);

    await Promise.all([
      this.installGame(file, name),
      this.fetchRenderers(gameHash),
    ]);

    this.state.update((s) => {
      s.gamesAlreadyPlaying[gameHash] = true;
      return s;
    });
  }

  private async installGame(dnaFile: File, name: string): Promise<DnaHashB64> {
    const installAppBundleRequest: InstallAppBundleRequest = {
      installed_app_id: name,
      agent_key: deserializeHash(this.myAgentPubKey) as any,
      membrane_proofs: {},
      bundle: {
        manifest: {
          manifest_version: "1",
          name,
          roles: [
            {
              id: "game",
              dna: {
                bundled: "dna",
                uid: name,
                properties: {},
              } as any,
            },
          ],
        },
        resources: {
          dna: Array.from(new Uint8Array(await dnaFile.arrayBuffer())) as any,
        },
      },
      uid: name,
    };

    const appInfo: InstalledAppInfo =
      await this.adminWebsocket!.installAppBundle(installAppBundleRequest);
    const enabledResult = await this.adminWebsocket!.enableApp({
      installed_app_id: name,
    });

    return serializeHash(appInfo.cell_data[0].cell_id[0]);
  } */

  public async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    const weCell = this.cellClient.cellId;
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
      agentPubKey,

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

