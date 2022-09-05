import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { Task } from "@lit-labs/task";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, CircularProgress, Dialog, IconButtonToggle, Snackbar } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { JoinFromFsDialog } from "../dialogs/join-from-file-system";
import { RenderBlock } from "../components/render-block";



export class AppletNotInstalled extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;


  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @property()
  appletInstanceId!: EntryHash;

  @state()
  private _showAppletDescription: boolean = false;

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
            detail: { appletEntryHash: this.appletInstanceId },
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

  render() {

    const appletInstanceInfo = this._matrixStore.getNewAppletInstanceInfo(this.appletInstanceId)!;
    return html`

      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <join-from-fs-dialog .appletInstanceId=${this.appletInstanceId} id="join-from-fs-dialog"></join-from-fs-dialog>

      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column center-content"
              style="flex: 1; margin-top: 50px;"
            >
              ${!appletInstanceInfo.applet.logoSrc
                ? html`<div
                    class="logo-placeholder-large"
                    style="width: 100px; height: 100px;"
                  >
                    ${appletInstanceInfo.applet.customName[0]}
                  </div>`
                : html`<img class="logo-large" src=${appletInstanceInfo.applet.logoSrc} />`}
              <div class="row center-content" style="margin-top: 20px;">
                <div
                  style="font-size: 1.4em; margin-left: 50px; margin-right: 5px;"
                >
                  ${appletInstanceInfo.applet.customName}
                </div>
                <mwc-icon-button-toggle
                  onIcon="expand_less"
                  offIcon="expand_more"
                  @click=${this.toggleAppletDescription}
                ></mwc-icon-button-toggle>
              </div>
              ${this._showAppletDescription
                ? html`<div
                    style="margin-top: 10px; font-size: 1em; max-width: 800px; color: #656565;"
                  >
                    ${appletInstanceInfo.applet.description}
                  </div>`
                : html``}
              <div
                style="margin-top: 70px; font-size: 1.2em; text-align: center;"
              >
                This applet has been added by someone else from your group.
              </div>
              <div
                style="margin-top: 10px; font-size: 1.2em; text-align: center;"
              >
                You haven't installed it yet.
              </div>
              <mwc-button
                style="margin-top: 65px;"
                raised
                @click=${async () => await this.joinApplet()}
                >Automatically Install from the DevHub</mwc-button
              >

              <mwc-button
                style="margin-top: 15px;"
                @click=${async () => this.joinFromFsDialog.open()}
                >Upload from Filesystem instead</mwc-button
              >
            </div>
          </div>
        </div>
      </div>
    `;
  }


  static get scopedElements() {
    return {
      "render-block": RenderBlock,
      "mwc-circular-progress": CircularProgress,
      "mwc-button": Button,
      "mwc-icon-button-toggle": IconButtonToggle,
      "mwc-snackbar": Snackbar,
      "join-from-fs-dialog": JoinFromFsDialog,
    };
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }

      .logo-large {
        border-radius: 50%;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }

      .logo-placeholder-large {
        text-align: center;
        font-size: 70px;
        border-radius: 50%;
        border: 4px solid black;
        width: 100px;
        height: 100px;
        object-fit: cover;
        background: white;
      }
    `;

    return [sharedStyles, localStyles];
  }


}