import { html, LitElement, PropertyValues } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Context,
  contextProvided,
  ContextProvider,
} from "@holochain-open-dev/context";
import { property, state } from "lit/decorators.js";
import { DnaHashB64 } from "@holochain-open-dev/core-types";
import { StoreSubscriber } from "lit-svelte-stores";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { WeStore } from "../../interior/we-store";
import { weContext } from "../../interior/context";

export class WeContext extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext, multiple: true })
  @state()
  wesStore!: WesStore;

  @property()
  weId!: DnaHashB64;

  _weStore = new StoreSubscriber(this, () => this.wesStore?.weStore(this.weId));

  _provider!: ContextProvider<Context<WeStore>>;

  firstUpdated() {
    this._provider = new ContextProvider(this, weContext, this._weStore.value);
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("weId")) {
      this._provider.setValue(this._weStore.value);
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
