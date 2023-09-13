import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
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
import { query } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/elements";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { DnaHash, EntryHash } from "@holochain/client";
import { UninstallAppletDialog } from "../dialogs/uninstall-applet-dialog";

export class UninstalledAppletInstanceList extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _uninstalledApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getUninstalledAppletInstanceInfosForGroup(this.weGroupId)
  );



  reinstallApp(appletInstanceId: EntryHash) {
    this.dispatchEvent(
      new CustomEvent("reinstall-applet", {
        detail: appletInstanceId,
        bubbles: true,
        composed: true,
      })
    );
  }



  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        style="text-align: center;"
        id="error-snackbar"
        labelText="Error."
      >
      </mwc-snackbar>
    `;
  }

  renderAppStates() {
    const appletInstanceInfos = this._uninstalledApplets.value;
    if (!appletInstanceInfos || appletInstanceInfos.length == 0) {
      // TODO! make sure that this refresh button actually does anything.
      return html`
        <div style="margin-top: 10px;">There are no uninstalled applet instances.</div>
        <div class="row center-content">
          <mwc-button
            style="margin-top: 20px; text-align: center;"
            @click=${() => { this.matrixStore.fetchMatrix(); this.requestUpdate(); }}
            icon="refresh"
            >Refresh</mwc-button
          >
        </div>
      `;
    } else {
      return html`
        ${appletInstanceInfos
          .sort((info_a, info_b) => info_a.applet.customName.localeCompare(info_b.applet.customName)) // sort alphabetically
          .map((appletInfo) => {
            return html`
              <div class="column" style="align-items: right; width: 100%;">
                <mwc-card style="margin: 5px;">
                  <div
                    class="row"
                    style="align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em"
                  >
                    <img
                        style="margin-right: 10px;"
                        class="applet-image"
                        src=${appletInfo.applet.logoSrc!}
                      />
                    <strong>${appletInfo.applet.customName}</strong>
                    <div class="row" style="margin-left: auto; align-items: center;">

                      <mwc-button
                        class="reinstall-button"
                        raised
                        label="REINSTALL"
                        @click=${() => this.reinstallApp(appletInfo.appletId)}
                      >
                      </mwc-button>
                    </div>
                  </div>
                </mwc-card>
              </div>
            `;
          })
        }
        <div class="row center-content">
          <mwc-button
            style="margin-top: 20px; text-align: center;"
            @click=${() => { this.matrixStore.fetchMatrix(); this.requestUpdate(); }}
            icon="refresh"
            >Refresh</mwc-button
          >
        </div>
      `;
    }
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
      ${this.renderErrorSnackbar()}


      ${this.renderAppStates()}
    `;
  }

  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "create-we-group-dialog": CreateWeGroupDialog,
      "sl-tooltip": SlTooltip,
      "mwc-dialog": Dialog,
      "uninstall-applet-dialog": UninstallAppletDialog,
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
      }

      .title {
        align-items: center;
        font-size: 1.2em;
        text-align: center;
      }

      .start-button {
        --mdc-theme-primary: #17c200;
      }

      .disable-button {
        --mdc-theme-primary: #f9a70a;;
      }

      .reinstall-button {
        /* --mdc-theme-primary: #17c200; */
        margin-left: 5px;
      }

      .applet-image {
        height: 30px;
        width: 30px;
        border-radius: 50%;
      }

      .pubkey-field {
        color: black;
        background: #f4f0fa;
        border-radius: 4px;
        overflow-x: auto;
        padding: 10px;
        white-space: nowrap;
        cursor: pointer;
      }
    `;

    return [sharedStyles, localStyles];
  }
}
