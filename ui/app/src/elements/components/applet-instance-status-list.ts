import { JoinMembraneInvitation } from "@neighbourhoods/membrane-invitations";
import { consume } from "@lit/context";
import { decode } from "@msgpack/msgpack";
import { html, css } from "lit";
import { StoreSubscriber   } from "lit-svelte-stores";
import {
  Button,
  Card,
  Snackbar,
  Icon,
  Dialog,
  IconButton,
} from "@scoped-elements/material-web";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { property, query, state } from "lit/decorators.js";
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { ActionHash, DnaHash, AppInfo } from "@holochain/client";
import { getStatus } from "@neighbourhoods/app-loader";
import { FederateAppletDialog } from "../dialogs/federate-applet-dialog";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { NHButton, NHComponent, NHDialog } from "@neighbourhoods/design-system-components";
import { b64images } from "@neighbourhoods/design-system-styles";
import { AppletListItem } from "./applet-list-item";
import { UninstallApplet } from "../dialogs/uninstall-applet";
import { AppletInstanceInfo } from "../../types";

export class AppletInstanceStatusList extends NHComponent {
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  _sensemakerStore!: SensemakerStore;

  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _installedApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getAppletInstanceInfosForGroup(this.weGroupId)
  );

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  @query("#uninstall-applet-dialog")
  _uninstallAppletDialog;

  @query("#federate-applet-dialog")
  _federateAppletDialog!: FederateAppletDialog;

  @state()
  private _currentAppInfo!: AppletInstanceInfo;

  async joinGroup(
    invitationActionHash: ActionHash,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.clone_dna_recipe.properties) as any;
    await this.matrixStore
      .joinWeGroup(
        invitationActionHash,
        properties.name,
        properties.logoSrc,
        properties.timestamp,
        properties.caPubKey
      )
      .then((weGroupId) => {
        this.dispatchEvent(
          new CustomEvent("we-group-joined", {
            detail: weGroupId,
            bubbles: true,
            composed: true,
          })
        );
      })
      .catch((e) => {
        if (e.data.data) {
          if (e.data.data.includes("AppAlreadyInstalled")) {
            (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
          }
        }
      });
  }

  async uninstallApp(appInfo: AppInfo) {
    console.log("Uninstalling applet: ", appInfo);
    this.matrixStore.uninstallApp(appInfo)
      .then(async () => {
        (this.shadowRoot?.getElementById("app-uninstalled-snackbar") as Snackbar).show();
        await this.matrixStore.fetchMatrix();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  refresh() {
    this.matrixStore.fetchMatrix();
    this.requestUpdate();
  }

  renderAppStates() {
    const appletInstanceInfos = this._installedApplets.value;
    return html`
      ${
        appletInstanceInfos!.length == 0 || !appletInstanceInfos
          ? html`<p>You have no applet instances installed in this neighbourhood.</p>`
          : html `
          ${appletInstanceInfos
            .sort((info_a, info_b) => { // show disabled applets on top, then sort alphabetically
              if (getStatus(info_a.appInfo) !== getStatus(info_b.appInfo)) {
                return getStatus(info_a.appInfo).localeCompare(getStatus(info_b.appInfo));
              } else {
                return info_a.applet.customName.localeCompare(info_b.applet.customName)
              }
            })
            .map((appletInfo: AppletInstanceInfo) => {
              return html`
                <applet-list-item .sensemakerStore=${this._sensemakerStore} .appletInfo=${appletInfo} .appletStatus=${getStatus(appletInfo.appInfo)} .onDelete=${() => {this._currentAppInfo = appletInfo; this._uninstallAppletDialog.open()}}></applet-list-item>
              `;
            })}`
      }

      <div class="refresh-button-row">
        <nh-button
          .variant=${"neutral"}
          @click=${this.refresh}
          .iconImageB64=${b64images.icons.refresh}
          .size=${"icon-label"}
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
        @confirm-uninstall=${() => {this.uninstallApp(this._currentAppInfo.appInfo)}}
      ></uninstall-applet-dialog>

      <federate-applet-dialog
        id="federate-applet-dialog"
      ></federate-applet-dialog>

      ${this.renderAppStates()}
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-button": NHButton,
      "mwc-button": Button,
      "mwc-icon-button": IconButton,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
      "create-we-group-dialog": CreateNeighbourhoodDialog,
      "sl-tooltip": SlTooltip,
      "mwc-dialog": Dialog,
      "applet-list-item": AppletListItem,
      "uninstall-applet-dialog": UninstallApplet,
      "federate-applet-dialog": FederateAppletDialog,
      'nh-dialog': NHDialog,
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
