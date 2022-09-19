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
  Card,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { AppletInstanceInfo, MatrixStore } from "../../matrix-store";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { get } from "svelte/store";
import { classMap } from "lit/directives/class-map.js";

export class FederateAppletDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @state()
  _selectedGroup: DnaHash | undefined;


  @query("#federate-dialog")
  _federateDialog!: Dialog;


  _allGroups = new StoreSubscriber(
    this,
    () => this._matrixStore.getAllWeGroupInfos()
  );




  open(appletInfo: AppletInstanceInfo) {
    this._federateDialog.show();
  }

  get federateDisabled() {
    return !this._federateDialog;
  }


  async federateApplet() {
    console.log("FEDARATING FOR GROUP WITH HASH: ", this._selectedGroup);
    // (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    // try {
    //   const appletEntryHash = await this._matrixStore.createApplet(
    //     this.weGroupId,
    //     this._appletInfo,
    //     this._installedAppIdField.value
    //   );
    //   (
    //     this.shadowRoot?.getElementById("installing-progress") as Snackbar
    //   ).close();
    //   (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();

    //   this.dispatchEvent(
    //     new CustomEvent("applet-installed", {
    //       detail: { appletEntryHash },
    //       composed: true,
    //       bubbles: true,
    //     })
    //   );
    // } catch (e) {
    //   (
    //     this.shadowRoot?.getElementById("installing-progress") as Snackbar
    //   ).close();
    //   (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
    //   console.log("Installation error:", e);
    // }
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar
        id="error-snackbar"
        labelText="Installation failed! (See console for details)"
      >
      </mwc-snackbar>
    `;
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar
        id="success-snackbar"
        labelText="Installation successful"
      ></mwc-snackbar>
    `;
  }

  renderInstallingProgress() {
    return html`
      <mwc-snackbar id="installing-progress" labelText="Installing..." .timeoutMs=${-1}>
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <mwc-dialog id="federate-dialog" heading="Federate Applet">
        <div class="column" style="padding: 16px; margin-bottom: 24px;">
          Choose a group to share this applet with.<br><br>
          <strong>Note:</strong> Once access to this applet is granted to another group, it cannot be revoked.
          ${this._allGroups.value
            .filter((weGroupInfo) => JSON.stringify(weGroupInfo.dna_hash) !== JSON.stringify(this.weGroupId))
            .map((weGroupInfo) => html`
            <mwc-card
              style="margin: 5px; cursor: pointer;"
              class="group-card ${classMap({
                  selected: JSON.stringify(this._selectedGroup) === JSON.stringify(weGroupInfo.dna_hash),
                  highlighted: JSON.stringify(this._selectedGroup) !== JSON.stringify(weGroupInfo.dna_hash)
                })
              }"
              @click=${() => {this._selectedGroup = weGroupInfo.dna_hash}}
            >
              <div
                class="row"
                style="align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em"
              >
                <img
                  style="margin-right: 10px;"
                  class="group-image"
                  src=${weGroupInfo.info.logoSrc}
                />
                <strong>${weGroupInfo.info.name}</strong>
              </div>
            </mwc-card>
            `
          )}
        </div>

        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
        ></mwc-button>
        <mwc-button
          id="primary-action-button"
          .disabled=${this.federateDisabled}
          slot="primaryAction"
          dialogAction="close"
          label="federate"
          @click=${() => this.federateApplet()}
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
      "mwc-card": Card,
    };
  }

  static get styles() {
    return [sharedStyles, css`

      .highlighted:hover {
        outline: 3px solid #6300ee73;
        border-radius: 4px;
      }

      .selected {
        outline: 3px solid #6200ee;
        border-radius: 4px;
      }

      .group-image {
        height: 50px;
        width: 50px;
        border-radius: 50%;
      }

      `
    ];
  }
}
