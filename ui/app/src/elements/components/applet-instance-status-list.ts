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
  IconButton,
} from "@scoped-elements/material-web";

import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { query, state } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/elements";
import { CreateWeGroupDialog } from "../dialogs/create-we-group-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";
import { ActionHash, DnaHash, AppInfo } from "@holochain/client";
import { getStatus } from "../../utils";
import { UninstallAppletDialog } from "../dialogs/uninstall-applet-dialog";
import { FederateAppletDialog } from "../dialogs/federate-applet-dialog";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { NHSensemakerSettings } from "../dashboard/nh-sensemaker-settings";
import { NHDialog } from "@neighbourhoods/design-system-components";

export class AppletInstanceStatusList extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;
  
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


  @query("#uninstall-applet-dialog")
  _uninstallAppletDialog!: UninstallAppletDialog;

  @query("#federate-applet-dialog")
  _federateAppletDialog!: FederateAppletDialog;
  
  @state()
  private _widgetConfigDialogActivated: boolean = false;

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


  async disableApp(appInfo: AppInfo) {
    this.matrixStore.disableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-disabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  async enableApp(appInfo: AppInfo) {
    this.matrixStore.enableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-enabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  async uninstallApp(appInfo: AppInfo) {
    console.log("Uninstalling applet: ", appInfo);
    this.matrixStore.uninstallApp(appInfo)
      .then(async () => {
        (this.shadowRoot?.getElementById("app-uninstalled-snackbar") as Snackbar).show();
        await this.matrixStore.fetchMatrix();
        this.requestUpdate();
        // force page refresh to clear remaining intervals, timeouts etc.
        window.location.reload();
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
        <div style="margin-top: 10px;">You have no applet instances installed in this neighbourhood.</div>
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
          .sort((info_a, info_b) => { // show disabled applets on top, then sort alphabetically
            if (getStatus(info_a.appInfo) !== getStatus(info_b.appInfo)) {
              return getStatus(info_a.appInfo).localeCompare(getStatus(info_b.appInfo));
            } else {
              return info_a.applet.customName.localeCompare(info_b.applet.customName)
            }
           })
          .map((appletInfo) => {
            const appStatus = getStatus(appletInfo.appInfo);
            return html`
            ${this._widgetConfigDialogActivated ? html`
              <nh-dialog
                id="applet-widget-config"
                size="large"
                dialogType="widget-config"
                handleOk=${() => {console.log("dialog closed"); this._widgetConfigDialogActivated = false}}
                isOpen=${true}
                title="Configure Applet Widgets"
                .primaryButtonDisabled=${true}
              >
                <div slot="inner-content">
                  <nh-sensemaker-settings
                    .sensemakerStore=${this._sensemakerStore}
                  ></nh-sensemaker-settings>
                </div>
              </nh-dialog>` : html``}
              <div class="column" style="align-items: right; width: 100%;">
                <mwc-card style="margin: 5px;">
                  <div
                    class="row"
                    style="background: #645d69; color: white; align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em"
                  >
                    <img
                        style="margin-right: 10px;"
                        class="applet-image"
                        src=${appletInfo.applet.logoSrc!}
                      />
                    <strong>${appletInfo.applet.customName}</strong>
                    <div class="row" style="margin-left: auto; align-items: center;">
                      <span style="color: gray; margin-right: 25px;">${appStatus}</span>

                      <sl-tooltip placement="top" content="configure widgets" hoist>
                        <mwc-button
                          icon="share"
                          style="margin-right: 10px;"
                          @click=${() => {console.log("federate clicked"); this._widgetConfigDialogActivated = true}}
                          label="configure widgets"
                        >
                        </mwc-button>
                      </sl-tooltip>

                      ${appStatus === "RUNNING"
                        ? html`
                          <mwc-button
                            class="disable-button"
                            raised
                            label="DISABLE"
                            icon="stop"
                            @click=${async () => await this.disableApp(appletInfo.appInfo)}
                          ></mwc-button>
                          `
                        : html`
                          <mwc-button
                            class="start-button"
                            raised
                            label="START"
                            icon="play_arrow"
                            @click=${async () => await this.enableApp(appletInfo.appInfo)}
                          ></mwc-button>
                          `
                      }
                      <mwc-button
                        class="delete-button"
                        raised
                        label="UNINSTALL"
                        icon="delete"
                        @click=${() => {
                          this._uninstallAppletDialog.installedAppInfo = appletInfo.appInfo;
                          this._uninstallAppletDialog.open();
                          }
                        }
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


      <uninstall-applet-dialog
        id="uninstall-applet-dialog"
        @confirm-uninstall=${(e) => this.uninstallApp(e.detail.installedAppInfo)}
      ></uninstall-applet-dialog>

      <federate-applet-dialog
        id="federate-applet-dialog"
      ></federate-applet-dialog>


      ${this.renderAppStates()}
    `;
  }

  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-icon-button": IconButton,
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
      "federate-applet-dialog": FederateAppletDialog,
      "nh-sensemaker-settings": NHSensemakerSettings,
      'nh-dialog': NHDialog,
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
        width: 130px;
        --mdc-theme-primary: #17c200;
      }

      .disable-button {
        width: 130px;
        --mdc-theme-primary: #f9a70a;
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
