import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { EntryInfo, Hrl } from "@lightningrodlabs/we-applet";

import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { weStyles } from "../../shared-styles.js";

@customElement("entry-title")
export class EntryTitle extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  /**
   * REQUIRED. The Hrl of the entry to render
   */
  @property()
  hrl!: Hrl;

  /**
   * REQUIRED. The context necessary to render this Hrl
   */
  @property()
  context!: any;

  entryInfo = new StoreSubscriber(
    this,
    () => this._weStore.entryInfo.get(this.hrl[0]).get(this.hrl[1]),
    () => [this.hrl]
  );

  renderName(info: EntryInfo | undefined) {
    if (!info) return html`[Unknown]`;

    return html` <sl-icon
        .src=${info.icon_src}
        style="display: flex; margin-top: 2px; margin-right: 4px"
      ></sl-icon>
      <span style="color: rgb(119,119,119)">${info.name}</span>`;
  }

  render() {
    switch (this.entryInfo.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderName(this.entryInfo.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the information about the entry")}
          .error=${this.entryInfo.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
