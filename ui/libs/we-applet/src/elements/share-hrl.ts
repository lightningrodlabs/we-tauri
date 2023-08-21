import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";

import { encodeHashToBase64 } from "@holochain/client";
import { notify, wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiShareVariant } from "@mdi/js";

import { Hrl } from "../types";

@localized()
@customElement("share-hrl")
export class ShareHrl extends LitElement {
  @property()
  hrl!: Hrl;

  async copyHrl() {
    const url = `https://lightningrodlabs.org/we?we://hrl/${encodeHashToBase64(
      this.hrl[0]
    )}/${encodeHashToBase64(this.hrl[1])}`;
    await navigator.clipboard.writeText(url);

    notify(msg("Link copied to the clipboard."));
  }

  render() {
    return html`
      <sl-tooltip .content=${msg("Share")}>
        <sl-icon-button
          .src=${wrapPathInSvg(mdiShareVariant)}
          .label=${msg("Share")}
          tabindex="0"
          @click=${() => this.copyHrl()}
          @keypress.enter=${() => this.copyHrl()}
        ></sl-icon-button>
      </sl-tooltip>
    `;
  }
}
