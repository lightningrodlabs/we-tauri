import { ListAgentsByStatus, PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { MyProfile, ProfilePrompt, ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { decodeHashFromBase64, DnaHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, Card, CircularProgress, Fab, Icon, IconButton, IconButtonToggle, LinearProgress, Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { InstallableApplets } from "../components/installable-applets";
import { InvitationsBlock } from "../components/invitations-block";
import { InstallFromFsDialog } from "../dialogs/install-from-file-system";
import { AppletNotInstalled } from "./applet-not-installed";
import { WeGroupSettings } from "./we-group-settings";
import { SensemakerDashboard } from "./sensemaker-dashboard";
import { get } from "svelte/store";
import { Assessment } from "@neighbourhoods/sensemaker-lite-types";



export class WeGroupHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _info = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchWeGroupInfo(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );


  private _allMembers = new StoreSubscriber(
    this,
    () => this._profilesStore.allProfiles
  );


  @state()
  private _showLibrary: boolean = false;

  @state()
  private _showInstallScreen: boolean = false;

  @state()
  private _installAppletId: EntryHash | undefined;

  @state()
  private _installMode: "reinstall" | "join" = "join";

  @query("#install-from-fs-dialog")
  _installFromFsDialog!: InstallFromFsDialog;

  renderJoinErrorSnackbar() {
    return html`
      <mwc-snackbar
        id="join-error-snackbar"
        labelText="Joining failed! (See console for details)"
      >
      </mwc-snackbar>
    `;
  }

  renderInstallingProgress() {
    return html`
      <mwc-snackbar
        id="installing-progress"
        timeoutMs="-1"
        labelText="Installing..."
      >
      </mwc-snackbar>
    `;
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar
        id="installation-success"
        labelText="Installation successful"
      ></mwc-snackbar>
    `;
  }


  async joinApplet(appletInstanceId: EntryHash) {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    await this._matrixStore
      .joinApplet(this.weGroupId, appletInstanceId)
      .then(() => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (
          this.shadowRoot?.getElementById("installation-success") as Snackbar
        ).show();
        this.requestUpdate(); // to show the newly installed applet in case user is still on same page
        this.dispatchEvent(
          new CustomEvent("applet-installed", {
            detail: { appletEntryHash: appletInstanceId, weGroupId: this.weGroupId },
            composed: true,
            bubbles: true,
        })
      );
      })
      .catch((e) => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (
          this.shadowRoot?.getElementById("join-error-snackbar") as Snackbar
        ).show();
        console.log("Joining error:", e);
      });
  }


  renderContent() {
    if (this._showInstallScreen) {
      return html`
          ${this._installMode == "reinstall"
            ? html`
              <applet-not-installed
                style="display: flex; flex: 1;"
                .appletInstanceId=${this._installAppletId}
                .mode=${"reinstall"}
                @cancel-reinstall=${() => { this._showInstallScreen = false; this._installAppletId = undefined; }}>
              </applet-not-installed>
              `
            : html`
              <applet-not-installed
                style="display: flex; flex: 1;"
                .appletInstanceId=${this._installAppletId}
                .mode=${"join"}
                @cancel-reinstall=${() => { this._showInstallScreen = false; this._installAppletId = undefined; }}>
              </applet-not-installed>
            `
          }
      `
    }
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y" style="display: flex; height: 100%;">
            ${this._showLibrary
              ? html`
                <div class="column" style="flex: 1; margin: 24px; position: relative">
                  <sl-tooltip placement="right" content="Close Settings" hoist>
                    <mwc-icon-button class="back-home" @click=${() => this._showLibrary = false} icon="arrow_back"></mwc-icon-button>
                  </sl-tooltip>

                  <div style="display: flex; justify-content: flex-end; margin-top: 5px;">
                      <mwc-button raised style="width: 250px;" label="Install Applet from Filesystem" @click=${() => this._installFromFsDialog.open()}></mwc-button>
                  </div>

                  <div class="row center-content" style="margin-top: 10px;"><h2>Applet Library</h2></div>

                  <hr style="width: 100%" />
                  <installable-applets></installable-applets>

                  <install-from-fs-dialog id="install-from-fs-dialog"></install-from-fs-dialog>

                </div>
                `
              : html`
                  <div class="column" style="flex: 1; margin: 24px; position: relative">
                    <div class="row" style="margin-top: 20px">
                      <div class="column center-content" style="width: 50%;">
                        ${this._info.value
                          ? html`<img
                              class="logo-large"
                              style=" width: 200px; height: 200px;"
                              src=${this._info.value.logoSrc}
                            />`
                          : html``}
                        <div
                          style="font-size: 1.4em; margin-top: 30px; font-weight: bold;"
                        >
                          ${this._info.value?.name}
                        </div>
                      </div>

                      <div class="column center-content" style="margin-left: 30px; width: 50%;">
                        <invitations-block style="margin: 10px;"></invitations-block>

                        <mwc-card style="width: 440px; margin: 10px;">
                          <div style="margin: 20px;">
                            <div class="row">
                              <span class="title"
                                >Initiate New Applet Instance</span
                              >
                            </div>
                            <div style="margin-top: 10px;">
                              Initiate a new Applet instance from scratch that other neighbourhood members will be able to join.
                            </div>
                            <div class="row center-content" style="margin-top: 20px;">
                              <mwc-button raised style="width: 250px;" label="Applet Library" @click=${() => this._showLibrary = true}></mwc-button>
                            </div>
                          </div>
                        </mwc-card>


                      </div>
                    </div>

                    <sensemaker-dashboard></sensemaker-dashboard>
                    <we-group-settings
                      @join-applet=${(e: CustomEvent) => {
                        this._installAppletId = e.detail;
                        this._installMode = "join";
                        this._showInstallScreen = true;
                        }
                      }
                      @reinstall-applet=${(e: CustomEvent) => {
                        this._installAppletId = e.detail;
                        this._installMode = "reinstall";
                        this._showInstallScreen = true;
                        }
                      }
                    ></we-group-settings>

                  </div>
                `
            }
          </div>
        </div>
      </div>
    `;
  }

  renderMembers() {
    switch (this._allMembers.value.status) {
      case "pending":
        return html`
          <mwc-circular-progress
            indeterminate
          ></mwc-circular-progress>
        `;
      case "error":
        return html`Error: ${this._allMembers.value.error.data.data}`;
      case "complete":
        return html`<list-agents-by-status
          .agents=${Array.from(this._allMembers.value.value.keys()).filter(
            (agentPubKey) =>
              JSON.stringify(agentPubKey) !==
              JSON.stringify(this._matrixStore.myAgentPubKey)
          )}
        ></list-agents-by-status>`;
    }
  }


  render() {
    return this._info.render({
      pending: () => html`
        <div class="center-content" style="flex: 1; width: 100%; height: 100%;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
        `,
      complete: (info) => html`
          <profile-prompt style="flex: 1; display: flex;">
            <div slot="hero">
              <div>
                <div class="column center-content">
                  <img
                    class="we-logo"
                    style="margin-top: 30px;"
                    src=${info.logoSrc!}
                  />
                  <div
                    style="font-weight: bold; margin-top: 20px; font-size: 1.2em;"
                  >
                    ${info.name}
                  </div>
                  <div
                    style="margin-bottom: 45px; margin-top: 55px; font-size: 1.3em;"
                  >
                    How would you like to appear in this neighbourhood?
                  </div>
                </div>
              </div>
            </div>

            ${this.renderJoinErrorSnackbar()} ${this.renderInstallingProgress()}
            ${this.renderSuccessSnackbar()}

            <div class="row" style="flex: 1">

              ${this.renderContent()}
              <div class="column members-sidebar">
                <my-profile style="margin-bottom: 20px;"></my-profile>
                ${this.renderMembers()}
              </div>
            </div>

          </profile-prompt>
        `
    })
  }

  static get scopedElements() {
    return {
      "profile-prompt": ProfilePrompt,
      "my-profile": MyProfile,
      "installable-applets": InstallableApplets,
      "mwc-button": Button,
      "mwc-fab": Fab,
      "mwc-card": Card,
      "mwc-icon-button": IconButton,
      "mwc-circular-progress": CircularProgress,
      "sl-tooltip": SlTooltip,
      "invitations-block": InvitationsBlock,
      "mwc-icon-button-toggle": IconButtonToggle,
      "mwc-linear-progress": LinearProgress,
      "list-agents-by-status": ListAgentsByStatus,
      "mwc-snackbar": Snackbar,
      "install-from-fs-dialog": InstallFromFsDialog,
      "we-group-settings": WeGroupSettings,
      "applet-not-installed": AppletNotInstalled,
      "sensemaker-dashboard": SensemakerDashboard,
    };
  }


  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }

      .settings-icon {
        cursor: pointer;
        --mdc-icon-size: 32px;
        position: absolute;
        top: 0;
        right: 0;
      }

      .we-name {
        text-align: center;
        border-bottom: solid 1px gray;
        margin-bottom: 5px;
        width: 100%;
      }

      .we-logo {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        object-fit: cover;
      }

      .members-sidebar {
        width: 224px;
        background-color: #ecebff;
        padding: 24px;
      }

      .members-title {
        font-size: 1em;
        font-weight: 600;
        text-align: right;
        margin: 25px 25px 20px 25px;
        color: #1b245d;
      }

      .home-button {
        --mdc-theme-secondary: #303F9F;
        --mdc-fab-focus-outline-color: white;
        --mdc-fab-focus-outline-width: 4px;
        margin-bottom: 4px;
      }

      .logo-large {
        border-radius: 50%;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .logo-placeholder-large {
        text-align: center;
        font-size: 70px;
        border-radius: 50%;
        border: 4px solid black;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .applet-card {
        width: 300px;
        height: 180px;
        margin: 10px;
      }

      .highlighted {
        outline: #303f9f 4px solid;
      }

      .installable-applets-container {
        padding: 10px;
        width: 100%;
      }

      .back-home {
        cursor: pointer;
        --mdc-icon-size: 32px;
        position: absolute;
        top: 0;
        left: 0;
      }
    `;

    return [sharedStyles, localStyles];
  }

}