import { css, CSSResult, html } from "lit";
import { property, query } from "lit/decorators.js";

import { AppInfo } from "@holochain/client";
import { NHButton, NHCard, NHComponentShoelace, NHDialog } from "@neighbourhoods/design-system-components";

export class UninstallAppletDialog extends NHComponentShoelace {
  @query("#leave-neighbourhood")
  _uninstallAppletDialog;

  @property({ type: Object })
  installedAppInfo: AppInfo | undefined;

  @property()
  isOpen: boolean = false;

  open() {
    this.isOpen = true;
  }

  confirm() {
    this.dispatchEvent(
      new CustomEvent("confirm-uninstall", {
        detail: { installedAppInfo: this.installedAppInfo},
        composed: true,
        bubbles: true,
      })
    );
  }

  render() {
    return html`
                <nh-dialog
                  id="leave-neighbourhood"
                  .title=${"Uninstall Applet"}
                  .alertMessage=${"Are you sure you want to uninstall this applet?"}
                  .alertType=${"warning"}
                  .dialogType=${"applet-install"}
                  size=${"medium"}
                  handleOk=${this.confirm}}
                  isOpen=${false}
                  .primaryButtonDisabled=${false}
                >
                <div slot="inner-content">
                  <nh-card .theme=${"light"} .title="" .heading="" class="nested-card">
                  <ul>
                  <li>This will <strong>delete all data</strong> you have stored within this applet.</li>
                  <li>In case this applet has been federated with other neighbourhoods, <b>it will also be removed from those neighbourhoods</b>.</li>
                  </ul>
                  <p>
                    Other members of the neighbourhood (or neighbourhoods this applet is federated with) will still be able to use their own instance of the applet.
                    </p>
                    <div slot="footer"></div>
                  <nh-card>
                  </div>
                </nh-dialog>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-dialog": NHDialog,
      "nh-button": NHButton,
      "nh-card": NHCard,
    };
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css `
      `
    ]
  }
}
