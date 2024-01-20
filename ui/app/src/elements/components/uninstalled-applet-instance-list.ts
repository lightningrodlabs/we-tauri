import { consume } from "@lit/context";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { html, LitElement, css } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import {
  Button,
  List,
  ListItem,
  Card,
  Snackbar,
  Icon,
  Dialog,
} from "@scoped-elements/material-web";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { property, query, state } from "lit/decorators.js";
import { HoloIdenticon } from './holo-identicon.js';
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { DnaHash, EntryHash } from "@holochain/client";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHButton } from "@neighbourhoods/design-system-components";
import { UninstallApplet } from "../dialogs/uninstall-applet";
import { AppletListItem } from "./applet-list-item";
import { UninstalledAppletInstanceInfo } from "../../types";

export class UninstalledAppletInstanceList extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _uninstalledApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getUninstalledAppletInstanceInfosForGroup(this.weGroupId)
  );

  @state()
  private _currentAppInfo!: UninstalledAppletInstanceInfo;

  reinstallApp(appletInstanceId: EntryHash) {
    this.dispatchEvent(
      new CustomEvent("reinstall-applet", {
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
    const appletInstanceInfos = this._uninstalledApplets.value;
    return html`${appletInstanceInfos?.length == 0 || !appletInstanceInfos
      ? html`<p>You have no applet instances to uninstall in this neighbourhood.</p>`
      : html`
      ${
        appletInstanceInfos!.length == 0 || !appletInstanceInfos
          ? html`<p>You have no applet instances installed in this neighbourhood.</p>`
          : html `
          ${appletInstanceInfos
            .sort((info_a, info_b) => info_a.applet.customName.localeCompare(info_b.applet.customName)) // sort alphabetically
          .map((appletInfo) => {
            return html`<applet-list-item .appletInfo=${appletInfo} .onReinstall=${() => {this._currentAppInfo = appletInfo; // TODO do something
          }}></applet-list-item>`;
          })}`
        }
    `}
      <div class="refresh-button-row">
        <nh-button
          .variant=${"neutral"}
          @click=${this.refresh}
          .iconImageB64=${b64images.icons.refresh}
          .size=${"icon-lg"}
        >Refresh</nh-button>
      </div>
    `;
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

      <uninstall-applet-dialog
        id="uninstall-applet-dialog"
        @confirm-uninstall=${() => {this.reinstallApp(this._currentAppInfo.appletId)}}
      ></uninstall-applet-dialog>

      ${this.renderAppStates()}
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-button": NHButton,
      "mwc-snackbar": Snackbar,
      "applet-list-item": AppletListItem,
    };
  }

  static get styles() {
    let localStyles = css`
      p {
        color: var(--nh-theme-fg-muted);
      }

      .refresh-button-row {
        margin: calc(1px * var(--nh-spacing-lg)) 0;
        display: grid;
        place-content: center;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
