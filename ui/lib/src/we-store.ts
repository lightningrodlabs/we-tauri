import { CellClient, HolochainClient } from "@holochain-open-dev/cell-client";
import {
  DnaHashB64,
  AgentPubKeyB64,
  EntryHashB64,
  serializeHash,
  deserializeHash,
} from "@holochain-open-dev/core-types";
import { FileStorageService } from "@holochain-open-dev/file-storage";
import {
  AdminWebsocket,
  AppWebsocket,
  CellId,
  InstallAppBundleRequest,
  InstalledAppInfo,
  InstalledCell,
} from "@holochain/conductor-api";
import {
  derived,
  get,
  Readable,
  readable,
  writable,
  Writable,
} from "svelte/store";
import { importModuleFromFile } from "./renderers/processes/import-module-from-file";
import { Renderers, SetupRenderers } from "./renderers/types";
import { Dictionary, GameEntry, Players } from "./types";
import { WeService } from "./we.service";
import { Buffer } from "buffer";

export interface WeState {
  name: string;
  logo_url: string;
  selectedGame: string | undefined;
  games: Dictionary<GameEntry>;
  gamesAlreadyPlaying: Dictionary<boolean>;
  renderers: Dictionary<Renderers>;
  players: Players;
}

export interface WeInfo {
  name: string;
  logo_url: string;
}

export interface AddGameInput {
  dna_file_hash: EntryHashB64;
  ui_file_hash: EntryHashB64;
  name: string;
  logo_url: string;
}

const areEqual = (first: Uint8Array, second: Uint8Array) =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export class WeStore {
  private state: Writable<WeState>;
  private service: WeService;
  public fileStorageService: FileStorageService;

  public games: Readable<Dictionary<GameEntry>>;
  public selectedGameId: Readable<EntryHashB64 | undefined>;
  public players: Readable<Players>;
  public info: Readable<WeInfo>;

  public game(gameHash: EntryHashB64): Readable<
    | {
        info: GameEntry;
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

  public get appWebsocket(): AppWebsocket {
    return (this.service.cellClient as any).appWebsocket;
  }

  public get myAgentPubKey(): AgentPubKeyB64 {
    return serializeHash(this.service.cellClient.cellId[1]);
  }

  public get cellData(): InstalledCell {
    return (this.service.cellClient as any).cellData;
  }

  private constructor(
    weId: string,
    protected adminWebsocket: AdminWebsocket,
    cellClient: CellClient
  ) {
    this.service = new WeService(cellClient);
    this.fileStorageService = new FileStorageService(cellClient);

    this.state = writable({
      name: weId,
      logo_url: "",
      players: {},
      games: {},
      gamesAlreadyPlaying: {},
      renderers: {},
      selectedGame: undefined,
    });
    this.games = derived(this.state, (s) => s.games);
    this.players = derived(this.state, (s) => s.players);
    this.selectedGameId = derived(this.state, (s) => s.selectedGame);

    this.info = derived(this.state, (s) => ({
      logo_url: s.logo_url,
      name: s.name,
    }));

    cellClient.addSignalHandler((signal) => {
      if (
        !areEqual(cellClient.cellId[0], signal.data.cellId[0]) ||
        !areEqual(cellClient.cellId[1], signal.data.cellId[1])
      ) {
        return;
      }
      console.log("SIGNAL", signal);
      const payload = signal.data.payload;
      switch (payload.message.type) {
        case "NewGame":
          this.state.update((s) => {
            if (!s.games[payload.gameHash]) {
              s.games[payload.gameHash] = payload.message.content;
            }
            return s;
          });
          break;
      }
    });
  }

  static async create(
    weId: string,
    adminWebsocket: AdminWebsocket,
    cellClient: CellClient
  ): Promise<WeStore> {
    const store = new WeStore(weId, adminWebsocket, cellClient);
    await Promise.all([store.fetchPlayers(), store.fetchWeInfo()]);
    return store;
  }

  async fetchWeInfo() {
    const logo_url = await this.service.getLogoUrl();

    this.state.update((s) => {
      s.logo_url = logo_url;
      return s;
    });
  }

  async fetchGames() {
    const [games, cellIds] = await Promise.all([
      this.service.getGames(),
      this.adminWebsocket.listCellIds(),
    ]);

    const dnaHashes = cellIds.map((cellId) => serializeHash(cellId[0]));

    this.state.update((s) => {
      for (const game of games) {
        s.games[game.hash] = game.content;
        if (dnaHashes.includes(game.content.dna_hash))
          s.gamesAlreadyPlaying[game.hash] = true;
      }

      return s;
    });
  }

  async fetchPlayers() {
    const players = await this.service.getPlayers();

    this.state.update((s) => {
      s.players = players;
      return s;
    });
  }

  async fetchRenderers(gameHash: EntryHashB64) {
    const state = get(this.state);
    const game = state.games[gameHash];
    if (!game) {
      //TODO: fetch game entry
    }

    if (state.renderers[gameHash]) return;

    const file = await this.fileStorageService.downloadFile(game.ui_file_hash);
    const mod = await importModuleFromFile(file);
    const setupRenderers: SetupRenderers = mod.default;

    const renderers = setupRenderers(this.appWebsocket, {
      cell_id: [deserializeHash(game.dna_hash) as Buffer, deserializeHash(this.myAgentPubKey) as Buffer],
      cell_nick: game.name
    });
    this.state.update((s) => {
      s.renderers[gameHash] = renderers;
      return s;
    });
  }

  selectGame(gameHash: EntryHashB64 | undefined) {
    this.state.update((s) => {
      s.selectedGame = gameHash;
      return s;
    });

  }

  // Installs the given game to the conductor, and registers it in the We DNA
  async createGame(
    dnaFile: File,
    setupRenderers: SetupRenderers,
    gameInput: AddGameInput
  ): Promise<EntryHashB64> {
    // Install game
    const name = this.gameUid(gameInput.name);

    const dnaHash = await this.installGame(dnaFile, name);

    const game: GameEntry = {
      dna_file_hash: gameInput.dna_file_hash,
      ui_file_hash: gameInput.ui_file_hash,
      dna_hash: dnaHash,
      logo_url: gameInput.logo_url,
      name: gameInput.name,
      meta: {},
    };

    const hash: EntryHashB64 = await this.service.createGame(game);
    this.state.update((s) => {
      s.games[hash] = game;
      s.renderers[hash] = setupRenderers(this.appWebsocket, this.cellData);
      s.gamesAlreadyPlaying[hash] = true;
      s.selectedGame = hash;
      this.service.notify(
        { gameHash: hash, message: { type: "NewGame", content: game } },
        Object.keys(s.players)
      );
      return s;
    });
    return hash;
  }

  gameUid(gameName: string) {
    return `wegame-${get(this.state).name}-game-${gameName}`;
  }

  // Installs the already existing game in this We to the conductor
  async addGame(gameHash: EntryHashB64) {
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
          slots: [
            {
              id: "game",
              dna: {
                bundled: "dna",
                uid: name,
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
  }
}
