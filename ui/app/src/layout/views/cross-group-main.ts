import { hashProperty } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { EntryHash } from "@holochain/client";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { InternalGroupWithApplets, RenderView } from "applet-messages";
import { consume } from "@lit-labs/context";
import { msg, localized } from "@lit/localize";
import { DnaHash } from "@holochain/client";
import { HoloHashMap } from "@holochain-open-dev/utils";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";

import "./view-frame.js";
import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";
import { weStyles } from "../../shared-styles";

@localized()
@customElement("cross-group-main")
export class CrossGroupMain extends LitElement {
  @property(hashProperty("devhub-app-release-hash"))
  devhubAppReleaseHash!: EntryHash;

  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  appletsByGroup = new StoreSubscriber(
    this,
    () => this.weStore.appletsByGroup.get(this.devhubAppReleaseHash),
    () => [this.devhubAppReleaseHash]
  );

  renderMain(
    appletsByGroup: HoloHashMap<DnaHash, InternalGroupWithApplets>,
    appletInstalledAppId: string
  ) {
    const renderView: RenderView = {
      type: "cross-group-view",
      view: {
        type: "main",
      },
      appletsByGroup,
    };

    return html`<view-frame
      .renderView=${renderView}
      .appletInstalledAppId=${appletInstalledAppId}
    >
    </view-frame>`;
  }

  render() {
    switch (this.appletsByGroup.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error initializing the client for this group")}
          .error=${this.appletsByGroup.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderMain(
          this.appletsByGroup.value.value.appletsByGroup,
          this.appletsByGroup.value.value.appletInstalledAppId
        );
    }
  }

  static styles = [weStyles];
}
