import { manualReloadStore, StoreSubscriber } from "@holochain-open-dev/stores";
import { localized, msg } from "@lit/localize";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { notifyError } from "@holochain-open-dev/elements";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import { weStyles } from "../../shared-styles";
import { enableDevMode, isDevModeEnabled, openDevhub } from "../../tauri";

@localized()
@customElement("publish-applet-button")
export class PublishAppletButton extends LitElement {
  isDevModeEnabled = new StoreSubscriber(
    this,
    () => manualReloadStore(() => isDevModeEnabled()),
    () => []
  );

  @state()
  enabling = false;

  onButtonClicked(devModeEnabled: boolean) {
    if (devModeEnabled) openDevhub();
    else this.enableDevModeDialog.show();
  }

  async enableDevMode() {
    if (this.enabling) return;
    this.enabling = true;

    try {
      await enableDevMode();
      await openDevhub();
    } catch (e) {
      notifyError(msg(`Error enabling developer mode.`));
      console.error(e);
    }

    (this.isDevModeEnabled.store as any).reload();
    this.enabling = false;
  }

  get enableDevModeDialog(): SlDialog {
    return this.shadowRoot?.getElementById(
      "enable-dev-mode-dialog"
    ) as SlDialog;
  }

  render() {
    switch (this.isDevModeEnabled.value.status) {
      case "pending":
        return html`<sl-skeleton effect="pulse"></sl-skeleton>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error getting the dev mode")}
          .error=${this.isDevModeEnabled.value.error}
        ></display-error>`;
      case "complete":
        const enabled = this.isDevModeEnabled.value.value;
        return html`
          ${enabled
            ? html`
                <sl-dialog
                  id="enable-dev-mode-dialog"
                  .label=${msg("Enable Developer Mode")}
                >
                  <span
                    >${msg(
                      "If you want to publish apps, first you must enable the developer mode."
                    )}</span
                  >
                  <span
                    >${msg(
                      "If you want to publish apps, first you must enable the developer mode."
                    )}</span
                  >
                  <sl-button
                    slot="footer"
                    @click=${() => this.enableDevModeDialog.hide()}
                    >${msg("Cancel")}</sl-button
                  >
                  <sl-button
                    slot="footer"
                    variant="primary"
                    @click=${async () => this.enableDevMode()}
                    >${msg("Enable Developer Mode")}</sl-button
                  >
                </sl-dialog>
              `
            : html``}
          <sl-button @click=${() => this.onButtonClicked(enabled)}
            >${msg("Publish an applet")}</sl-button
          >
        `;
    }
  }

  static styles = weStyles;
}
