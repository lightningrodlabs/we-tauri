import { hashProperty } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import {
  decodeHashFromBase64,
  EntryHash,
  EntryHashB64,
} from "@holochain/client";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { msg, localized } from "@lit/localize";
import { ProfilesLocation, RenderView } from "applet-messages";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import "./view-frame.js";
import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";
import { weStyles } from "../../shared-styles";

@localized()
@customElement("cross-applet-main")
export class CrossAppletMain extends LitElement {
  @property(hashProperty("app-bundle-hash"))
  appletBundleHash!: EntryHash;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  appletsForBundle = new StoreSubscriber(
    this,
    () => this.weStore.appletsForBundleHash.get(this.appletBundleHash),
    () => [this.appletBundleHash]
  );

  renderMain(applets: Record<EntryHashB64, ProfilesLocation>) {
    const renderView: RenderView = {
      type: "cross-applet-view",
      view: {
        type: "main",
      },
    };

    return html`<view-frame
      .renderView=${renderView}
      .appletHash=${decodeHashFromBase64(Object.keys(applets)[0])}
      style="flex: 1"
    >
    </view-frame>`;
  }

  render() {
    switch (this.appletsForBundle.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error initializing the client for this group")}
          .error=${this.appletsForBundle.value.error}
        ></display-error>`;
      case "complete":
        return this.renderMain(this.appletsForBundle.value.value);
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
