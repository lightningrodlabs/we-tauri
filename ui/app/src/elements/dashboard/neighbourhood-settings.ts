import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import {  CircularProgress, LinearProgress, Snackbar } from "@scoped-elements/material-web";
import { css, html } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { AppletInstanceStatusList } from "../components/applet-instance-status-list";
import { UninstalledAppletInstanceList } from "../components/uninstalled-applet-instance-list";
import { LeaveGroupDialog } from "../dialogs/leave-group-dialog";
import { JoinableAppletInstanceList } from "../components/joinable-applet-instance-list";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";

export class NeighbourhoodSettings extends NHComponent {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  _neighbourhoodInfo = new TaskSubscriber(
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
        <leave-group-dialog id="leave-group-dialog"></leave-group-dialog>

        <slot name="to-join">
          <h3>Applets to Join</h3>
          <hr />
          <joinable-applet-instance-list></joinable-applet-instance-list>
        </slot>

        <slot name="installed">
          <h3>Installed Applets</h3>
          <hr />
          <applet-instance-status-list></applet-instance-status-list>
        </slot>

        <slot name="uninstalled">
          <h3>Uninstalled Applets</h3>
          <hr />
          <uninstalled-applet-instance-list></uninstalled-applet-instance-list>
        </slot>

        <slot name="danger-zone">
          <h3>Danger Zone</h3>
          <hr />

          <div style="display: flex; align-items: center;">
            <p>Leave neighbourhood and delete all applets: </p>
            <span style="flex: 1"></span>
            <nh-button
              .size=${"auto"}
              .variant=${"danger"}
              label="Leave Neighbourhood"
              @click=${() => this._leaveGroupDialog.open()}
            ></nh-button>
          </div>
        </slot>
    `;
  }


  render() {
    return this._neighbourhoodInfo.render({
      pending: () => html`
        <div class="center-content" style="flex: 1; width: 100%; height: 100%;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
        `,
      complete: (_neighbourhoodInfo) => html`
          ${this.renderContent()}
        `
    })
  }

  static get elementDefinitions() {
    return {
      "nh-button": NHButton,
      "mwc-circular-progress": CircularProgress,
      "mwc-snackbar": Snackbar,
      "mwc-linear-progress": LinearProgress,
      "leave-group-dialog": LeaveGroupDialog,
      "joinable-applet-instance-list": JoinableAppletInstanceList,
      "applet-instance-status-list": AppletInstanceStatusList,
      "uninstalled-applet-instance-list": UninstalledAppletInstanceList,
    };
  }


  static get styles() {
    return css`
    :host {
      display: flex;
    }

    hr {
      border-color: var(--nh-theme-bg-detail); 
      border-style: double;
      width: 100%;
    }

    /** Typo **/
    p {
      color: var(--nh-theme-fg-muted);
    }
    h3 {
      font-weight: 400;
      color: var(--nh-theme-fg-default);
      margin: calc(1px * var(--nh-spacing-xs)) 0;
    }
  `;
  }

}
