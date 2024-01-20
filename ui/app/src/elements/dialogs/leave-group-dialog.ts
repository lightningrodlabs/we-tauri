import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { consume } from "@lit/context";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { StoreSubscriber } from "lit-svelte-stores";
import { get, readable } from 'svelte/store';
import { MatrixStore } from "../../matrix-store";
import { provideAllApplets } from "../../matrix-helpers";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash } from "@holochain/client";

export class LeaveGroupDialog extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _allApplets = new StoreSubscriber(
    this,
    () => provideAllApplets(this._matrixStore, this.weGroupId),
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
      const weGroupName = this._matrixStore.getWeGroupInfo(this.weGroupId)?.name;
      await this._matrixStore.leaveWeGroup(this.weGroupId, true);
      console.log("neighbourhood left successfully.");
      (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();
      console.log("snackbars handled.");
      this.dispatchEvent(
        new CustomEvent("group-left", {
          detail: { weGroupName },
          composed: true,
          bubbles: true,
        })
      );
      console.log("dispatched event.");
    } catch (e) {
      (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      console.log("Error while leaving neighbourhood:", e);
    };
  }



  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        id="error-snackbar"
        labelText="Leaving neighbourhood failed! (See console for details)"
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

      <mwc-dialog id="leave-group-dialog" heading="Leave Neighbourhood">

        Are you sure you want to leave this neighbourhood?<br><br>
        This will:
        <ul>
          <li>delete all applets that you have installed for this neighbourhood together with all the data you have stored in these applets</li>
          <li>delete your profile for this neighbourhood</li>
        </ul>

        Other members of the neighbourhood will still have access to their instances of the neighbourhood's applets.


        <mwc-button
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

  static get elementDefinitions() {
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
