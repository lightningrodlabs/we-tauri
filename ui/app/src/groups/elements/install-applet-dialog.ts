import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { EntryHashB64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
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

  _installedApplets = new StoreSubscriber(
    this,
    () => this.groupStore.installedApplets
  );

  @query("#applet-dialog")
  _appletDialog!: any;

  @query("#form")
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
    this.form.reset();
    this._appletDialog.show();
  }

  get publishDisabled() {
    return this._duplicateName;
  }

  // TODO: is this what we want to do?
  // checkValidity(_newValue, _nativeValidity) {
  //   if (this._allApplets.value) {
  //     const allNames = this._allApplets.value!.map(
  //       ([_appletEntryHash, applet]) => applet.customName
  //     );
  //     if (allNames.includes(this._installedAppIdField.value)) {
  //       this._duplicateName = true;
  //       return {
  //         valid: false,
  //       };
  //     }
  //   }

  //   this._duplicateName = false;
  //   return {
  //     valid: true,
  //   };
  // }

  async installApplet(customName: string) {
    notify("Installing...");
    try {
      const appletEntryHash =
        await this.groupStore.installAndRegisterAppletOnGroup(
          this._appletInfo,
          customName
        );
      notify("Installation successful");

      this.dispatchEvent(
        new CustomEvent("applet-installed", {
          detail: { appletEntryHash, groupDnaHash: this.groupStore },
          composed: true,
          bubbles: true,
        })
      );
    } catch (e) {
      notifyError("Installation failed! (See console for details)");
      console.log("Installation error:", e);
    }
  }

  render() {
    return html`
      <sl-dialog id="applet-dialog" .label=${msg("Install Applet")}>
        <form
          class="column"
          style="padding: 16px; margin-bottom: 24px;"
          ${onSubmit((f) => this.installApplet(f.custom_name))}
        >
          <sl-input
            name="custom_name"
            id="custom-name-field"
            .label=${msg("Custom Name")}
            required
            .defaultValue=${this._appletInfo.title}
          ></sl-input>
          ${this._duplicateName
            ? html`<div
                class="default-font"
                style="color: #b10323; font-size: 12px; margin-left: 4px;"
              >
                ${msg("Name already exists.")}
              </div>`
            : html``}

          <sl-button
            id="primary-action-button"
            variant="primary"
            .label=${msg("INSTALL")}
            type="submit"
          ></sl-button>
        </form>
      </sl-dialog>
    `;
  }

  static styles = weStyles;
}
