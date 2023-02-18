import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, CircularProgress, Icon, IconButton, LinearProgress, Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { AppletInstanceStatusList } from "../components/applet-instance-status-list";
import { UninstalledAppletInstanceList } from "../components/uninstalled-applet-instance-list";
import { InvitationsBlock } from "../components/invitations-block";
import { LeaveGroupDialog } from "../dialogs/leave-group-dialog";
import { AppletNotInstalled } from "./applet-not-installed";
import { JoinableAppletInstanceList } from "../components/joinable-applet-instance-list";



export class WeGroupSettings extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _info = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchWeGroupInfo(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @state()
  private _showAppletDescription: boolean = false;

  @query("#leave-group-dialog")
  _leaveGroupDialog!: LeaveGroupDialog;


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

  toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }

  async leaveGroup(appletInstanceId: EntryHash) {
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

    return html`
      <div class="column" style="flex: 1; margin: 24px; position: relative;">
        <leave-group-dialog id="leave-group-dialog"></leave-group-dialog>

        <div class="row title" style="margin-top: 30px;">
          <span style="align-self: start" title="applet instances initiated by other group members">Applets to Join</span>
        </div>
        <hr style="width: 100%" />
        <joinable-applet-instance-list></joinable-applet-instance-list>

        <div class="row title" style="margin-top: 30px;">
          <span style="align-self: start">Installed Applets</span>
        </div>
        <hr style="width: 100%" />

        <applet-instance-status-list></applet-instance-status-list>

        <div class="row title" style="margin-top: 30px;">
          <span style="align-self: start">Uninstalled Applets</span>
        </div>
        <hr style="width: 100%" />

        <uninstalled-applet-instance-list></uninstalled-applet-instance-list>


        <div class="row title" style="margin-top: 30px;">
          <span style="align-self: start; margin-top: 20px;">Danger Zone</span>
        </div>
        <hr style="width: 100%" />

        <div style="display: flex; align-items: center; margin-top: 20px; margin-bottom: 50px;">
          <div>Leave group and delete all applets: </div>
          <span style="flex: 1"></span>
          <mwc-button
            raised
            style="--mdc-theme-primary: #cf0000"
            label="Leave Group"
            @click=${() => this._leaveGroupDialog.open()}
          ></mwc-button>
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
          ${this.renderContent()}
        `
    })
  }

  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-icon-button": IconButton,
      "mwc-icon": Icon,
      "mwc-circular-progress": CircularProgress,
      "sl-tooltip": SlTooltip,
      "invitations-block": InvitationsBlock,
      "mwc-linear-progress": LinearProgress,
      "mwc-snackbar": Snackbar,
      "leave-group-dialog": LeaveGroupDialog,
      "applet-instance-status-list": AppletInstanceStatusList,
      "uninstalled-applet-instance-list": UninstalledAppletInstanceList,
      "joinable-applet-instance-list": JoinableAppletInstanceList,
    };
  }


  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }
    `;

    return [sharedStyles, localStyles];
  }

}