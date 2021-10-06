import { css, html, LitElement } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedRegistryMixin } from '@lit-labs/scoped-registry-mixin';
import { requestContext } from '@lit-labs/context';

import { TextField } from 'scoped-material-components/mwc-textfield';
import { UploadFiles } from '@holochain-open-dev/file-storage';
import { Card } from 'scoped-material-components/mwc-card';
import { Button } from 'scoped-material-components/mwc-button';
import { Snackbar } from 'scoped-material-components/mwc-snackbar';

import { CompositoryService } from '../services/compository-service';
import { importModuleFromFile } from '../processes/import-module-from-file';
import { sharedStyles } from './sharedStyles';
import { SetupLenses } from '../types/lenses';
import { COMPOSITORY_SERVICE_CONTEXT } from '../types/context';

export class PublishDna extends ScopedRegistryMixin(LitElement) {
  @requestContext(COMPOSITORY_SERVICE_CONTEXT)
  _compositoryService!: CompositoryService;

  @query('#zome-name')
  _nameField!: TextField;

  @state()
  _zomeWasmHash: string | undefined = undefined;
  _uiBundleHash: string | undefined = undefined;
  @state()
  _invalidUiBundle = false;

  get publishDisabled() {
    return (
      !this._zomeWasmHash ||
      !this._nameField ||
      !this._nameField.value ||
      this._invalidUiBundle
    );
  }

  async publishZome() {
    if (this._zomeWasmHash) {
      const result = await this._compositoryService.publishZome({
        name: this._nameField.value,
        components_bundle_file: this._uiBundleHash,
        entry_defs: [],
        wasm_file: this._zomeWasmHash,
        wasm_hash: undefined,
        required_membrane_proof: false,
        required_properties: [],
      });
      this.dispatchEvent(
        new CustomEvent('zome-published', {
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
      const setupLenses: SetupLenses = mod.default;

      const lenses = setupLenses(
        this._compositoryService.appWebsocket,
        this._compositoryService.cellId
      );

      if (
        !lenses.standalone ||
        !lenses.entryLenses ||
        !lenses.attachmentsLenses
      ) {
        throw new Error('Malformed lenses');
      }

      this._uiBundleHash = hash;
      this._invalidUiBundle = false;
    } catch (e) {
      (this.shadowRoot?.getElementById('error-snackbar') as Snackbar).show();
      this._invalidUiBundle = true;
    }
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar id="error-snackbar" labelText="Invalid UI bundle">
        <mwc-button
          slot="action"
          label="See Documentation"
          @click=${() => window.open('https://github.com/compository/lib')}
        ></mwc-button>
      </mwc-snackbar>
    `;
  }
  render() {
    return html`
      ${this.renderErrorSnackbar()}
      <mwc-card style="width: auto; flex: 1;">
        <div class="column" style="padding: 16px;">
          <span class="title" style="margin-bottom: 16px;">Publish Zome</span>
          <mwc-textfield
            id="zome-name"
            label="Zome Name"
            required
            @input=${() => this.requestUpdate()}
            style="margin-bottom: 24px;"
          ></mwc-textfield>

          <span style="margin-bottom: 8px;">DNA Bundle (required)</span>
          <upload-files
            one-file
            accepted-files=".dna"
            @file-uploaded=${(e: CustomEvent) =>
              (this._zomeWasmHash = e.detail.hash)}
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

          <mwc-button
            style="margin-top: 24px;"
            label="PUBLISH"
            raised
            @click=${() => this.publishZome()}
            .disabled=${this.publishDisabled}
          ></mwc-button>
        </div>
      </mwc-card>
    `;
  }

  static elementDefinitions = {
    'mwc-textfield': TextField,
    'mwc-button': Button,
    'mwc-card': Card,
    'mwc-snackbar': Snackbar,
    'upload-files': UploadFiles,
  };

  static get styles() {
    return sharedStyles;
  }
}
