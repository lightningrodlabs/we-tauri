import { serializeHash } from "@holochain-open-dev/utils";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
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
import { HoloHashMap, HoloIdenticon } from "@holochain-open-dev/utils";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { ActionHash, DnaHash, InstalledAppInfo } from "@holochain/client";
import { getStatus } from "../../utils";

export class AppletInstanceStatusList extends ScopedElementsMixin(LitElement) {
    
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _installedApplets = new StoreSubscriber(
    this,
    () => this.matrixStore.getAppletInstanceInfosForGroup(this.weGroupId)
  );

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  async joinGroup(
    invitationActionHash: ActionHash,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.cloneDnaRecipe.properties) as any;
    await this.matrixStore
      .joinWeGroup(
        invitationActionHash,
        properties.name,
        properties.logoSrc,
        properties.timestamp
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


  async disableApp(appInfo: InstalledAppInfo) {
    this.matrixStore.disableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-disabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  async enableApp(appInfo: InstalledAppInfo) {
    this.matrixStore.enableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-enabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
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
    const appletInstanceInfos = this._installedApplets.value;
    if (appletInstanceInfos!.length == 0 || !appletInstanceInfos) {
      // TODO! make sure that this refresh button actually does anything.
      return html`
        <div style="margin-top: 10px;">There are no applet instances installed in this group.</div>
        <div class="row center-content">
          <mwc-button
            style="margin-top: 20px; text-align: center;"
            @click=${() => this.requestUpdate()}
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
            const appStatus = getStatus(appletInfo.installedAppInfo);
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
                      <span style="color: gray; margin-right: 15px;">${appStatus}</span>
                      
                      ${appStatus === "RUNNING"
                        ? html`
                          <mwc-button
                            class="disable-button"
                            raised
                            label="DISABLE"
                            icon="stop"
                            @click=${async () => await this.disableApp(appletInfo.installedAppInfo)}
                          ></mwc-button>
                          `
                        : html`
                          <mwc-button
                            class="start-button"
                            raised
                            label="START"
                            icon="play_arrow"
                            @click=${async () => await this.enableApp(appletInfo.installedAppInfo)}
                          ></mwc-button>
                          `
                      }
                      <mwc-button
                        class="delete-button"
                        raised
                        label="DELETE"
                        icon="delete"
                        @click=${() => console.log("clicked DELETE button.")}
                      >
                      </mwc-button>
                    </div>
                  </div>
                </mwc-card>
              </div>
            `;
          })}
        <div class="row center-content">
          <mwc-button
            style="margin-top: 20px; text-align: center;"
            @click=${() => this.requestUpdate()}
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
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
        font-family: Arial, sans-serif;
      }

      .default-font {
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
      }

      .title {
        align-items: center;
        font-family: Roboto, "Open Sans", "Helvetica Neue", sans-serif;
        font-size: 1.2em;
        text-align: center;
      }

      .start-button {
        --mdc-theme-primary: #17c200;
      }

      .disable-button {
        --mdc-theme-primary: #f9a70a;;
      }

      .delete-button {
        --mdc-theme-primary: #cf0000;
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
