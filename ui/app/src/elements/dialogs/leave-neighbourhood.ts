import { CSSResult, html } from "lit";
import { property, query } from "lit/decorators.js";

import { NHAlert, NHButton, NHCard, NHComponentShoelace, NHDialog } from "@neighbourhoods/design-system-components";
import { Snackbar } from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { DnaHash } from "@holochain/client";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

export class LeaveNeighbourhood extends NHComponentShoelace {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @property()
  weGroupId!: DnaHash;
  
  @property()
  private _isOpen: boolean = false;

  @query('nh-dialog')
  private _dialog;

  open() {
    this._dialog.showDialog();
  }

  async leaveGroup() {
    // (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).show();
    const weGroupName = this._matrixStore.getWeGroupInfo(this.weGroupId)?.name;
    try {

      //TODO: fix NH leaving error
      await this._matrixStore.leaveWeGroup(this.weGroupId, true);
      console.log("neighbourhood left successfully.");
      // (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      // (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();
      console.log("snackbars handled.");
      console.log("dispatched event.");
    } catch (e) {
      // (this.shadowRoot?.getElementById("leaving-progress") as Snackbar).close();
      // (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      console.log("Error while leaving neighbourhood:", e);
    };

    this.dispatchEvent(
      new CustomEvent("group-left", {
        detail: { weGroupName },
        composed: true,
        bubbles: true,
      })
    );
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
                <nh-dialog
                  id="leave-neighbourhood"
                  .title=${"Leave Neighbourhood"}
                  .dialogType=${"leave-neighbourhood"}
                  .size=${"medium"}
                  .handleOk=${() => this.leaveGroup()}
                  .isOpen=${this._isOpen}
                  .primaryButtonDisabled=${false}
                >
                <div slot="inner-content">
                <nh-card .theme=${"dark"} .title="" .heading="" class="nested-card">
                <nh-alert
                  .title=${"Are you sure?"}
                  .closable=${false}
                  .type=${"danger"}
                >
                </nh-alert>
                    This will:
                    <ul>
                      <li>delete all applets that you have installed for this neighbourhood, together with all the data you have stored in these applets</li>
                      <li>delete your profile for this neighbourhood</li>
                    </ul>
                    <p slot="footer">
                      Other members of the neighbourhood will still have access to their instances of the neighbourhood's applets.
                    </p>
                  </nh-card>
                  </div>
                </nh-dialog>

      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-alert": NHAlert,
      "nh-dialog": NHDialog,
      "nh-button": NHButton,
      "mwc-snackbar": Snackbar,
      "nh-card": NHCard,
    };
  }

  static get styles() {
    return [
      super.styles as CSSResult,
    ]
  }
}
