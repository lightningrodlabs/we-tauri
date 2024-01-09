import { html, LitElement, css } from "lit";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import {
  Button,
  TextField,
  CircularProgress,
  Card,
} from "@scoped-elements/material-web";
import { consume } from "@lit/context";
import { property, query, state } from "lit/decorators.js";
import { Task } from "@lit/task";

import { sharedStyles } from "../../sharedStyles";
import {
  AppWithReleases,
  getAllAppsWithGui,
  getLatestRelease,
} from "../../processes/devhub/get-happs";

import { AppletMetaData } from "../../types";
import { CreateAppletDialog } from "../dialogs/create-applet-dialog";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { DnaHash } from "@holochain/client";

export class InstallableApplets extends ScopedElementsMixin(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  _installableApplets = new Task(
    this,
    async ([s]) => {
      const devhubHapp = await this._matrixStore.getDevhubHapp();

      return getAllAppsWithGui(this._matrixStore.appWebsocket, devhubHapp);
    },
    () => [this._matrixStore, this.weGroupId]
  );

  @state()
  private _selectedAppletInfo: AppletMetaData | undefined;

  @query("#applet-dialog")
  _appletDialog!: CreateAppletDialog;

  renderInstallableApplet(appletInfo: AppletMetaData) {
    return html`
      <mwc-card class="applet-card">
        <div style="height: 145px;">
          <h2 style="padding: 5px; margin:0;">${appletInfo.title}</h2>
          <h3 style="padding: 5px; margin: 0;">${appletInfo.subtitle}</h3>
          <div style="height: 70px; overflow-y: auto; padding: 5px;">
            ${appletInfo.description}
          </div>
        </div>
        <mwc-button
          outlined
          @click=${() => {
            this._appletDialog.open(appletInfo);
          }}
          >Add to neighbourhood</mwc-button
        >
      </mwc-card>
    `;
  }

  renderApplets(applets: Array<AppWithReleases>) {
    return html` <create-applet-dialog
        id="applet-dialog"
        .appletInfo=${this._selectedAppletInfo}
        @closed=${() => {
          this._selectedAppletInfo = undefined;
        }}
      ></create-applet-dialog>

      <div style="display: flex; flex-direction: row; flex-wrap: wrap;">
        ${(applets.length == 0)
          ? html`
            <div class="column center-content">
              <span class="placeholder">No applets available yet</span>
            </div>
            `
          : applets.map((item) => {
              let latestRelease = getLatestRelease(item);

              if (latestRelease) {
                let appletInfo: AppletMetaData = {
                  title: item.app.content.title,
                  subtitle: item.app.content.subtitle,
                  description: item.app.content.description,
                  icon: undefined, // ADD ICON HERE
                  devhubHappReleaseHash: latestRelease.address,
                  devhubGuiReleaseHash: latestRelease.content.official_gui!,
                };
                return this.renderInstallableApplet(appletInfo);
              }
            })
          }
      </div>
      `;
  }

  render() {
    return this._installableApplets.render({
      complete: (applets) => this.renderApplets(applets),
      pending: () => html`
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      `,
    });
  }

  static get elementDefinitions() {
    return {
      "mwc-button": Button,
      "mwc-textfield": TextField,
      "mwc-circular-progress": CircularProgress,
      "mwc-card": Card,
      "create-applet-dialog": CreateAppletDialog,
    };
  }

  static localStyles = css`
    .applet-card {
      width: 300px;
      height: 180px;
      margin: 10px;
    }
  `;

  static get styles() {
    return [sharedStyles, this.localStyles];
  }
}
