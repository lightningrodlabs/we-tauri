import { css, html, LitElement, PropertyValues } from "lit";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import {
  consume,
  provide
} from "@lit/context";
import { property, state } from "lit/decorators.js";
import { StoreSubscriber } from "lit-svelte-stores";
import { PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { get } from "svelte/store";

import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { DnaHash } from "@holochain/client";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";


export class WeGroupContext extends ScopedElementsMixin(LitElement) {
  @consume({ context: matrixContext, subscribe: true })
  @state()
  matrixStore!: MatrixStore;

  @provide({context: weGroupContext})
  @property()
  weGroupId!: DnaHash;

  @provide({context: profilesStoreContext})
  @property({attribute: false})
  profilesStore!: ProfilesStore;

  @provide({context: peerStatusStoreContext})
  @property({attribute: false})
  peerStatusStore!: PeerStatusStore;

  @provide({context: sensemakerStoreContext})
  @property({attribute: false})
  sensemakerStore!: SensemakerStore;


  connectedCallback() {
    super.connectedCallback();

    this.profilesStore = get(this.matrixStore?.profilesStore(this.weGroupId))!;
    this.peerStatusStore = get(this.matrixStore.peerStatusStore(this.weGroupId))!;
    this.sensemakerStore = get(this.matrixStore.sensemakerStore(this.weGroupId))!;
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("weGroupId")) {
      this.profilesStore = get(this.matrixStore?.profilesStore(this.weGroupId))!;
      this.peerStatusStore = get(this.matrixStore.peerStatusStore(this.weGroupId))!;
      this.sensemakerStore = get(this.matrixStore.sensemakerStore(this.weGroupId))!;
    }
  }

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
