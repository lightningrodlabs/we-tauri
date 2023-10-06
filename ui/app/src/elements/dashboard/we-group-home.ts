import {  PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { decodeHashFromBase64, DnaHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
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
import { NHSensemakerSettings } from "./nh-sensemaker-settings";
import { b64images } from "@neighbourhoods/design-system-styles";
import { NHButton, NHCard, NHDialog, NHPageHeaderCard } from "@neighbourhoods/design-system-components";
import { NHCreateProfile } from "../components/profile/nh-create-profile";
import { get } from "@holochain-open-dev/stores";

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
      <slot name="applet-config"></slot>
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y" style="display: flex; height: 100%; padding: calc(1px * var(--nh-spacing-xl)); box-sizing: border-box">
            ${this._showLibrary
              ? html`
                <div class="column" style="display:grid;grid-template-rows: auto 1fr; width: 100%;">
                  <nh-page-header-card
                  .heading=${"Applet Library"}
                  >
                    <img
                      src="data:image/svg+xml;base64,${b64images.icons.backCaret}"
                      slot="secondary-action"
                      @click=${() => this._showLibrary = false}
                    />
                    <nh-button
                      .label=${"Upload Applet File"}
                      .variant=${"primary"}
                      .size=${"md"}
                      @click=${() => this._installFromFsDialog.open()}
                      slot="primary-action"
                    ></nh-button>
                  </nh-page-header-card>

                  <installable-applets></installable-applets>

                  <install-from-fs-dialog id="install-from-fs-dialog"></install-from-fs-dialog>

                </div>
                `
              : html`
                  <div class="column" style="flex: 1; margin: 24px; position: relative">
                    <div class="row" style="margin-top: 20px">
                      <div class="column center-content" style="width: 50%">
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

                      <div class="column center-content" style="margin-left: calc(1px * var(--nh-spacing-lg)); width: 50%; display:flex; flex-direction: column;">
                        <invitations-block style="margin-bottom: calc(1px * var(--nh-spacing-lg)); display:flex;"></invitations-block>

                        <nh-card .theme=${"dark"} .heading=${"Initiate New Applet Instance"} .textSize=${"md"}>
                          <div style="margin: 20px;">
                            <div style="margin-top: 10px;">
                              Initiate a new Applet instance from scratch that other neighbourhood members will be able to join.
                            </div>
                            <div class="row center-content" style="margin-top: 20px;">
                              <mwc-button raised style="width: 250px;" label="Applet Library" @click=${() => this._showLibrary = true}></mwc-button>
                            </div>
                          </div>
                        </nh-card>
                      </div>
                    </div>

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

  public appletAdd() {
    this._showLibrary = true
  }

  render() {
    return this._info.render({
      pending: () => html`
        <div class="center-content" style="flex: 1; width: 100%; height: 100%;">
          <mwc-circular-progress indeterminate></mwc-circular-progress><slot></slot>
        </div>
        `,
        complete: (info) => {
          const nhProfilesStore = get(this._matrixStore.profilesStore(this.weGroupId as DnaHash)) as ProfilesStore;
          return typeof (get(nhProfilesStore.myProfile) as any)?.value !== 'undefined'
          ? this.renderContent()
          : html`<div
              class="column"
              style="align-items: center; justify-content: start; flex: 1; padding-bottom: 10px;"
            >
              <div class="column" style="align-items: center;">
                <div slot="hero" style="color: var(--nh-theme-fg-default)">
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
                      style="margin: calc(1px * var(--nh-spacing-md)); margin-top: calc(1px * var(--nh-spacing-sm)); font-size: calc(1px * var(--nh-font-size-lg))"
                    >
                      How would you like to appear in this neighbourhood?
                    </div>
                  </div>
                </div>
                <nh-create-profile .profilesStore=${nhProfilesStore}></nh-create-profile>
              </div>
            </div>
        `}
    })
  }

  static elementDefinitions = {
      "nh-create-profile": NHCreateProfile,
      "installable-applets": InstallableApplets,
      "mwc-button": Button,
      "mwc-fab": Fab,
      "mwc-card": Card,
      "nh-card": NHCard,
      "mwc-icon-button": IconButton,
      "mwc-circular-progress": CircularProgress,
      "sl-tooltip": SlTooltip,
      "invitations-block": InvitationsBlock,
      "mwc-icon-button-toggle": IconButtonToggle,
      "mwc-linear-progress": LinearProgress,
      // "list-agents-by-status": ListAgentsByStatus,
      'nh-page-header-card': NHPageHeaderCard,
      'nh-button': NHButton,
      "mwc-snackbar": Snackbar,
      "install-from-fs-dialog": InstallFromFsDialog,
      "we-group-settings": WeGroupSettings,
      "applet-not-installed": AppletNotInstalled,
      "nh-sensemaker-settings": NHSensemakerSettings,
      'nh-dialog': NHDialog,
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
        display:none;

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
