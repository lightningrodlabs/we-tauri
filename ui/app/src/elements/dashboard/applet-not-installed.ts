import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { Button, CircularProgress, Dialog, IconButtonToggle, Snackbar } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { AppletInstanceInfo, MatrixStore, NewAppletInstanceInfo } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { JoinFromFsDialog } from "../dialogs/join-from-file-system";
import { NHButton } from "@neighbourhoods/design-system-components";

export class AppletNotInstalled extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;


  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @property()
  appletInstanceId!: EntryHash;

  @state()
  private _showAppletDescription: boolean = false;

  @property()
  mode!: "reinstall" | "join";

  @query("#join-from-fs-dialog")
  joinFromFsDialog!: JoinFromFsDialog;


  private toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }

  async joinApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();

    await this._matrixStore.joinApplet(this.weGroupId, this.appletInstanceId)
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("applet-installed", {
            detail: { appletEntryHash: this.appletInstanceId, weGroupId: this.weGroupId },
            composed: true,
            bubbles: true,
            }
          )
        );
        (this.shadowRoot?.getElementById("installing-progress") as Snackbar).close();
        (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();
      }).catch((e) => {
        console.log("Installation Error: ", e);
        (this.shadowRoot?.getElementById("installing-progress") as Snackbar).close();
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      })
  }


  async reinstallApplet() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();

    await this._matrixStore.reinstallApplet(this.weGroupId, this.appletInstanceId)
      .then(() => {
        this.dispatchEvent(
          new CustomEvent("applet-installed", {
            detail: { appletEntryHash: this.appletInstanceId, weGroupId: this.weGroupId },
            composed: true,
            bubbles: true,
            }
          )
        );
        (this.shadowRoot?.getElementById("installing-progress") as Snackbar).close();
        (this.shadowRoot?.getElementById("success-snackbar") as Snackbar).show();
      }).catch((e) => {
        console.log("Installation Error: ", e);
        (this.shadowRoot?.getElementById("installing-progress") as Snackbar).close();
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      })
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

  cancelReinstall() {
    this.dispatchEvent(
      new CustomEvent("cancel-reinstall", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {

    const appletInstanceInfo: AppletInstanceInfo | NewAppletInstanceInfo | undefined = this.mode == "reinstall"
      ? this._matrixStore.getUninstalledAppletInstanceInfo(this.appletInstanceId)
      : this._matrixStore.getNewAppletInstanceInfo(this.appletInstanceId)
    if (!appletInstanceInfo) {
      return html `
        <div class="center-content" style="flex: 1;display: flex;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `
    }

    return html`

      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <join-from-fs-dialog
        mode=${this.mode}
        .appletInstanceId=${this.appletInstanceId}
        id="join-from-fs-dialog">
      </join-from-fs-dialog>

      <div class="content">
        ${!appletInstanceInfo.applet.logoSrc
          ? html`<div
              class="logo-placeholder-large"
              style="width: 100px; height: 100px;"
            >
              ${appletInstanceInfo.applet.customName[0]}
            </div>`
          : html`<img class="logo-large" src=${appletInstanceInfo.applet.logoSrc} />`}
        <div>
          <div
          >
            ${appletInstanceInfo.applet.customName}
          </div>
        </div>
        ${this._showAppletDescription
          ? html`<div
            >
              ${appletInstanceInfo.applet.description}
            </div>`
          : html``}

        ${this.mode == "reinstall"
          ? html`
              <div
              >
                Reinstall this applet?
              </div>
            `
          : html`
              <p>
                This applet has been added by someone else from your group.
              </p>
              <p>
                You haven't installed it yet.
              </p>
            `
        }
      ${
        // TODO: reimplement
        // <mwc-button
        //   @click=${async () => this.mode == "reinstall" ? await this.reinstallApplet() : await this.joinApplet()}
        //   >Automatically Install from the DevHub</mwc-button
        // >
        null
      }

        <div class="buttons">
          <nh-button
            .variant=${"primary"}
            @click=${async () => this.joinFromFsDialog.open()}
          >Upload from Filesystem</nh-button>
          <nh-button
            .variant=${"secondary"}
            @click=${this.cancelReinstall}
          >Cancel</nh-button>
        </div>
      </div>
    `;
  }


  static elementDefinitions = {
    "mwc-circular-progress": CircularProgress,
    "mwc-button": Button,
    "nh-button": NHButton,
    "mwc-snackbar": Snackbar,
    "join-from-fs-dialog": JoinFromFsDialog,
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: grid;
        flex: 1;
        place-content: center;
        color: var(--nh-theme-fg-default); 
      }

      .logo-large {
        border-radius: 50%;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .content, .buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: calc(1px * var(--nh-spacing-xl));
      }
      
      .buttons {
        flex-direction: row-reverse;
      }
    `;

    return [sharedStyles, localStyles];
  }


}
