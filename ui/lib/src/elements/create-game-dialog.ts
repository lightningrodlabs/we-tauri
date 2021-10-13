import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { contextProvided, provide } from "@lit-labs/context";

import {
  TextField,
  Card,
  Button,
  Snackbar,
  Dialog,
} from "@scoped-elements/material-web";
import {
  fileStorageServiceContext,
  UploadFiles,
} from "@holochain-open-dev/file-storage";

import { importModuleFromFile } from "../renderers/processes/import-module-from-file";
import { sharedStyles } from "../sharedStyles";
import { SetupRenderers } from "../renderers/types";
import { weContext } from "../context";
import { WeStore } from "../we-store";
import { EntryHashB64 } from "@holochain-open-dev/core-types";

export class CreateGameDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext })
  _weStore!: WeStore;

  @query("#dna-name")
  _nameField!: TextField;

  @query("#logo-url")
  _logoUrl!: TextField;

  @query("#game-dialog")
  _gameDialog!: Dialog;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle:
    | { hash: EntryHashB64; setupRenderers: SetupRenderers }
    | undefined = undefined;
  @state()
  _invalidUiBundle = false;

  open() {
    this._gameDialog.show();
  }

  get publishDisabled() {
    return (
      !this._dnaBundle ||
      !this._nameField ||
      !this._nameField.value ||
      !this._logoUrl ||
      !this._logoUrl.value ||
      this._invalidUiBundle
    );
  }

  async publishDna() {
    if (this._dnaBundle && this._uiBundle) {
      const result = await this._weStore.createGame(
        this._dnaBundle.file,
        this._uiBundle.setupRenderers,
        {
          dna_file_hash: this._dnaBundle.hash,
          ui_file_hash: this._uiBundle.hash,
          name: this._nameField.value,
          logo_url: this._logoUrl.value,
        }
      );
      this.dispatchEvent(
        new CustomEvent("dna-published", {
          detail: {
            zomeDefHash: result,
          },
        })
      );
    }
  }

  async setUIBundleHash(file: File, hash: string) {
    try {
      const mod = await importModuleFromFile(file);
      const setupRenderers: SetupRenderers = mod.default;

      const renderers = setupRenderers(
        this._weStore.appWebsocket,
        this._weStore.cellData
      );
      if (!renderers.full || !renderers.blocks) {
        throw new Error("Malformed lenses");
      }

      this._uiBundle = {
        hash,
        setupRenderers,
      };
      this._invalidUiBundle = false;
    } catch (e) {
      console.error(e);
      (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      this._invalidUiBundle = true;
    }
  }

  public handleDialogClosing() {
    this._nameField.value = "";
    this._logoUrl.value = "";
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar id="error-snackbar" labelText="Invalid UI bundle">
        <mwc-button
          slot="action"
          label="See Documentation"
          @click=${() => window.open("https://github.com/compository/lib")}
        ></mwc-button>
      </mwc-snackbar>
    `;
  }
  render() {
    return html`
      ${this.renderErrorSnackbar()}
      <mwc-dialog
        id="game-dialog"
        heading="Create Game"
        @closing=${this.handleDialogClosing}
      >
        <div
          class="column"
          style="padding: 16px;"
          ${provide(
            fileStorageServiceContext,
            this._weStore.fileStorageService
          )}
        >
          <mwc-textfield
            id="dna-name"
            label="Name"
            required
            outlined
            autoValidate
            @input=${() => this.requestUpdate()}
            style="margin-bottom: 24px;"
          ></mwc-textfield>
          <mwc-textfield
            id="logo-url"
            label="Logo Url"
            required
            outlined
            autoValidate
            @input=${() => this.requestUpdate()}
            style="margin-bottom: 24px;"
          ></mwc-textfield>

          <span style="margin-bottom: 8px;">DNA Bundle (required)</span>
          <upload-files
            one-file
            accepted-files=".dna"
            @file-uploaded=${(e: CustomEvent) =>
              (this._dnaBundle = { hash: e.detail.hash, file: e.detail.file })}
          ></upload-files>
          <span style="margin-bottom: 8px; margin-top: 24px;"
            >UI Bundle File (optional)</span
          >
          <upload-files
            one-file
            accepted-files=".js"
            @file-uploaded=${(e: CustomEvent) =>
              this.setUIBundleHash(e.detail.file, e.detail.hash)}
          ></upload-files>
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
          @click=${this.publishDna}
          label="CREATE"
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
      "upload-files": UploadFiles,
    };
  }

  static get styles() {
    return sharedStyles;
  }
}
