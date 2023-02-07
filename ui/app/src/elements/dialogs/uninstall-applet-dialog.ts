import { html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { AppInfo } from "@holochain/client";

export class UninstallAppletDialog extends ScopedElementsMixin(LitElement) {


  @query("#leave-group-dialog")
  _uninstallAppletDialog!: Dialog;

  @property({ type: Object })
  installedAppInfo: AppInfo | undefined;


  open() {
    this._uninstallAppletDialog.show();
  }

  confirm() {
    this.dispatchEvent(
      new CustomEvent("confirm-uninstall", {
        detail: { installedAppInfo: this.installedAppInfo},
        composed: true,
        bubbles: true,
      })
    );
  }

  render() {
    return html`
      <mwc-dialog id="leave-group-dialog" heading="Uninstall Applet">

        Are you sure you want to uninstall this applet?<br><br>
        <ul>
          <li>This will <strong>delete all data</strong> you have stored within this applet.</li>
          <li>In case this applet has been federated with other neighbourhoods, <b>it will also be removed from those neighbourhoods</b>.</li>
        </ul>

        Other members of the neighbourhood (or neighbourhoods this applet is federated with) will still be able to use their own instance of the applet.

        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
        ></mwc-button>
        <mwc-button
          raised
          id="primary-action-button"
          slot="primaryAction"
          dialogAction="close"
          label="uninstall"
          @click=${this.confirm}
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
