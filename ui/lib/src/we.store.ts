import { EntryHashB64, HeaderHashB64, AgentPubKeyB64, DnaHashB64, serializeHash, deserializeHash } from '@holochain-open-dev/core-types';
import { CellClient } from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';

import { WeService } from './we.service';
import { We } from './we';
import { Dictionary, GameEntry } from './types';
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";

const areEqual = (first: Uint8Array, second: Uint8Array) =>
  first.length === second.length && first.every((value, index) => value === second[index]);

export class WeStore {
  /** Private */
  private services: Dictionary<WeService> = {};
  private weStore: Writable<Dictionary<We>> = writable({});

  public adminWebsocket : AdminWebsocket | null = null;
  public appWebsocket : AppWebsocket | null = null;

  /** Static info */
  myAgentPubKey: AgentPubKeyB64 = ""; //TODO, fix based on assumption of agent key across we
  weDnaHash: DnaHashB64 = "";
  /** Readable stores */
  public wes: Readable<Dictionary<We>> = derived(this.weStore, i => i)

  public async newWe(weId: string, weLogo: string ) {
    console.log("new WE ", weId)
    const cellId = await this.adminWebsocket!.createCloneCell({
      dna_hash: new Buffer(deserializeHash(this.weDnaHash)),
      agent_key: new Buffer(deserializeHash(this.myAgentPubKey)),
      installed_app_id: "self",
      slot_id: "we-slot",
    })
    const installedCell: InstalledCell = {
      cell_id: cellId,
      cell_nick: weId,
    }
    console.log("with cellID", cellId)
    const cellClient = new HolochainClient(this.appWebsocket!, installedCell);
    this.addWe(weId, weLogo, cellClient)
  }

  public addWe(
    weId: string,
    weLogo: string,
    cellClient: CellClient,
    zomeName = 'hc_zome_we'
  ) {
    console.log("adding WE ", weId)
    this.services[weId] = new WeService(cellClient, zomeName);

    cellClient.addSignalHandler( signal => {
      if (! areEqual(cellClient.cellId[0],signal.data.cellId[0]) || !areEqual(cellClient.cellId[1], signal.data.cellId[1])) {
        return
      }
      console.log("SIGNAL",signal)
      const payload = signal.data.payload
      switch(payload.message.type) {
        case "NewGame":
          if (!get(this.wes)[weId].games[payload.gameHash]) {
            this.updateGameFromEntry(weId, payload.gameHash, payload.message.content)
          }
          break;
      }
    })
    this.weStore.update(wes => {
      wes[weId] = new We(weId, "fakeDnaHash", weLogo)
      return wes
    })

    this.updatePlayers(weId);
  }

  private async updateGameFromEntry (weId: string, hash: EntryHashB64, game: GameEntry) {
    this.weStore.update(wes => {
      wes[weId].games[hash] = game
      return wes
    })
  }

  private others() : Array<AgentPubKeyB64> {
    /// TODO: fixme
    return []
  }

  /** Actions */
  async updateGames(weId: string) : Promise<Dictionary<GameEntry>> {
    if (!this.services[weId]) {
      return {}
    }
    const games = await this.services[weId].getGames();
    for (const s of games) {
      await this.updateGameFromEntry(weId, s.hash, s.content)
    }
    return get(this.weStore)[weId].games
  }

  async updatePlayers(weId: string) : Promise<Array<AgentPubKeyB64>> {
    const players = await this.services[weId].getPlayers();
    for (const p of players) {
      this.weStore.update(wes => {
        if (wes[weId].players.indexOf(p) == -1) {
          wes[weId].players.push(p)
        }
        return wes
      })
    }
    return get(this.weStore)[weId].players
  }

  async addGame(weId: string, game: GameEntry) : Promise<EntryHashB64> {
    const hash: EntryHashB64 = await this.services[weId].createGame(game)
    this.weStore.update(wes => {
      wes[weId].games[hash] = game
      return wes
    })
    this.services[weId].notify({gameHash:hash, message: {type:"NewGame", content: game}}, this.others());
    return hash
  }

  currentGame(weId: string): GameEntry | null {
    const we = get(this.weStore)[weId]
    if (!we) return null
    else {
      return we.games[we.selectedGame];
    }
  }

  selectGame(weId: string, game: string) {
    console.log("selecting game:", game)
    this.weStore.update(wes => {
      wes[weId].selectedGame = game
      return wes
    })
  }

  selectedGame(weId: string): string {
    const we = get(this.weStore)[weId]
    return we ? we.selectedGame : "";
  }

  games(weId: string): Dictionary<GameEntry> {
    const we = get(this.weStore)[weId]
    return we ? we.games : {};
  }

}
