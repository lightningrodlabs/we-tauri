import { NHComponent, NHButton, NHPageHeaderCard } from "@neighbourhoods/design-system-components";
import { b64images } from "@neighbourhoods/design-system-styles";
import { html, css } from "lit";
import { property } from "lit/decorators.js";
import { InstallableApplets } from "./installable-applets";
import { contextProvided } from "@lit-labs/context";
import { MatrixStore } from "../../matrix-store";
import { matrixContext } from "../../context";
import { AppInfo } from "@holochain/client";
import { Snackbar } from "@scoped-elements/material-web";

export class AppletListItem extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;
  
  @property()
  onConfigureWidgets!: () => void;

  @property()
  appletStatus;

  @property()
  appletInfo;

  @property()
  onDelete!: () => void;

  async disableApp(appInfo: AppInfo) {
    this.matrixStore.disableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-disabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  async enableApp(appInfo: AppInfo) {
    this.matrixStore.enableApp(appInfo)
      .then(() => {
        (this.shadowRoot?.getElementById("app-enabled-snackbar") as Snackbar).show();
        this.requestUpdate();
      }).catch((e) => {
        console.log("Error: ", e);
        (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  render() {
    return html`<div class="container">
                      <mwc-card style="margin: 5px;">
                        <div
                          class="row"
                          style="background: #645d69; color: white; align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em"
                        >
                          <img
                              style="margin-right: 10px;"
                              class="applet-image"
                              src=${this.appletInfo.applet.logoSrc!}
                            />
                          <strong>${this.appletInfo.applet.customName}</strong>
                          <div class="row" style="margin-left: auto; align-items: center;">
                            <span style="color: gray; margin-right: 25px;">${this.appletStatus}</span>
      
                            <sl-tooltip placement="top" content="configure widgets" hoist>
                              <mwc-button
                                icon="share"
                                style="margin-right: 10px;"
                                @click=${() => {this.onConfigureWidgets()}}
                                label="configure widgets"
                              >
                              </mwc-button>
                            </sl-tooltip>
      
                            ${this.appletStatus === "RUNNING"
                              ? html`
                                <nh-button
                                  class="disable-button"
                                  label="DISABLE"
                                  .iconImageB64=${b64images.icons.plus}
                                  @click=${async () => await this.disableApp(this.appletInfo.appInfo)}
                                ></nh-button>
                                `
                              : html`
                                <nh-button
                                  class="start-button"
                                  label="START"
                                  .iconImageB64=${b64images.icons.plus}
                                  @click=${async () => await this.enableApp(this.appletInfo.appInfo)}
                                ></nh-button>
                                `
                            }
                            <nh-button
                              class="delete-button"
                              label="UNINSTALL"
                              .iconImageB64=${b64images.icons.plus}
                              @click=${() => { this.onDelete() }
                              }
                            >
                            </nh-button>
                          </div>
                        </div>
                      </mwc-card>
                </div> 
    `;
  }

  static elementDefinitions = {
      "nh-button": NHButton,
      "nh-page-header-card": NHPageHeaderCard,
      "installable-applets": InstallableApplets,
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
