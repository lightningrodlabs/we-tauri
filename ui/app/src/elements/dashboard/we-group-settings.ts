import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, CircularProgress, IconButton, LinearProgress, Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { InvitationsBlock } from "../components/invitations-block";
import { LeaveGroupDialog } from "../dialogs/leave-group-dialog";



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

  _allMembers = new TaskSubscriber(
    this,
    () => this._profilesStore.fetchAllProfiles(),
    () => [this._profilesStore]
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


  backHome() {
    this.dispatchEvent(
      new CustomEvent("back-home", {
        composed: true,
        bubbles: true,
      })
    )
  }


  renderContent() {
    return html`
      <div class="column" style="flex: 1; margin: 24px;">
        <mwc-icon-button class="back-home" @click=${this.backHome} icon="close"></mwc-icon-button>
        
        <div><h2>Group Settings</h2></div>
         
        <div style="display: flex; justify-content: center; margin-top: 90px; margin-bottom: 50px;">
          <mwc-button
            raised
            style="width: 280px; --mdc-theme-primary: #cf0000"
            label="Leave Group and Delete All Applets"
            @click=${() => this._leaveGroupDialog.open()}
          ></mwc-button>
        </div>

        <leave-group-dialog id="leave-group-dialog"></leave-group-dialog>


        <div class="row title">
          <span style="align-self: start">Applet Instances</span>
        </div>

        <hr style="width: 100%" />

        <!-- <applet-instances></applet-instances> -->
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
      "mwc-circular-progress": CircularProgress,
      "sl-tooltip": SlTooltip,
      "invitations-block": InvitationsBlock,
      "mwc-linear-progress": LinearProgress,
      "mwc-snackbar": Snackbar,
      "leave-group-dialog": LeaveGroupDialog,
    };
  }


  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }

      .back-home {
        cursor: pointer;
        --mdc-icon-size: 32px;
        position: absolute;
        top: 20px;
        right: 20px;
      }

    `;

    return [sharedStyles, localStyles];
  }

}