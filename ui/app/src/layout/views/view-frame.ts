import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { hashProperty } from "@holochain-open-dev/elements";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";

import { RenderView, renderViewToQueryString } from "applet-messages";

import { weStyles } from "../../shared-styles.js";
import { appletOrigin } from "../../utils.js";
import { weStoreContext } from "../../context.js";
import { WeStore } from "../../we-store.js";

@customElement("view-frame")
export class ViewFrame extends LitElement {
  @consume({ context: weStoreContext })
  @state()
  weStore!: WeStore;

  @property(hashProperty("applet-hash"))
  appletHash!: EntryHash;

  @property()
  renderView!: RenderView;

  render() {
    console.log("rendering viewframe for appletHash: ", encodeHashToBase64(this.appletHash));
    return html`<iframe
      frameBorder="0"
      title="TODO"
      src="${appletOrigin(
        this.weStore.conductorInfo,
        this.appletHash
      )}?${renderViewToQueryString(this.renderView)}"
      style="flex: 1;"
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
