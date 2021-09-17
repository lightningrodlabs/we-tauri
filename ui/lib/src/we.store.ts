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

  /** Actions */
  updateGames: () => Promise<Dictionary<GameEntry>>;
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

  const games: Readable<Dictionary<GameEntry>> = derived(gamesStore, i => i)

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
    async updateGames() : Promise<Dictionary<GameEntry>> {
      const games = await service.getGames();
      for (const s of games) {
        await updateGameFromEntry(s.hash, s.content)
      }
      return get(gamesStore)
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
