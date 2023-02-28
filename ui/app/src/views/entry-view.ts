import { provide } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators";

import { weStoreContext } from "../context.js";
import { Hrl } from "../hrl.js";
import { WeStore } from "../we-store.js";

export class EntryView extends ScopedElementsMixin(LitElement) {
  @provide({ context: weStoreContext })
  _weStore!: WeStore;

  /**
   * REQUIRED. The HRL of the entry to render
   */
  @property()
  hrl!: Hrl;

  render() {
    return html``;
  }
}
