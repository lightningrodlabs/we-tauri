import { consume } from "@lit/context";
import { html, css } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { Snackbar } from "@scoped-elements/material-web";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { DnaHash, EntryHash } from "@holochain/client";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import { AppletListItem } from "./applet-list-item";
import { provideNewAppletInstancesForGroup } from "../../matrix-helpers";

export class JoinableAppletInstanceList extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _joinableApplets = new StoreSubscriber(
    this,
    () => provideNewAppletInstancesForGroup(this.matrixStore, this.weGroupId),
    () => [this.weGroupId, this.matrixStore]
  );

  joinApplet(appletInstanceId: EntryHash) {
    this.dispatchEvent(
      new CustomEvent("join-applet", {
        detail: appletInstanceId,
        bubbles: true,
        composed: true,
      })
    );
  }

  refresh() {
    provideNewAppletInstancesForGroup(this.matrixStore, this.weGroupId)
    // this.requestUpdate();
  }

  renderAppStates() {
    const applets = this._joinableApplets.value
    return html`
      ${applets.length === 0
            ? html`<p>There are no applet instances you haven't joined.</p>`
            : html `
            ${applets
              .sort((info_a, info_b) => info_a.applet.customName.localeCompare(info_b.applet.customName)) // sort alphabetically
              .map((appletInfo) => html`<applet-list-item .appletInfo=${appletInfo} .onJoin=${() => this.joinApplet(appletInfo.appletId)}></applet-list-item>`)
            }`
        }
        <div class="refresh-button-row">
          <nh-button
            .variant=${"neutral"}
            @click=${() => { this.refresh() }}
            .iconImageB64=${b64images.icons.refresh}
            .size=${"icon-label"}
          >Refresh</nh-button>
        </div>
      `
  }

  render() {
    return html`
      <mwc-snackbar
        id="app-disabled-snackbar"
        timeoutMs="4000"
        labelText="Applet disabled."
      ></mwc-snackbar>
      <mwc-snackbar
        id="app-enabled-snackbar"
        timeoutMs="4000"
        labelText="Applet started."
      ></mwc-snackbar>
      <mwc-snackbar
        id="app-uninstalled-snackbar"
        timeoutMs="4000"
        labelText="Applet uninstalled."
      ></mwc-snackbar>
      <mwc-snackbar
        style="text-align: center;"
        id="error-snackbar"
        labelText="Error."
      ></mwc-snackbar>

      ${this.renderAppStates()}
    `;
  }

  static elementDefinitions = {
    "applet-list-item": AppletListItem,
    "nh-button": NHButton,
    "mwc-snackbar": Snackbar,
  }

  static get styles() {
    return css`
      p {
        color: var(--nh-theme-fg-muted);
      }

      .refresh-button-row {
        margin: calc(1px * var(--nh-spacing-lg)) 0;
        display: grid;
        place-content: center;
      }
    `;
  }
}
