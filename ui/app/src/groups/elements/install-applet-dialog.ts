import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { EntryHashB64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
import { ref } from "lit/directives/ref.js";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import { AppletMetadata } from "../../types.js";
import { groupStoreContext } from "../context.js";
import { weStyles } from "../../shared-styles.js";
import { GroupStore } from "../group-store.js";
import { notify, notifyError, onSubmit } from "@holochain-open-dev/elements";

@localized()
@customElement("install-applet-dialog")
export class InstallAppletDialog extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  _registeredApplets = new StoreSubscriber(
    this,
    () => this.groupStore.registeredApplets
  );

  @query("#applet-dialog")
  _appletDialog!: any;

  @query("form")
  form!: HTMLFormElement;

  @state()
  _dnaBundle: { hash: EntryHashB64; file: File } | undefined = undefined;
  @state()
  _uiBundle: { hash: EntryHashB64; setupRenderers: any } | undefined =
    undefined;
  @state()
  _invalidUiBundle = false;

  @state()
  _duplicateName: boolean = false;

  @state()
  _installing: boolean = false;

  @state()
  _appletInfo: AppletMetadata = {
    title: "",
    subtitle: "",
    description: "",
    devhubHappReleaseHash: new Uint8Array(0),
    devhubGuiReleaseHash: new Uint8Array(0),
    icon: undefined,
  };

  open(appletInfo: AppletMetadata) {
    this._appletInfo = appletInfo;
    setTimeout(() => {
      this.form.reset();
      this._appletDialog.show();
    });
  }

  get publishDisabled() {
    return this._duplicateName;
  }

  async installApplet(customName: string) {
    if (this._installing) return;
    this._installing = true;
    try {
      const appletEntryHash =
        await this.groupStore.installAndRegisterAppletOnGroup(
          this._appletInfo,
          customName
        );
      notify("Installation successful");

      this.dispatchEvent(
        new CustomEvent("applet-installed", {
          detail: {
            appletEntryHash,
            groupDnaHash: this.groupStore.groupDnaHash,
          },
          composed: true,
          bubbles: true,
        })
      );
    } catch (e) {
      notifyError("Installation failed! (See console for details)");
      console.log("Installation error:", e);
    }
    this._appletDialog.hide();
    this._installing = false;
  }

  renderForm() {
    switch (this._registeredApplets.value.status) {
      case "pending":
        return html`<div class="row center-content">
          <sl-spinner></sl-spinner>
        </div>`;
      case "complete":
        const allAppletsNames = Array.from(
          this._registeredApplets.value.value.values()
        ).map((appletInstance) => appletInstance.custom_name);
        return html`
          <sl-input
            name="custom_name"
            id="custom-name-field"
            .label=${msg("Custom Name")}
            style="margin-bottom: 16px"
            required
            ${ref((input) => {
              if (!input) return;
              setTimeout(() => {
                if (allAppletsNames.includes(this._appletInfo.title)) {
                  (input as HTMLInputElement).setCustomValidity(
                    "Name already exists"
                  );
                } else {
                  (input as HTMLInputElement).setCustomValidity("");
                }
              });
            })}
            @input=${(e) => {
              if (allAppletsNames.includes(e.target.value)) {
                e.target.setCustomValidity("Name already exists");
              } else {
                e.target.setCustomValidity("");
              }
            }}
            .defaultValue=${this._appletInfo.title}
          ></sl-input>

          <sl-button
            variant="primary"
            type="submit"
            .loading=${this._installing}
          >
            ${msg("Install")}
          </sl-button>
        </form>`;

      case "error":
        return html`<display-error
          .headline=${msg(
            "Error fetching the registered applets in this group"
          )}
          .error=${this._registeredApplets.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`
      <sl-dialog id="applet-dialog" .label=${msg("Install Applet")}>
        <form
          class="column"
          ${onSubmit((f) => this.installApplet(f.custom_name))}
        >
          ${this.renderForm()}
        </form>
      </sl-dialog>
    `;
  }

  static styles = weStyles;
}
