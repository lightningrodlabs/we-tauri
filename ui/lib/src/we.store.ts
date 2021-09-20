import { EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash } from '@holochain-open-dev/core-types';
import { CellClient } from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';

import { WeService } from './we.service';
import { Dictionary, GameEntry,} from './types';

export class WeStore {
  /** Private */
  private service: WeService;
  private gamesStore: Writable<Dictionary<GameEntry>> = writable({});
  private playersStore: Writable<Array<AgentPubKeyB64>> = writable([]);


  /** Static info */
  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  public games: Readable<Dictionary<GameEntry>> = derived(this.gamesStore, i => i)
  public players: Readable<Array<AgentPubKeyB64>> = derived(this.playersStore, i => i)

 constructor(
    protected cellClient: CellClient,
    zomeName = 'hc_zome_we'
  ) {
    this.myAgentPubKey = serializeHash(cellClient.cellId[1]);
    this.service = new WeService(cellClient, zomeName);

    cellClient.addSignalHandler( signal => {
      console.log("SIGNAL",signal)
      const payload = signal.data.payload
      switch(payload.message.type) {
        case "NewGame":
          if (!get(this.games)[payload.gameHash]) {
            this.updateGameFromEntry(payload.gameHash, payload.message.content)
          }
          break;
      }
    })
  }

  private async updateGameFromEntry (hash: EntryHashB64, game: GameEntry) {
    this.gamesStore.update(games => {
      games[hash] = game
      return games
    })
  }

  private others() : Array<AgentPubKeyB64> {
    /// TODO: fixme
    return []
  }

  /** Actions */
  async updateGames() : Promise<Dictionary<GameEntry>> {
    const games = await this.service.getGames();
    for (const s of games) {
      await this.updateGameFromEntry(s.hash, s.content)
    }
    return get(this.gamesStore)
  }

  async updatePlayers() : Promise<Array<AgentPubKeyB64>> {
    const players = await this.service.getPlayers();
    for (const p of players) {
      this.playersStore.update(players => {
        if (players.indexOf(p) == -1) {
          players.push(p)
        }
        return players
      })
    }
    return get(this.playersStore)
  }

  async addGame(game: GameEntry) : Promise<EntryHashB64> {
    const hash: EntryHashB64 = await this.service.createGame(game)
    this.gamesStore.update(games => {
      games[hash] = game
      return games
    })
    this.service.notify({gameHash:hash, message: {type:"NewGame", content: game}}, this.others());
    return hash
  }

  game(game: string): GameEntry {
    return get(this.gamesStore)[game];
  }
}
