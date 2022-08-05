import { PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement } from "lit";
import { property } from "lit/decorators";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";








export class WeGroupHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @property()
  weGroupId!: EntryHash;




}