import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { Record } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/elements/display-error.js";

import { Hrl } from "@lightningrodlabs/we-applet";
import { weStoreContext } from "../../context.js";
import {
  DnaLocation,
  EntryDefLocation,
} from "../../processes/hrl/locate-hrl.js";
import { weStyles } from "../../shared-styles.js";
import { WeStore } from "../../we-store.js";
import "./group-view.js";

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
    () =>
      join([
        this._weStore.dnaLocations.get(this.hrl[0]),
        this._weStore.hrlLocations.get(this.hrl[0]).get(this.hrl[1]),
      ]) as AsyncReadable<[DnaLocation, Record | undefined]>,
    () => [this.hrl]
  );

  renderGroupView(
    dnaLocation: DnaLocation,
    entryTypeLocation: EntryDefLocation
  ) {
    return html` <group-context .groupDnaHash=${dnaLocation.groupDnaHash}>
      <group-view
        .appletInstanceHash=${dnaLocation.appletInstanceHash}
        .view=${{
          type: "entry",
          role: dnaLocation.roleName,
          zome: entryTypeLocation.integrity_zome,
          entryType: entryTypeLocation.entry_def,
          hrl: this.hrl,
          context: this.context,
        }}
      ></group-view
    ></group-context>`;
  }

  render() {
    switch (this.location.value.status) {
      case "pending":
        return html`<div class="row center-content">
          <mwc-circular-progress></mwc-circular-progress>
        </div>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the entry")}
          .error=${this.location.value.error}
        ></display-error>`;
      case "complete":
        return this.renderGroupView(
          this.location.value.value[0],
          this.location.value.value[1] as any
        );
    }
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    weStyles,
  ];
}
