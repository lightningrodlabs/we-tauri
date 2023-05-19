import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { hashProperty } from "@holochain-open-dev/elements";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";

import { RenderView } from "applet-messages";

import { weStyles } from "../../shared-styles.js";
import { AppOpenViews } from "../types.js";
import { openViewsContext } from "../context.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { AppletHost } from "../../applets/applet-host.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  @property()
  renderView!: RenderView;

  @consume({ context: openViewsContext, subscribe: true })
  openViews!: AppOpenViews;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  host!: AppletHost;

  async connect() {
    this.host = new AppletHost(
      this.appletHash,
      this.iframe,
      this.weStore,
      this.openViews
    );

    this.host.renderView(this.renderView);
  }

  render() {
    return html`<iframe
      id="view-frame"
      src="applet://${encodeHashToBase64(this.appletHash)}"
      @load=${() => this.connect()}
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
