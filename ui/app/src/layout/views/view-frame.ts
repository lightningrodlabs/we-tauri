import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { AppletToParentRequest, RenderView } from "applet-messages";
import { weStyles } from "../../shared-styles.js";
import { consume } from "@lit-labs/context";
import { AppOpenViews } from "../types.js";
import { openViewsContext } from "../context.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { AppletHost } from "../../applet-host.js";
import { hashProperty } from "@holochain-open-dev/elements";
import { DnaHash } from "@holochain/client";
import { EntryHash } from "@holochain/client";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @property()
  appletInstalledAppId!: string;

  @property(hashProperty("group-dna-hash"))
  groupDnaHash!: DnaHash;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  @property()
  renderView!: RenderView;

  @consume({ context: openViewsContext, subscribe: true })
  openViews!: AppOpenViews;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  host!: AppletHost;

  async firstUpdated() {
    this.host = await AppletHost.connect(
      this.appletInstalledAppId,
      this.groupDnaHash,
      this.appletInstanceHash,
      this.iframe,
      this.weStore,
      this.openViews
    );

    this.host.renderView(this.renderView);
  }

  render() {
    return html`<iframe
      id="view-frame"
      src="applet://${this.appletInstalledAppId}"
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
