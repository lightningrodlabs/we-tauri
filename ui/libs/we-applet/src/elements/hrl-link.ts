import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { lazyLoad, StoreSubscriber } from "@holochain-open-dev/stores";

import { weServicesContext } from "../context";
import { Hrl, WeServices } from "../types";

@localized()
@customElement("hrl-link")
export class HrlLink extends LitElement {
  @property()
  hrl!: Hrl;

  @property()
  context: any;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  info = new StoreSubscriber(
    this,
    () => lazyLoad(() => this.weServices.getEntryInfo(this.hrl)),
    () => [this.hrl]
  );

  render() {
    switch (this.info.value.status) {
      case "pending":
        return html`<sl-skeleton></sl-skeleton>`;
      case "complete":
        const info = this.info.value.value;

        if (info === undefined) return html`<sl-icon></sl-icon>`;

        return html`<sl-button
          @click=${() =>
            this.weServices.openViews.openHrl(this.hrl, this.context)}
        >
          <sl-icon slot="prefix" .src=${info.icon_src}></sl-icon>

          ${info.name}
        </sl-button>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the entry")}
          .error=${this.info.value.error.data.data}
        ></display-error>`;
    }
  }
}
