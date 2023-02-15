import { css, html, LitElement, PropertyValues } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  contextProvided,
  ContextProvider,
} from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { StoreSubscriber } from "lit-svelte-stores";
import { peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { profilesStoreContext } from "@holochain-open-dev/profiles";
import { get } from "svelte/store";

import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { DnaHash } from "@holochain/client";


export class WeGroupContext extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  matrixStore!: MatrixStore;

  @property()
  weGroupId!: DnaHash;

  _profilesStore = new StoreSubscriber(this, () => this.matrixStore?.profilesStore(this.weGroupId));
  _peerStatusStore = new StoreSubscriber(this, () => this.matrixStore?.peerStatusStore(this.weGroupId));


  _weGroupIdProvider!: ContextProvider<typeof weGroupContext>;
  _profilesProvider!: ContextProvider<typeof profilesStoreContext>;
  _peerStatusProvider!: ContextProvider<typeof peerStatusStoreContext>;

  connectedCallback() {
    super.connectedCallback();

    const profilesStore = get(this.matrixStore.profilesStore(this.weGroupId));
    const peerStatusStore = get(this.matrixStore.peerStatusStore(this.weGroupId));

    this._weGroupIdProvider = new ContextProvider(
      this,
      weGroupContext,
      this.weGroupId,
    );
    this._profilesProvider = new ContextProvider(
      this,
      profilesStoreContext,
      profilesStore
    );
    this._peerStatusProvider = new ContextProvider(
      this,
      peerStatusStoreContext,
      peerStatusStore
    );
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("weGroupId")) {
      this._profilesProvider.setValue(this._profilesStore.value!);
      this._peerStatusProvider.setValue(this._peerStatusStore.value!);
      this._weGroupIdProvider.setValue(this.weGroupId);
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