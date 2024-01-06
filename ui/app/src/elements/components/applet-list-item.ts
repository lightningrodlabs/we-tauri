import { NHComponent, NHButton, NHPageHeaderCard, NHDialog } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { property, state } from "lit/decorators.js";
import { InstallableApplets } from "./installable-applets";
import { contextProvided } from "@lit-labs/context";
import { MatrixStore } from "../../matrix-store";
import { matrixContext } from "../../context";
import { AppInfo } from "@holochain/client";
import { Snackbar } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { SensemakerStore } from "@neighbourhoods/client";
import { NHSensemakerSettings } from "../dashboard/nh-sensemaker-settings";
import { AppletInstanceInfo } from "../../types";

export class AppletListItem extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  matrixStore!: MatrixStore;

  @property()
  sensemakerStore!: SensemakerStore;
  
  @property()
  appletStatus!: string;
  
  @property()
  appletInfo!: AppletInstanceInfo;
  
  @property()
  onJoin!: () => void;

  @property()
  onReinstall!: () => void;

  @property()
  onDelete!: () => void;
  
  @state()
  private _widgetConfigDialogActivated: boolean = false;

  onConfigureWidgets() {
    this._widgetConfigDialogActivated = true;
  }
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

  renderButtons() {
    return typeof this.onJoin !== "undefined"
    ? html`
      <nh-button
        class="join-button"
        .variant=${"success"}
        .size=${"md"}
        @click=${async () => await this.onJoin()}
      >Join</nh-button>
    `
    : typeof this.onReinstall !== "undefined"
    ? html`
      <nh-button
        class="reinstall-button"
        .variant=${"warning"}
        .size=${"md"}
        @click=${async () => await this.onReinstall()}
      >Reinstall</nh-button>
    `
    : html`
      <sl-tooltip placement="top" content="Configure Widgets" hoist>
        <nh-button
          @click=${() => {this.onConfigureWidgets()}}
          .variant=${"neutral"}
          .size=${"md"}
        >Configure
        </nh-button>
      </sl-tooltip>

      ${this.appletStatus === "RUNNING"
        ? html`
          <nh-button
            class="disable-button"
            .variant=${"warning"}
            .size=${"md"}
            @click=${async () => await this.disableApp(this.appletInfo.appInfo)}
          >Disable</nh-button>
          `
        : html`
          <nh-button
            class="start-button"
            .variant=${"success"}
            .size=${"md"}
            @click=${async () => await this.enableApp(this.appletInfo.appInfo)}
          >Start</nh-button>
        `
      }
      <nh-button
        class="delete-button"
        .variant=${"danger"}
        .size=${"md"}
        @click=${() => { this.onDelete() }}
      >Uninstall</nh-button>
    `
  }

  render() {
    return html`<div class="container">
                  <div style="display: flex; flex: 1; align-items: center; gap: calc(1px * var(--nh-spacing-sm));">
                    <img
                      src=${this.appletInfo.applet.logoSrc!}
                    />
                    <h4>${this.appletInfo.applet.customName}</h4>
                  </div>
                  <div style="display: flex; flex: 3; align-items: center; gap: calc(1px * var(--nh-spacing-lg)); justify-content: flex-end;">
                    <h4>${this.appletStatus}</h4>
                    ${this.renderButtons()}
                  </div>
                </div>

              ${this._widgetConfigDialogActivated ? html`
                <nh-dialog
                  id="applet-widget-config"
                  size="large"
                  dialogType="widget-config"
                  handleOk=${() => { this._widgetConfigDialogActivated = false}}
                  isOpen=${true}
                  title="Configure Applet Widgets"
                  .primaryButtonDisabled=${true}
                >
                  <div slot="inner-content">
                    <nh-sensemaker-settings
                      .sensemakerStore=${this.sensemakerStore}
                      .appletName=${this.appletInfo.appInfo.installed_app_id}
                    ></nh-sensemaker-settings>
                  </div>
                </nh-dialog>` : html``}
    `;
  }

  static elementDefinitions = {
      "nh-button": NHButton,
      "sl-tooltip": SlTooltip,
      "nh-page-header-card": NHPageHeaderCard,
      "installable-applets": InstallableApplets,
      "nh-dialog": NHDialog,
      "nh-sensemaker-settings": NHSensemakerSettings,
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
