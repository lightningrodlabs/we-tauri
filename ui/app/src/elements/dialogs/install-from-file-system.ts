import { css, html, LitElement } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { contextProvided } from '@lit-labs/context';
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from '@scoped-elements/material-web';

import md5 from 'md5';

import { sharedStyles } from '../../sharedStyles';
import { AppletMetaData } from '../../types';
import { TaskSubscriber } from 'lit-svelte-stores';
import { MatrixStore } from '../../matrix-store';
import { matrixContext, weGroupContext } from '../../context';
import { DnaHash, EntryHash, EntryHashB64 } from '@holochain/client';
import { fakeMd5SeededEntryHash } from '../../utils';
import { SlButton, SlInput, SlTextarea } from '@scoped-elements/shoelace';
import { NHButton, NHDialog } from '@neighbourhoods/design-system-components';

export class InstallFromFsDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _allApplets = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchAllApplets(this.weGroupId),
    () => [this._matrixStore, this.weGroupId],
  );

  @query('#open-applet-dialog-button')
  _openAppletDialogButton!: HTMLElement;

  @query('#installed-app-id')
  _installedAppIdField!: TextField;

  @query('#description-field')
  _descriptionField!: TextArea;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle: { hash: EntryHashB64; setupRenderers: any } | undefined = undefined;
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
    this._openAppletDialogButton.click();
  }

  close() {
    this._fileBytes = undefined;
    this._installedAppIdField.value = '';
    this._descriptionField.value = '';
  }

  get publishDisabled() {
    return !this._installedAppIdField || this._duplicateName || !this._fileBytes;
  }

  checkValidity(newValue) {
    if (this._allApplets.value) {
      const allNames = this._allApplets.value!.map(
        ([_appletEntryHash, applet]) => applet.customName,
      );
      if (allNames.includes(newValue)) {
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
    (this.shadowRoot?.getElementById('installing-progress') as Snackbar).show();
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
        this._fileBytes, // compressed webhapp as Uint8Array
      );
      (this.shadowRoot?.getElementById('installing-progress') as Snackbar).close();
      (this.shadowRoot?.getElementById('success-snackbar') as Snackbar).show();

      this.dispatchEvent(
        new CustomEvent('applet-installed', {
          detail: { appletEntryHash, weGroupId: this.weGroupId },
          composed: true,
          bubbles: true,
        }),
      );
    } catch (e) {
      (this.shadowRoot?.getElementById('installing-progress') as Snackbar).close();
      (this.shadowRoot?.getElementById('error-snackbar') as Snackbar).show();
      console.log('Installation error:', e);
    }
  }

  // TODO! make typing right here
  loadFileBytes(e: any) {
    const files: FileList = e.target.files;

    const reader = new FileReader();
    reader.onload = e => {
      console.log(e.target?.result);
    };
    reader.readAsArrayBuffer(files[0]);
    // TODO! make typing right here
    reader.onloadend = _e => {
      const buffer = reader.result as ArrayBuffer;
      const ui8 = new Uint8Array(buffer);
      // create a fake devhub happ release hash from the filehash --> used to compare when joining an applet
      // to ensure it is the same applet and to allow recognizing same applets across groups
      const md5FileHash = new Uint8Array(md5(ui8, { asBytes: true }));
      this._fakeDevhubHappReleaseHash = fakeMd5SeededEntryHash(md5FileHash);
      this._fileBytes = ui8;
      console.log('fake devhub happ release hash: ', this._fakeDevhubHappReleaseHash);
    };
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar id="error-snackbar" labelText="Installation failed! (See console for details)">
      </mwc-snackbar>
    `;
  }

  renderSuccessSnackbar() {
    return html`
      <mwc-snackbar id="success-snackbar" labelText="Installation successful"></mwc-snackbar>
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

      <button id="open-applet-dialog-button" style="opacity:0" type="button"></button>
      <nh-dialog
        id="applet-dialog"
        size="medium"
        dialogType="applet-install"
        handleOk=${this.createApplet.bind(this)}
        handleClose=${null}
        title="Install Applet"
        .openButtonRef=${this._openAppletDialogButton}
        .primaryButtonDisabled=${this.publishDisabled}
        alertMessage="Note: It is recommended to download and install Applets from the
          Applets Library if available. This guarantees compatibility between Applets of the same
          type and version across neighbourhoods and it allows features like federation."
      >
        <div slot="inner-content" class="column">
          <div style="width: 100%;">
            <sl-input
              id="installed-app-id"
              label="Applet Name"
              type="text"
              size="medium"
              @sl-input=${e => this.requestUpdate()}
              required
              @sl-change=${(e) => this.checkValidity(e.target.value)}
            ></sl-input>
            ${this._duplicateName
              ? html`<div
                  class="default-font"
                  style="margin-bottom: 16px; color: var(--nh-theme-error-emphasis); font-size: calc(1px * var(--nh-font-size-base));"
                >
                  Name already exists.
                </div>`
              : html``}
            <sl-textarea id="description-field" label="Description"> </sl-textarea>
            <div style="display: flex; justify-content: space-between">
              <div style="display: flex; flex-direction: column; gap: calc(1px * var(--nh-spacing-md))">
                <span class="label">Select file</span>
                ${this._fileBytes
                  ? html``
                  : html`<div
                      class="default-font"
                      style="color: var(--nh-theme-error-emphasis); font-size: calc(1px * var(--nh-font-size-base));"
                    >
                      No file selected.
                    </div>`}
              </div>
              <nh-button .disabled=${this._fileBytes} .variant=${"primary"} .label=${!this._fileBytes ? "Choose File" : "File Chosen"} .size=${"md"} .clickHandler=${() => {} } @click=${(e) => {if (this._fileBytes) return; e.currentTarget.nextElementSibling.click()}}>
              </nh-button>
              <input style="display:none;" type="file" id="filepicker" accept=".webhapp" @change=${this.loadFileBytes} />
            </div>
          </div>
        </div>
      </nh-dialog>
    `;
  }

  static get elementDefinitions() {
    return {
      'sl-textarea': SlTextarea,
      'sl-input': SlInput,
      'mwc-textfield': TextField,
      'mwc-button': Button,
      'mwc-dialog': Dialog,
      'nh-dialog': NHDialog,
      'mwc-snackbar': Snackbar,
      'mwc-circular-progress': CircularProgress,
      'mwc-textarea': TextArea,
      'nh-button': NHButton,
    };
  }

  static get styles() {
    return css`
      .column {
        display: flex;
        flex-direction: column;
        align-items: start;
        justify-content: space-between;
        gap: calc(1px * var(--nh-spacing-md));
        width: fit-content;
        margin: 0 auto;
        overflow: auto !important;
        color: var(--nh-theme-fg-on-dark);
      }
      @media (max-height: 767px) {
        .column {
          flex-basis: 400%;
          padding-left: calc(1px * var(--nh-spacing-xl));
        }
      }
      sl-input::part(base),
      sl-textarea::part(base) {
        border: none;
        background-color: var(--nh-theme-bg-detail);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
      }
      sl-input::part(base) {
        height: calc(1px * var(--nh-spacing-xxl));
      }
      sl-input::part(form-control), sl-textarea::part(form-control) {
        margin-bottom: calc(1px * var(--nh-spacing-xl));
      }
      sl-input::part(input),
      sl-textarea::part(textarea) {
        color: var(--nh-theme-fg-default);
        height: auto !important;
        font-weight: 500;
        margin: 0 calc(1px * var(--nh-spacing-xs));
        padding: calc(1px * var(--nh-spacing-xs));
      }
      *::part(label), span.label {
        --sl-spacing-3x-small: calc(1px * var(--nh-spacing-xl));
        font-size: calc(1px * var(--nh-font-size-base));
      }
      sl-input::part(input)::placeholder {
        color: var(--nh-theme-input-placeholder);
        opacity: 1;
      }
    `;
  }
}
