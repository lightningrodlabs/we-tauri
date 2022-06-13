import { CellClient } from "@holochain-open-dev/cell-client";
import { EntryHashB64, AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { Game, PlayingGame, RegisterGameInput } from "./types";

export class GamesService {
  constructor(public cellClient: CellClient, protected zomeName = "games") {}

  async getAllGames(): Promise<Record<EntryHashB64, Game>> {
    return this.callZome("get_all_games", null);
  }

  async getGamesIAmPlaying(): Promise<Record<EntryHashB64, PlayingGame>> {
    console.log("FETCHING GAMES I AM PLAYING");
    return this.callZome("get_games_i_am_playing", null);
  }

  async createGame(registerGameInput: RegisterGameInput): Promise<EntryHashB64> {
    return this.callZome("create_game", registerGameInput);
  }

  async commitGuiFile(
    guiFile: Uint8Array
  ): Promise<EntryHashB64> {
    return this.callZome("commit_gui_file", guiFile);
  }

  async registerGame(
    gameAgentPubKey: AgentPubKeyB64,
    game: Game,
  ): Promise<EntryHashB64> {
    return this.callZome("register_game", { gameAgentPubKey, game });
  }

  async queryGameGui(guiHash: EntryHashB64): Promise<Uint8Array> {
    return this.callZome("query_game_gui", guiHash);
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
