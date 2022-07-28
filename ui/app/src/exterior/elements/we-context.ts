import { css, html, LitElement, PropertyValues } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  ContextConsumer,
  contextProvided,
  ContextProvider,
} from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { StoreSubscriber } from "lit-svelte-stores";
import { peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import {
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import { get } from "svelte/store";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { WeStore } from "../../interior/we-store";
import { weContext } from "../../interior/context";
import { DnaHash } from "@holochain/client";

export class WeContext extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext, subscribe: true })
  @state()
  wesStore!: WesStore;

  @property()
  weId!: DnaHash;

  _weStore = new StoreSubscriber(this, () => this.wesStore?.weStore(this.weId));

  _provider!: ContextProvider<typeof weContext>;
  _profilesProvider!: ContextProvider<typeof profilesStoreContext>;
  _peerStatusProvider!: ContextProvider<typeof peerStatusStoreContext>;

  connectedCallback() {
    super.connectedCallback();

    const weStore = get(this.wesStore.weStore(this.weId));

    this._provider = new ContextProvider(this, weContext, weStore);
    this._profilesProvider = new ContextProvider(
      this,
      profilesStoreContext,
      weStore.profilesStore
    );
    this._peerStatusProvider = new ContextProvider(
      this,
      peerStatusStoreContext,
      weStore.peerStatusStore
    );
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("weId")) {
      this._provider.setValue(this._weStore.value);
      this._profilesProvider.setValue(this._weStore.value.profilesStore);
      this._peerStatusProvider.setValue(this._weStore.value.peerStatusStore);
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
