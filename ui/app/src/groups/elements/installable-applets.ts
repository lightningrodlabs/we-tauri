import { html, LitElement, css } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import {
  MdOutlinedButton,
  MdOutlinedTextField,
  CircularProgress,
  Card,
} from "@scoped-elements/material-web";
import { consume } from "@lit-labs/context";
import { query, state } from "lit/decorators.js";
import { localized, msg } from "@lit/localize";

import { AppletMetadata } from "../../types";
import { InstallAppletDialog } from "./install-applet-dialog";
import { GroupStore } from "../group-store";
import { groupStoreContext } from "../../context";
import { weStyles } from "../../shared-styles";
import {
  AppWithReleases,
  getLatestRelease,
} from "../../processes/devhub/get-happs";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { DisplayError } from "@holochain-open-dev/elements";

@localized()
export class InstallableApplets extends ScopedElementsMixin(LitElement) {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  _installableApplets = new StoreSubscriber(
    this,
    () => this.groupStore.appletsStore.installableApplets
  );

  @state()
  private _selectedAppletInfo: AppletMetadata | undefined;

  @query("#applet-dialog")
  _appletDialog!: InstallAppletDialog;

  renderInstallableApplet(appletInfo: AppletMetadata) {
    return html`
      <mwc-card class="applet-card">
        <div style="height: 145px;">
          <h2 style="padding: 5px; margin:0;">${appletInfo.title}</h2>
          <h3 style="padding: 5px; margin: 0;">${appletInfo.subtitle}</h3>
          <div style="height: 70px; overflow-y: auto; padding: 5px;">
            ${appletInfo.description}
          </div>
        </div>
        <md-outlined-button
          @click=${() => {
            this._appletDialog.open(appletInfo);
          }}
          .label=${msg("Add to group")}
        ></md-outlined-button>
      </mwc-card>
    `;
  }

  renderApplets(applets: Array<AppWithReleases>) {
    return html`
      <install-applet-dialog
        id="applet-dialog"
        .appletInfo=${this._selectedAppletInfo}
        @closed=${() => {
          this._selectedAppletInfo = undefined;
        }}
      ></install-applet-dialog>

      <div style="display: flex; flex-direction: row; flex-wrap: wrap;">
        ${applets.length == 0
          ? html`
              <div class="column center-content">
                <span class="placeholder"
                  >${msg("No applets available yet")}</span
                >
              </div>
            `
          : applets.map((item) => {
              let latestRelease = getLatestRelease(item);

              if (latestRelease) {
                let appletInfo: AppletMetadata = {
                  title: item.app.content.title,
                  subtitle: item.app.content.subtitle,
                  description: item.app.content.description,
                  icon: undefined, // ADD ICON HERE
                  devhubHappReleaseHash: latestRelease.address,
                  devhubGuiReleaseHash: latestRelease.content.official_gui!,
                };
                return this.renderInstallableApplet(appletInfo);
              }
            })}
      </div>
    `;
  }

  render() {
    console.log(this._installableApplets.value);
    switch (this._installableApplets.value?.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        return this.renderApplets(this._installableApplets.value.value);
      case "error":
        return html`<display-error
          .headline=${msg(
            "Error fetching the applets available for installation"
          )}
          .error=${this._installableApplets.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      "list-profiles": ListProfiles,
      "md-outlined-button": MdOutlinedButton,
      "mwc-circular-progress": CircularProgress,
      "mwc-card": Card,
      "install-applet-dialog": InstallAppletDialog,
      "display-error": DisplayError,
    };
  }

  static styles = [
    css`
      .applet-card {
        width: 300px;
        height: 180px;
        margin: 10px;
      }
    `,
    weStyles,
  ];
}
