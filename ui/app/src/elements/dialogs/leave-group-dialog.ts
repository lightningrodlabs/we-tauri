import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { contextProvided } from "@lit-labs/context";
import { EntryHashB64 } from "@holochain-open-dev/core-types";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { TaskSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash } from "@holochain/client";

export class LeaveGroupDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _allApplets = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchAllApplets(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @query("#leave-group-dialog")
  _leaveGroupDialog!: Dialog;


  open() {
    this._leaveGroupDialog.show();
  }



  async leaveGroup() {
    (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).show();
    try {
      await this._matrixStore.leaveWeGroup(this.weGroupId, true);
      console.log("group  left successfully.");
      (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();
      console.log("snackbars handled.");
      this.dispatchEvent(
        new CustomEvent("group-left", {
          composed: true,
          bubbles: true,
        })
      );
      console.log("dispatched event.");
    } catch (e) {
      (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      console.log("Error while leaving group:", e);
    };
  }



  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        id="error-snackbar"
        labelText="Leaving group failed! (See console for details)"
      >
      </mwc-snackbar>
    `;
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar
        id="success-snackbar"
        labelText="Group left."
      ></mwc-snackbar>
    `;
  }

  renderInstallingProgress() {
    return html`
      <mwc-snackbar id="leaving-progress" labelText="Leaving..." .timeoutMs=${-1}>
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <mwc-dialog id="leave-group-dialog" heading="Leave Group">

        Are you sure you want to leave this group?<br><br>
        This will:
        <ul>
          <li>delete all applets that you have installed for this group together with all the data you have stored in these applets</li>
          <li>delete your profile for this group</li>
        </ul>


        <mwc-button
          raised
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
        ></mwc-button>
        <mwc-button
          raised
          style="--mdc-theme-primary: #cf0000;"
          id="primary-action-button"
          slot="primaryAction"
          dialogAction="close"
          label="delete"
          @click=${this.leaveGroup}
        ></mwc-button>
      </mwc-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-textfield": TextField,
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-snackbar": Snackbar,
      "mwc-circular-progress": CircularProgress,
      "mwc-textarea": TextArea,
    };
  }

  static get styles() {
    return sharedStyles;
  }
}
