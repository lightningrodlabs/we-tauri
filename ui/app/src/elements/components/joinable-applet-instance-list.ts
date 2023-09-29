import { contextProvided } from "@lit-labs/context";
import { html, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { Snackbar } from "@scoped-elements/material-web";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { DnaHash, EntryHash } from "@holochain/client";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import { AppletListItem } from "./applet-list-item";

export class JoinableAppletInstanceList extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _joinableApplets = new TaskSubscriber(
    this,
    () => this.matrixStore.fetchNewAppletInstancesForGroup(this.weGroupId),
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
    this.matrixStore.fetchMatrix();
    this.requestUpdate();
  }

  renderAppStates() {
    const appletInstanceInfos = this._joinableApplets?.value;
    return html`
      ${
        !appletInstanceInfos || appletInstanceInfos!.length == 0
          ? html`<p>There are no applet instances you haven't joined.</p>`
          : html `
          ${appletInstanceInfos
            .sort((info_a, info_b) => info_a.applet.customName.localeCompare(info_b.applet.customName)) // sort alphabetically
            .map((appletInfo) => html`<applet-list-item .appletInfo=${appletInfo} .onJoin=${() => this.joinApplet(appletInfo.appletId)}></applet-list-item>`)
          }`
      }
    
      <div class="refresh-button-row">
        <nh-button
          label="Refresh"
          .variant=${"neutral"}
          .clickHandler=${() => { this.refresh() }}
          .iconImageB64=${b64images.icons.refresh}
          .size=${"icon-lg"}
        >
        </nh-button>
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
