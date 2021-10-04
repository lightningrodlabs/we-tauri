import { DnaHashB64, AgentPubKeyB64 } from '@holochain-open-dev/core-types';
import { Dictionary, GameEntry, Players } from './types';

export class We {

  constructor(
    public name: string,
    public dna_hash: DnaHashB64,
    public logo_url: String,
    public selectedGame: string = "",
    public games: Dictionary<GameEntry> = {},
    public players: Players = {}
  ) {}

}
