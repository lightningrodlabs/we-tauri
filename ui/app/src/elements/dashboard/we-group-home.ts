import { ListAgentsByStatus, PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { MyProfile, ProfilePrompt, ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, Card, CircularProgress, Fab, Icon, IconButton, IconButtonToggle, LinearProgress, Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { InstallableApplets } from "../components/installable-applets";
import { InvitationsBlock } from "../components/invitations-block";
import { InstallFromFsDialog } from "../dialogs/install-from-file-system";
import { WeGroupSettings } from "./we-group-settings";



export class WeGroupHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _info = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchWeGroupInfo(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  _allMembers = new TaskSubscriber(
    this,
    () => this._profilesStore.fetchAllProfiles(),
    () => [this._profilesStore]
  );


  @state()
  private _showSettings: boolean = false;

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
            detail: { appletEntryHash: appletInstanceId },
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
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            ${this._showSettings
              ? html`<we-group-settings @back-home=${() => {this._showSettings = false}}></we-group-settings>`
              : html`
                  <div class="column" style="flex: 1; margin: 24px; position: relative">
                    <mwc-icon-button class="settings-icon" icon="settings" @click=${() => {this._showSettings = true}}></mwc-icon-button>
                    <div class="row center-content" style="margin-top: 56px">
                      <div class="column center-content">
                        ${this._info.value
                          ? html`<img
                              class="logo-large"
                              style=" width: 150px; height: 150px;"
                              src=${this._info.value.logoSrc}
                            />`
                          : html``}
                        <div
                          style="font-size: 1.4em; margin-top: 30px; font-weight: bold;"
                        >
                          ${this._info.value?.name}
                        </div>
                      </div>

                      <invitations-block
                        style="margin-left: 50px;"
                      ></invitations-block>
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 90px;">
                      <mwc-button raised style="width: 250px;" label="Install Applet from Filesystem" @click=${() => this._installFromFsDialog.open()}></mwc-button>
                    </div>

                    <install-from-fs-dialog id="install-from-fs-dialog"></install-from-fs-dialog>


                    <div class="row title" style="margin-top: -20px;">
                      <span style="align-self: start">Applets Library</span>
                    </div>

                    <hr style="width: 100%" />

                    <installable-applets></installable-applets>
                  </div>
                `
            }
          </div>
        </div>
      </div>
    `;
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
                    How would you like to appear in this group?
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
                  ${this._allMembers.render({
                    complete: (profiles) =>
                      html`<list-agents-by-status
                        .agents=${profiles.keys().filter(
                          (agentPubKey) =>
                            JSON.stringify(agentPubKey) !==
                            JSON.stringify(this._matrixStore.myAgentPubKey)
                        )}
                      ></list-agents-by-status>`,
                    pending: () => html`
                      <mwc-circular-progress
                        indeterminate
                      ></mwc-circular-progress>
                    `,
                  })}
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
    `;

    return [sharedStyles, localStyles];
  }

}