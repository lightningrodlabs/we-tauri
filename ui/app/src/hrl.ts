import { ActionHash, DnaHash, EntryHash } from "@holochain/client";

export type Hrl = [DnaHash, EntryHash | ActionHash];
