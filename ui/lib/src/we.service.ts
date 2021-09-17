import { CellClient } from '@holochain-open-dev/cell-client';
import { HoloHashed, serializeHash, EntryHashB64, HeaderHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';
import { GameEntry, Signal } from './types';

export class WeService {
  constructor(
    public cellClient: CellClient,
    protected zomeName = 'hc_zome_we'
  ) {}

  get myAgentPubKey() : AgentPubKeyB64 {
    return serializeHash(this.cellClient.cellId[1]);
  }

  async getGames(): Promise<Array<HoloHashed<GameEntry>>> {
    return this.callZome('get_games', null);
  }

  async createGame(game: GameEntry): Promise<EntryHashB64> {
    return this.callZome('create_game', game);
  }

  async notify(signal: Signal, folks: Array<AgentPubKeyB64>): Promise<void> {
    return this.callZome('notify', {signal, folks});
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
