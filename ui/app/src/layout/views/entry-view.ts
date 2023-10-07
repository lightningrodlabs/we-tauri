import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-to-clipboard.js";
import "@lightningrodlabs/we-applet/dist/elements/share-hrl.js";
import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";


import { Hrl } from "@lightningrodlabs/we-applet";

import { weStoreContext } from "../../context.js";
import {
  DnaLocation,
  EntryDefLocation,
} from "../../processes/hrl/locate-hrl.js";
import { weStyles } from "../../shared-styles.js";
import { WeStore } from "../../we-store.js";
import "./applet-view.js";
import { buildHeadlessWeClient } from "../../applets/applet-host.js";

@customElement("entry-view")
export class EntryView extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  /**
   * REQUIRED. The Hrl of the entry to render
   */
  @property()
  hrl!: Hrl;

  /**
   * REQUIRED. The context necessary to render this Hrl
   */
  @property()
  context!: any;

  location = new StoreSubscriber(
    this,
    () => this._weStore.hrlLocations.get(this.hrl[0]).get(this.hrl[1]),
    () => [this.hrl]
  );

  renderGroupView(
    dnaLocation: DnaLocation,
    entryTypeLocation: EntryDefLocation
  ) {
    return html`<applet-view
      style="flex: 1"
      .appletHash=${dnaLocation.appletHash}
      .view=${{
        type: "entry",
        roleName: dnaLocation.roleName,
        integrityZomeName: entryTypeLocation.integrity_zome,
        entryType: entryTypeLocation.entry_def,
        hrl: this.hrl,
        context: this.context,
      }}
    ></applet-view>
    <div id="we-toolbar" class="column toolbar">
      <we-client-context .weClient=${buildHeadlessWeClient(this._weStore)}>
        <share-hrl .hrl=${this.hrl} class="toolbar-btn" style="margin-bottom: 10px;"></share-hrl>
        <hrl-to-clipboard .hrl=${this.hrl} class="toolbar-btn" ></hrl-to-clipboard>
      </we-client-context>
    </div>
    `;
  }

  render() {
    switch (this.location.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the entry")}
          .error=${this.location.value.error}
        ></display-error>`;
      case "complete":
        if (this.location.value.value === undefined)
          return html`<span>${msg("Entry not found.")}</span>`;

        return this.renderGroupView(
          this.location.value.value.dnaLocation,
          this.location.value.value.entryDefLocation
        );
    }
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }

      .toolbar {
        position: fixed;
        bottom: 30px;
        right: 0;
        background: red;
        padding: 10px;
        border-radius: 20px 0 0 20px;
        background: #eacbff83;
        box-shadow: 0 0 6px #5804a8;
      }

      .toolbar-btn {
        font-size: 36px;
        --bg-color: #5804a8;
        --bg-color-hover: #913ede;
        color: white;
      }
    `,
    weStyles,
  ];
}
