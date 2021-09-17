import { EntryHashB64, HeaderHashB64, AgentPubKeyB64, serializeHash } from '@holochain-open-dev/core-types';
import { CellClient } from '@holochain-open-dev/cell-client';
import { writable, Writable, derived, Readable, get } from 'svelte/store';

import { WeService } from './we.service';
import { Dictionary, GameEntry,} from './types';

export interface WeStore {
  /** Static info */
  myAgentPubKey: AgentPubKeyB64;

  /** Readable stores */
  games: Readable<Dictionary<GameEntry>>;
  players: Readable<Array<AgentPubKeyB64>>;

  /** Actions */
  updateGames: () => Promise<Dictionary<GameEntry>>;
  updatePlayers: () => Promise<Array<AgentPubKeyB64>>;
  addGame: (game: GameEntry) => Promise<EntryHashB64>;
  game: (game:string) => GameEntry;
}

export function createWeStore(
  cellClient: CellClient,
  zomeName = 'hc_zome_we'
): WeStore {
  const myAgentPubKey = serializeHash(cellClient.cellId[1]);
  const service = new WeService(cellClient, zomeName);

  const gamesStore: Writable<Dictionary<GameEntry>> = writable({});

  const playersStore: Writable<Array<AgentPubKeyB64>> = writable([]);

  const games: Readable<Dictionary<GameEntry>> = derived(gamesStore, i => i)

  const players: Readable<Array<AgentPubKeyB64>> = derived(playersStore, i => i)

  const updateGameFromEntry = async (hash: EntryHashB64, game: GameEntry) => {
    gamesStore.update(games => {
      games[hash] = game
      return games
    })
  }

  const others = () : Array<AgentPubKeyB64> => {
    /// TODO: fixme
    return []
  }

  service.cellClient.addSignalHandler( signal => {
    console.log("SIGNAL",signal)
    const payload = signal.data.payload
    switch(payload.message.type) {
      case "NewGame":
        if (!get(games)[payload.gameHash]) {
          updateGameFromEntry(payload.gameHash, payload.message.content)
        }
        break;
    }
  })


  return {
    myAgentPubKey,
    games,
    players,
    async updateGames() : Promise<Dictionary<GameEntry>> {
      const games = await service.getGames();
      for (const s of games) {
        await updateGameFromEntry(s.hash, s.content)
      }
      return get(gamesStore)
    },
    async updatePlayers() : Promise<Array<AgentPubKeyB64>> {
      const players = await service.getPlayers();
      for (const p of players) {
        playersStore.update(players => {
          if (players.indexOf(p) == -1) {
            players.push(p)
          }
          return players
        })
      }
      return get(playersStore)
    },
    async addGame(game: GameEntry) : Promise<EntryHashB64> {
      const hash: EntryHashB64 = await service.createGame(game)
      gamesStore.update(games => {
        games[hash] = game
        return games
      })
      service.notify({gameHash:hash, message: {type:"NewGame", content: game}}, others());
      return hash
    },

    game(game: string): GameEntry {
      return get(gamesStore)[game];
    },

  };
}
