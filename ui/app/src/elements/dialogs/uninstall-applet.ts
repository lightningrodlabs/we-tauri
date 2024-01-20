import { CSSResult, html } from "lit";
import { property, query } from "lit/decorators.js";

import { NHAlert, NHButton, NHCard, NHComponentShoelace, NHDialog } from "@neighbourhoods/design-system-components";

export class UninstallApplet extends NHComponentShoelace {
  @property()
  private _isOpen: boolean = false;
  @query('nh-dialog')
  private _dialog;

  open() {
    this._dialog.showDialog();
  }

  confirm() {
    this.dispatchEvent(
      new CustomEvent("confirm-uninstall", {
        composed: true,
        bubbles: true,
      })
    );
  }

  render() {
    return html`
                <nh-dialog
                  id="uninstall-applet"
                  .title=${"Uninstall Applet"}
                  .dialogType=${"applet-uninstall"}
                  .size=${"medium"}
                  .handleOk=${this.confirm}
                  .isOpen=${this._isOpen}
                  .primaryButtonDisabled=${false}
                >
                <div slot="inner-content">
                  <nh-card .theme=${"dark"} .title="" .heading="" class="nested-card">
                    <nh-alert
                      .title=${"Are you sure you want to uninstall?"}
                      .closable=${false}
                      .type=${"danger"}
                    >
                    </nh-alert>
                    <ul>
                      <li>This will <strong>delete all data</strong> you have stored within this applet.</li>
                      <li>In case this applet has been federated with other neighbourhoods, <b>it will also be removed from those neighbourhoods</b>.</li>
                    </ul>
                    <p slot="footer">
                      Other members of the neighbourhood (or neighbourhoods this applet is federated with) will still be able to use their own instance of the applet.
                    </p>
                  </nh-card>
                  </div>
                </nh-dialog>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-alert": NHAlert,
      "nh-dialog": NHDialog,
      "nh-button": NHButton,
      "nh-card": NHCard,
    };
  }

  static get styles() {
    return [
      super.styles as CSSResult,
    ]
  }
}
