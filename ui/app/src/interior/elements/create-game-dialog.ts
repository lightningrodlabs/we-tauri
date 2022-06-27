import { css, html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { contextProvided } from "@lit-labs/context";
import { EntryHashB64 } from "@holochain-open-dev/core-types";
import {
  TextField,
  Card,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { weContext } from "../context";
import { WeStore } from "../we-store";
import { getAllPublishedApps } from "../../processes/devhub/get-happs";
import { GameInfo } from "../types";
import { TaskSubscriber } from "lit-svelte-stores";

export class CreateGameDialog extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext })
  _weStore!: WeStore;

  @query("#game-dialog")
  _gameDialog!: Dialog;

  @query("#installed-app-id")
  _installedAppIdField!: TextField;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle: { hash: EntryHashB64; setupRenderers: any } | undefined =
    undefined;
  @state()
  _invalidUiBundle = false;

  @state()
  _installableGames;

  @property()
  _gameInfo: GameInfo = {
    title: "",
    subtitle: "",
    description: "",
    entryHash: new Uint8Array(0),
    icon: undefined,
  };

  open(gameInfo: GameInfo) {
    this._gameDialog.show();
    this._gameInfo = gameInfo;
  }

  get publishDisabled() {
    return !this._installedAppIdField;
  }

  /*
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
        this._weStore.cellData,
        this._weStore.whoData
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
 */

  checkValidity() {
    // checking for duplicate names -- doesn't seem to work currently becaus for some reason weStore is undefined here...
    // console.log("weStore within checkValidity: ", this._weStore);
    // console.log("Checking validity");
    // const allGames = this._weStore.allGames;
    // console.log("allGames:, ", allGames);
    // if (allGames) {
    //   const allNames = Object.entries(allGames).map(([gameHash, game]) => game.name);
    //   if (allNames.includes(this._installedAppIdField.value)) {
    //     return {
    //       valid: false
    //     };
    //   }
    // }
    return {
      valid: true,
    };
  }

  async createGame() {
    (this.shadowRoot?.getElementById("installing-progress") as Snackbar).show();
    await this._weStore
      .createGame(this._gameInfo, this._installedAppIdField.value)
      .then(() => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (
          this.shadowRoot?.getElementById("success-snackbar") as Snackbar
        ).show();
      })
      .catch((e) => {
        (
          this.shadowRoot?.getElementById("installing-progress") as Snackbar
        ).close();
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
        console.log("Installation error:", e);
      });
  }

  // public async handleDialogClosing() {$
  // }

  // renderErrorSnackbar() {
  //   return html`
  //     <mwc-snackbar id="error-snackbar" labelText="Installation failed!">
  //       <mwc-button
  //         slot="action"
  //         label="See Documentation"
  //         @click=${() => window.open("https://github.com/compository/lib")}
  //       ></mwc-button>
  //     </mwc-snackbar>
  //   `;
  // }

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
      <mwc-snackbar id="installing-progress" labelText="Installing...">
      </mwc-snackbar>
    `;
  }

  render() {
    return html`
      ${this.renderErrorSnackbar()} ${this.renderSuccessSnackbar()}
      ${this.renderInstallingProgress()}

      <mwc-dialog id="game-dialog" heading="Add Custom Name">
        <div class="column" style="padding: 16px;">
          <mwc-textfield
            id="installed-app-id"
            label="Custom Name"
            required
            outlined
            autoValidate
            value=${this._gameInfo.title}
            @input=${() => this.requestUpdate()}
            style="margin-bottom: 24px;"
            validateOnInitialRender
            dialogInitialFocus
            .validityTransform=${this.checkValidity}
          ></mwc-textfield>
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
          @click=${() => this.createGame()}
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
    };
  }

  static get styles() {
    return sharedStyles;
  }
}
