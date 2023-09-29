import { NHComponent, NHButton, NHPageHeaderCard } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { property } from "lit/decorators.js";
import { InstallableApplets } from "./installable-applets";
import { contextProvided } from "@lit-labs/context";
import { AppletInstanceInfo, MatrixStore } from "../../matrix-store";
import { matrixContext } from "../../context";
import { AppInfo } from "@holochain/client";
import { Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";

export class AppletListItem extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;
  
  @property()
  appletStatus!: string;
  
  @property()
  appletInfo!: AppletInstanceInfo;
  
  @property()
  onConfigureWidgets!: () => void;

  @property()
  onDelete!: () => void;

  async disableApp(appInfo: AppInfo) {
    const list = (this.parentNode as any);
    this.matrixStore.disableApp(appInfo)
      .then(() => {
        (list.getElementById("app-disabled-snackbar") as Snackbar).show();
        list.host.refresh();
      }).catch((e) => {
        console.log("Error: ", e);
        (list.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  async enableApp(appInfo: AppInfo) {
    const list = (this.parentNode as any);
    this.matrixStore.enableApp(appInfo)
      .then(() => {
        (list.getElementById("app-enabled-snackbar") as Snackbar).show();
        list.host.refresh();
      }).catch((e) => {
        console.log("Error: ", e);
        (list.getElementById("error-snackbar") as Snackbar).show();
      });
  }

  render() {
    return html`<div class="container">
                  <div style="display: flex; flex: 1; align-items: center; gap: calc(1px * var(--nh-spacing-sm));">
                    <img
                      class="applet-image"
                      src=${this.appletInfo.applet.logoSrc!}
                    />
                    <h4>${this.appletInfo.applet.customName}</h4>
                  </div>
                  <div style="display: flex; flex: 3; align-items: center; gap: calc(1px * var(--nh-spacing-lg)); justify-content: flex-end;">
                    <h4>${this.appletStatus}</h4>

                    <sl-tooltip placement="top" content="Configure Widgets" hoist>
                      <nh-button
                        .clickHandler=${() => {this.onConfigureWidgets()}}
                        label="Configure"
                        .variant=${"neutral"}
                        .size=${"md"}
                      >
                      </nh-button>
                    </sl-tooltip>

                    ${this.appletStatus === "RUNNING"
                      ? html`
                        <nh-button
                          class="disable-button"
                          label="Disable"
                          .variant=${"warning"}
                          .size=${"md"}
                          .clickHandler=${async () => await this.disableApp(this.appletInfo.appInfo)}
                        ></nh-button>
                        `
                      : html`
                        <nh-button
                          class="start-button"
                          label="Start" 
                          .variant=${"success"}
                          .size=${"md"}
                          .clickHandler=${async () => await this.enableApp(this.appletInfo.appInfo)}
                        ></nh-button>
                      `
                    }
                    <nh-button
                      class="delete-button"
                      label="Uninstall"
                      .variant=${"danger"}
                      .size=${"md"}
                      .clickHandler=${() => { this.onDelete() }}
                    >
                    </nh-button>
                  </div>
                </div> 
    `;
  }

  static elementDefinitions = {
      "nh-button": NHButton,
      "sl-tooltip": SlTooltip,
      "nh-page-header-card": NHPageHeaderCard,
      "installable-applets": InstallableApplets,
  }

  static get styles() {
    return [
      css`
        .container {
          display: flex;
          gap: calc(1px * var(--nh-spacing-lg));
          justify-content: space-between;
        }

        img {
          height: 2rem;
          object-fit: cover;
        }

        h4 {
          color: var(--nh-theme-fg-muted); 
        }
    `];
  }
}
