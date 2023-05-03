import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";

import { encodeHashToBase64 } from "@holochain/client";
import { wrapPathInSvg } from "@holochain-open-dev/elements";
import { mdiShareVariant } from "@mdi/js";

import { Hrl } from "../types";

@localized()
@customElement("share-hrl")
export class ShareHrl extends LitElement {
  @property()
  hrl!: Hrl;

  @property()
  context: any;

  async copyHrl() {
    const url = `hrl://${encodeHashToBase64(this.hrl[0])}/${this.hrl[1]}`;
    await navigator.clipboard.writeText(url);
  }

  render() {
    return html`
      <sl-tooltip .content=${msg("Share")}>
        <sl-icon-button
          .src=${wrapPathInSvg(mdiShareVariant)}
          .label=${msg("Share")}
          @click=${() => this.copyHrl()}
        ></sl-icon-button>
      </sl-tooltip>
    `;
  }
}
