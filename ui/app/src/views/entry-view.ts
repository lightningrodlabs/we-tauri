import { provide } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators";

import { weStoreContext } from "../context";
import { Hrl } from "../hrl";
import { WeStore } from "../we-store";

export class GroupEntryView extends ScopedElementsMixin(LitElement) {
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
