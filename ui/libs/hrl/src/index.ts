import { DnaHash, ActionHash, EntryHash } from "@holochain/client";
export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { section: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}
