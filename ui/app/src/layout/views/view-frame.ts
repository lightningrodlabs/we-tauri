import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { hashProperty } from "@holochain-open-dev/elements";
import { encodeHashToBase64, EntryHash } from "@holochain/client";

import { RenderView, renderViewToQueryString } from "applet-messages";

import { weStyles } from "../../shared-styles.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @property()
  renderView!: RenderView;

  render() {
    return html`<iframe
      src="applet://${encodeHashToBase64(
        this.appletHash
      )}?${renderViewToQueryString(this.renderView)}"
      style="flex: 1"
    ></iframe>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
