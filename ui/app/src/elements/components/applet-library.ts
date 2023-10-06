import { css, html } from "lit";
import { property, query } from "lit/decorators.js";

import { NHButton, NHComponent, NHPageHeaderCard } from "@neighbourhoods/design-system-components";
import { b64images } from "@neighbourhoods/design-system-styles";
import { InstallableApplets } from "./installable-applets";
import { InstallFromFsDialog } from "../dialogs/install-from-file-system";

export class AppletLibrary extends NHComponent {
  @property()
  toggleVisible!: () => void;

  @query("#install-from-fs-dialog")
  _installFromFsDialog!: InstallFromFsDialog;

  render() {
    return html`
    <div class="container">
      <nh-page-header-card
        .heading=${"Applet Library"}
      >
        <img
          src="data:image/svg+xml;base64,${b64images.icons.backCaret}"
          slot="secondary-action"
          @click=${this.toggleVisible}
        />
        <nh-button
          .variant=${"primary"}
          .size=${"md"}
          @click=${() => {this._installFromFsDialog?.open()}}
          slot="primary-action"
        >Upload Applet File</nh-button>
      </nh-page-header-card>

      <installable-applets></installable-applets>

      <install-from-fs-dialog id="install-from-fs-dialog"></install-from-fs-dialog>
    </div>
    `;
  }

  static elementDefinitions = {
      "nh-button": NHButton,
      "nh-page-header-card": NHPageHeaderCard,
      "installable-applets": InstallableApplets,
      "install-from-fs-dialog": InstallFromFsDialog,
  }

  static get styles() {
    return [
      css`
        .container {
          display:grid;
          grid-template-rows: auto 1fr;
          width: 100%;
        }
    `];
  }
}
