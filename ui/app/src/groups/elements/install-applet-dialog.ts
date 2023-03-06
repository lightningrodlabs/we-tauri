import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  MdOutlinedTextField,
  MdOutlinedButton,
  MdFilledButton,
  Snackbar,
  MdDialog,
  CircularProgress,
} from "@scoped-elements/material-web";
import { DnaHash, EntryHashB64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";

import { AppletMetadata } from "../../types.js";
import { consume } from "@lit-labs/context";
import { groupStoreContext } from "../context.js";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { weStyles } from "../../shared-styles.js";
import { GenericGroupStore } from "../group-store.js";

@localized()
export class InstallAppletDialog extends ScopedElementsMixin(LitElement) {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GenericGroupStore<any>;

  _installedApplets = new StoreSubscriber(
    this,
    () => this.groupStore.installedApplets
  );

  @query("#applet-dialog")
  _appletDialog!: any;

  @query("#custom-name-field")
  _customNameField!: any;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle: { hash: EntryHashB64; setupRenderers: any } | undefined =
    undefined;
  @state()
  _invalidUiBundle = false;

  @state()
  _duplicateName: boolean = false;

  @state()
  _appletInfo: AppletMetadata = {
    title: "",
    subtitle: "",
    description: "",
    devhubHappReleaseHash: new Uint8Array(0),
    devhubGuiReleaseHash: new Uint8Array(0),
    icon: undefined,
  };

  open(appletInfo: AppletMetadata) {
    this._appletInfo = appletInfo;
    this._customNameField.value = this._appletInfo.title;
    this._appletDialog.show();
  }

  get publishDisabled() {
    return (
      !this._customNameField ||
      this._customNameField.value === "" ||
      this._duplicateName
    );
  }

  // TODO: is this what we want to do?
  // checkValidity(_newValue, _nativeValidity) {
  //   if (this._allApplets.value) {
  //     const allNames = this._allApplets.value!.map(
  //       ([_appletEntryHash, applet]) => applet.customName
  //     );
  //     if (allNames.includes(this._installedAppIdField.value)) {
  //       this._duplicateName = true;
  //       return {
  //         valid: false,
  //       };
  //     }
  //   }

  //   this._duplicateName = false;
  //   return {
  //     valid: true,
  //   };
  // }

  async installApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    try {
      const appletEntryHash = await this.groupStore.installAppletOnGroup(
        this._appletInfo,
        this._customNameField.value
      );
      (
        this.shadowRoot?.getElementById("installing-progress") as Snackbar
      ).close();
      (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();

      this.dispatchEvent(
        new CustomEvent("applet-installed", {
          detail: { appletEntryHash, groupDnaHash: this.groupStore },
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
      <mwc-snackbar
        id="installing-progress"
        labelText="Installing..."
        .timeoutMs=${-1}
      >
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <md-dialog id="applet-dialog">
        <div slot="headline">${msg("Add Custom Name")}</div>
        <div class="column" style="padding: 16px; margin-bottom: 24px;">
          <md-outlined-text-field
            id="custom-name-field"
            .label=${msg("Custom Name")}
            required
            .value=${this._appletInfo.title}
            @input=${() => this.requestUpdate()}
          ></md-outlined-text-field>
          ${
            this._duplicateName
              ? html`<div
                  class="default-font"
                  style="color: #b10323; font-size: 12px; margin-left: 4px;"
                >
                  ${msg("Name already exists.")}
                </div>`
              : html``
          }
        </div>

        <md-outlined-button
          slot="footer"
          dialogAction="cancel"
          .label=${msg("Cancel")}
        ></md-outlined-button>
        <md-filled-button
          id="primary-action-button"
          .disabled=${this.publishDisabled}
          slot="footer"
          dialogAction="close"
          .label=${msg("INSTALL")}
          @click=${() => this.installApplet()}
        ></md-fillded-button>
      </md-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "md-outlined-text-field": MdOutlinedTextField,
      "md-outlined-button": MdOutlinedButton,
      "md-filled-button": MdFilledButton,
      "md-dialog": MdDialog,
      "mwc-snackbar": Snackbar,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static styles = weStyles;
}
