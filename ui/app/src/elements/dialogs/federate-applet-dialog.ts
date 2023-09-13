import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { contextProvided } from "@lit-labs/context";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  Card,
  Icon,
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

  @state()
  _appletInfo: AppletInstanceInfo | undefined;


  @query("#federate-dialog")
  _federateDialog!: Dialog;


  _allGroups = new StoreSubscriber(
    this,
    () => this._matrixStore.getAllWeGroupInfos()
  );




  open(appletInfo: AppletInstanceInfo) {
    this._appletInfo = appletInfo;
    this._selectedGroup = undefined;
    this._federateDialog.show();
  }


  get federateDisabled() {
    return !this._federateDialog;
  }


  async federateApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    try {

      const appletEntryHash = await this._matrixStore.federateApplet(
        this.weGroupId,
        this._selectedGroup!,
        this._appletInfo!,
      );
      (
        this.shadowRoot?.getElementById("installing-progress") as Snackbar
      ).close();
      (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();

      this.dispatchEvent(
        new CustomEvent("applet-installed", {
          detail: { appletEntryHash, weGroupId: this._selectedGroup },
          composed: true,
          bubbles: true,
        })
      );
    } catch (e) {
      (
        this.shadowRoot?.getElementById("installing-progress") as Snackbar
      ).close();
      (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      console.log("Installation error:", e);
    }
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
      <mwc-snackbar id="installing-progress" labelText="Installing to other group..." .timeoutMs=${-1}>
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <mwc-dialog id="federate-dialog" heading="Federate Applet">
        <div class="column" style="padding: 16px; margin-bottom: 24px;">
          <div style="margin-bottom: 20px;">Choose a neighbourhood to share this applet with.</div>
          <b>Note:</b>
          <ul>
            <li>Federating applets only works for applets installed from the DevHub.</li>
            <li>Once access to this applet is granted to another neighbourhood, it cannot be revoked.</li>
          </ul>

          <span style="margin-bottom: 10px;"><b>Neighbourhoods:</b></span>

          ${this._appletInfo
            ? this._allGroups.value
              .filter((weGroupInfo) => JSON.stringify(weGroupInfo.dna_hash) !== JSON.stringify(this.weGroupId))
              .map((weGroupInfo) => {
                if(this._matrixStore.isInstalledInGroup(this._appletInfo!.appletId, weGroupInfo.dna_hash)) {
                  return html `
                    <mwc-card
                      style="margin: 5px; opacity: 30%;"
                      title="Applet already shared with this neighbourhood"
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
                        <span style="display: flex; flex: 1;"></span>
                        <mwc-icon style="margin-right: 10px;">share</mwc-icon>
                      </div>
                    </mwc-card>
                  `
                }
                return html`
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
              })
            : html`! Applet Info not defined !`
          }
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
      "mwc-icon": Icon,
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
