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
  TextArea,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { StoreSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { provideAllApplets } from "../../matrix-helpers";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash, EntryHash, EntryHashB64 } from "@holochain/client";
import { compareUint8Arrays, fakeSeededEntryHash } from "../../utils";

export class JoinFromFsDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _allApplets = new StoreSubscriber(
    this,
    () => provideAllApplets(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @property()
  appletInstanceId!: EntryHash;

  @property()
  mode: "reinstall" | "join" = "join";

  @query("#applet-dialog")
  _appletDialog!: Dialog;

  @query("#installed-app-id")
  _installedAppIdField!: TextField;

  @query("#subtitle-field")
  _subtitleField!: TextArea;

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
  _fileBytes: Uint8Array | undefined = undefined;

  @state()
  _fakeDevhubHappReleaseHash: EntryHash | undefined = undefined;



  open() {
    this._appletDialog.show();
  }

  close() {
    this._fileBytes = undefined;
    this._fakeDevhubHappReleaseHash = undefined;
    this._subtitleField.value = "";
    this._installedAppIdField.value = "";
    this._descriptionField.value = "";
  }

  cancel() {
    this._fileBytes = undefined;
    this._fakeDevhubHappReleaseHash = undefined;
    this._subtitleField.value = "";
    this._installedAppIdField.value = "";
    this._descriptionField.value = "";
  }


  fileHashOk() {
    if (this._fakeDevhubHappReleaseHash) {
      const devhubHappReleaseHash = this.mode == "reinstall"
        ? this._matrixStore.getUninstalledAppletInstanceInfo(this.appletInstanceId)?.applet.devhubHappReleaseHash
        : this._matrixStore.getNewAppletInstanceInfo(this.appletInstanceId)?.applet.devhubHappReleaseHash;
      return devhubHappReleaseHash && compareUint8Arrays(devhubHappReleaseHash, this._fakeDevhubHappReleaseHash)
    } else {
      return false;
    }
  }

  get publishDisabled() {
    return !this._fileBytes || !this.fileHashOk();
  }


  async joinApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    try {
      await this._matrixStore.joinApplet(
        this.weGroupId,
        this.appletInstanceId,
        this._fileBytes, // compressed webhapp as Uint8Array
      );
      const appletEntryHash = this.appletInstanceId;
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


  // async reinstallApplet() {
  //   (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
  //   try {
  //     await this._matrixStore.reinstallApplet(
  //       this.weGroupId,
  //       this.appletInstanceId,
  //       this._fileBytes, // compressed webhapp as Uint8Array
  //     );
  //     const appletEntryHash = this.appletInstanceId;
  //     (
  //       this.shadowRoot?.getElementById("installing-progress") as Snackbar
  //     ).close();
  //     (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();

  //     this.dispatchEvent(
  //       new CustomEvent("applet-installed", {
  //         detail: { appletEntryHash, weGroupId: this.weGroupId },
  //         composed: true,
  //         bubbles: true,
  //       })
  //     );
  //   } catch (e) {
  //     (
  //       this.shadowRoot?.getElementById("installing-progress") as Snackbar
  //     ).close();
  //     (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
  //     console.log("Installation error:", e);
  //   }
  // }

  async loadFileBytes(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files) {
      const file = target.files.item(0);
      if (file) {
        const ab = await file.arrayBuffer()
        const ui8 = new Uint8Array(ab)
        // create a fake devhub happ release hash from the filehash --> used to compare when joining an applet
        // to ensure it is the same applet and to allow recognizing same applets across groups
        this._fakeDevhubHappReleaseHash = await fakeSeededEntryHash(ui8);
        this._fileBytes = ui8;
        console.log('fake devhub happ release hash: ', this._fakeDevhubHappReleaseHash);
      }
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
      <mwc-snackbar id="installing-progress" labelText="Installing..." .timeoutMs=${-1}>
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <mwc-dialog id="applet-dialog" heading="Add Custom Name">

        <div class="column">
          <div>Upload the <b>same</b> .webhapp file as the person that installed it to the neighbourhood:</div>

          <input style="margin-top: 20px;" type="file" id="filepicker" accept=".webhapp" @change=${this.loadFileBytes}>
          ${this._fileBytes
              ? html``
              : html`<div
                  class="default-font"
                  style="color: #b10323; font-size: 12px; margin-left: 4px;"
                >
                  No file selected.
                </div>`
            }

          ${(this._fileBytes && !this.fileHashOk())
              ? html`<span class="hash-error">The hash of the applet you uploaded does not match with the hash of the applet that you
                want to join. Make sure to use the same .webhapp file as the person that installed the applet
                to the group.
              </span>`
              : html``
          }

        </div>


        <mwc-button
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
          @click=${this.cancel}
        ></mwc-button>
        <mwc-button
          id="primary-action-button"
          .disabled=${this.publishDisabled}
          slot="primaryAction"
          dialogAction="close"
          label="INSTALL"
          @click=${() => this.joinApplet()}
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
    return [sharedStyles,
    css`
    .hash-error{
      color: #e30000;
      border: 2px solid #e30000;
      border-radius: 10px;
      padding: 5px 10px;
      margin-top: 20px;
      font-size: 0.85em;
      background: #ffdada;
    }
    `
    ]
  }
}
