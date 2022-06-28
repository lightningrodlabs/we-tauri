import { html, LitElement, css } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import {
  Button,
  TextField,
  CircularProgress,
  Card,
} from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64, EntryHashB64 } from "@holochain-open-dev/core-types";
import { query, state } from "lit/decorators.js";
import { Task } from "@lit-labs/task";

import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";
import {
  AppWithReleases,
  getAllPublishedApps,
  getLatestRelease,
} from "../../processes/devhub/get-happs";

import { AppletInfo } from "../types";
import { CreateAppletDialog } from "./create-applet-dialog";

export class InstallableApplets extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _weStore!: WeStore;

  _installableApplets = new Task(
    this,
    async ([s]) => {
      const devhubHapp = await this._weStore.getDevhubHapp();

      return getAllPublishedApps(this._weStore.appWebsocket, devhubHapp);
    },
    () => [this._weStore]
  );

  @state()
  private _selectedAppletInfo: AppletInfo | undefined;

  @query("#applet-dialog")
  _appletDialog!: CreateAppletDialog;

  renderInstallableApplet(appletInfo: AppletInfo) {
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
          >INSTALL</mwc-button
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
                let appletInfo: AppletInfo = {
                  title: item.app.content.title,
                  subtitle: item.app.content.subtitle,
                  description: item.app.content.description,
                  icon: undefined, // ADD ICON HERE
                  entryHash: latestRelease.address,
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

  static get scopedElements() {
    return {
      "list-profiles": ListProfiles,
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
