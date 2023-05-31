import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { hashProperty } from "@holochain-open-dev/elements";
import { EntryHash } from "@holochain/client";

import { RenderView, renderViewToQueryString } from "applet-messages";

import { weStyles } from "../../shared-styles.js";
import { appletOrigin } from "../../utils.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @property()
  renderView!: RenderView;

  render() {
    return html`<iframe
      src="${appletOrigin(this.appletHash)}?${renderViewToQueryString(
        this.renderView
      )}"
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
