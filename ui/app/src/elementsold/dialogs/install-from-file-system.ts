import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { contextProvided } from "@lit-labs/context";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from "@scoped-elements/material-web";

import md5 from "md5";

import { weStyles } from "../../sharedStyles";
import { AppletMetaData } from "../../types";
import { TaskSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash, EntryHash, EntryHashB64 } from "@holochain/client";
import { fakeMd5SeededEntryHash } from "../../utils";

export class InstallFromFsDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _allApplets = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchAllApplets(this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @query("#applet-dialog")
  _appletDialog!: Dialog;

  @query("#installed-app-id")
  _installedAppIdField!: TextField;

  @query("#description-field")
  _descriptionField!: TextArea;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle: { hash: EntryHashB64; setupRenderers: any } | undefined =
    undefined;
  @state()
  _invalidUiBundle = false;

  @state()
  _installableApplets;

  @state()
  _duplicateName: boolean = false;

  @state()
  _fileBytes: Uint8Array | undefined = undefined;

  @state()
  _fakeDevhubHappReleaseHash: EntryHash | undefined = undefined;

  open() {
    this._appletDialog.show();
  }

  close() {
    this._fileBytes = undefined;
    this._installedAppIdField.value = "";
    this._descriptionField.value = "";
  }

  get publishDisabled() {
    return (
      !this._installedAppIdField || this._duplicateName || !this._fileBytes
    );
  }

  checkValidity(_newValue, _nativeValidity) {
    if (this._allApplets.value) {
      const allNames = this._allApplets.value!.map(
        ([_appletEntryHash, applet]) => applet.customName
      );
      if (allNames.includes(this._installedAppIdField.value)) {
        this._duplicateName = true;
        return {
          valid: false,
        };
      }
    }

    this._duplicateName = false;
    return {
      valid: true,
    };
  }

  async createApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    try {
      const appletInfo: AppletMetaData = {
        title: this._installedAppIdField.value, // for the applet class name we just take the user defined name for now.
        subtitle: undefined,
        description: this._descriptionField.value,
        devhubHappReleaseHash: this._fakeDevhubHappReleaseHash!,
        devhubGuiReleaseHash: this._fakeDevhubHappReleaseHash!, // just take the same fake hash for the GUI hash
        icon: undefined,
      };

      const appletEntryHash = await this._matrixStore.createApplet(
        this.weGroupId,
        appletInfo,
        this._installedAppIdField.value,
        this._fileBytes // compressed webhapp as Uint8Array
      );
      (
        this.shadowRoot?.getElementById("installing-progress") as Snackbar
      ).close();
      (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();

      this.dispatchEvent(
        new CustomEvent("applet-installed", {
          detail: { appletEntryHash, weGroupId: this.weGroupId },
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

  // TODO! make typing right here
  loadFileBytes(e: any) {
    const files: FileList = e.target.files;

    const reader = new FileReader();
    reader.onload = (e) => {
      console.log(e.target?.result);
    };
    reader.readAsArrayBuffer(files[0]);
    // TODO! make typing right here
    reader.onloadend = (_e) => {
      const buffer = reader.result as ArrayBuffer;
      const ui8 = new Uint8Array(buffer);
      // create a fake devhub happ release hash from the filehash --> used to compare when joining an applet
      // to ensure it is the same applet and to allow recognizing same applets across groups
      const md5FileHash = new Uint8Array(md5(ui8, { asBytes: true }));
      this._fakeDevhubHappReleaseHash = fakeMd5SeededEntryHash(md5FileHash);
      this._fileBytes = ui8;
      console.log(
        "fake devhub happ release hash: ",
        this._fakeDevhubHappReleaseHash
      );
    };
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

      <mwc-dialog id="applet-dialog" heading="Install Applet">
        <div class="column" style="padding: 16px; margin-bottom: 24px;">
          <div style="margin-bottom: 30px;">
            <strong>Note: </strong>It is recommended to download and install
            Applets from the Applets Library if available. This guarantees
            compatibility between Applets of the same type and version across
            groups and it allows features like federation.
          </div>
          <mwc-textfield
            id="installed-app-id"
            label="Applet Name"
            required
            outlined
            autoValidate
            @input=${() => this.requestUpdate()}
            validateOnInitialRender
            dialogInitialFocus
            .validityTransform=${(newValue, nativeValidity) =>
              this.checkValidity(newValue, nativeValidity)}
          ></mwc-textfield>
          ${this._duplicateName
            ? html`<div
                class="default-font"
                style="color: #b10323; font-size: 12px; margin-left: 4px;"
              >
                Name already exists.
              </div>`
            : html``}

          <mwc-textarea
            style="margin-top: 7px;"
            id="description-field"
            label="description"
            outlined
          >
          </mwc-textarea>

          <span style="margin-top: 7px;">Select file:</span>
          <input
            style="margin-top: 7px;"
            type="file"
            id="filepicker"
            accept=".webhapp"
            @change=${this.loadFileBytes}
          />
          ${this._fileBytes
            ? html``
            : html`<div
                class="default-font"
                style="color: #b10323; font-size: 12px; margin-left: 4px;"
              >
                No file selected.
              </div>`}
        </div>

        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
        ></mwc-button>
        <mwc-button
          id="primary-action-button"
          .disabled=${this.publishDisabled}
          slot="primaryAction"
          dialogAction="close"
          label="INSTALL"
          @click=${() => this.createApplet()}
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
    return weStyles;
  }
}
