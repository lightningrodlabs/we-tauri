import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { ActionHashB64, DnaHashB64, encodeHashToBase64, EntryHashB64 } from "@holochain/client";
import { localized, msg } from "@lit/localize";
import { ref } from "lit/directives/ref.js";
import {
  joinAsyncMap,
  pipe,
  StoreSubscriber,
  toPromise,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { notify, notifyError, onSubmit } from "@holochain-open-dev/elements";
import { slice } from "@holochain-open-dev/utils";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import { groupStoreContext } from "../context.js";
import { weStyles } from "../../shared-styles.js";
import { GroupStore } from "../group-store.js";
import { AppEntry, Entity, HostAvailability } from "../../processes/appstore/types.js";
import { weStoreContext } from "../../context.js";
import { WeStore } from "../../we-store.js";

@localized()
@customElement("install-applet-bundle-dialog")
export class InstallAppletBundleDialog extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  _registeredApplets = new StoreSubscriber(
    this,
    () =>
      pipe(this.groupStore.allAdvertisedApplets, (allAppletsHashes) =>
        joinAsyncMap(slice(this.groupStore.applets, allAppletsHashes))
      ),
    () => []
  );

  @query("#applet-dialog")
  _appletDialog!: any;

  @query("form")
  form!: HTMLFormElement;

  @state()
  _dnaBundle: { hash: ActionHashB64; file: File } | undefined = undefined;

  @state()
  _uiBundle: { hash: ActionHashB64; setupRenderers: any } | undefined =
    undefined;

  @state()
  _invalidUiBundle = false;

  @state()
  _duplicateName: boolean = false;

  @state()
  _installing: boolean = false;

  @state()
  _installationProgress: string | undefined;

  @state()
  _appletInfo: Entity<AppEntry> | undefined;

  @state()
  _peerHostsStatus: HostAvailability | undefined;

  @state()
  _pollInterval: number | null = null;

  @state()
  _showAdvanced: boolean = false;

  _unlisten: UnlistenFn | undefined;

  async open(appletInfo: Entity<AppEntry>) {
    console.log("OPENING WITH APPLETINFO: ", appletInfo);
    // reload all advertised applets
    await this.groupStore.allAdvertisedApplets.reload();
    this._appletInfo = appletInfo;
    setTimeout(() => {
      this.form.reset();
      this._appletDialog.show();
    });
  }

  close() {
    this.form.reset();
    this._appletInfo = undefined;
    this._appletDialog.hide();
  }

  async firstUpdated() {
    this._unlisten = await listen("applet-install-progress", (event) => { this._installationProgress = event.payload as string });
    try {
      this._peerHostsStatus = this._appletInfo ? await this.groupStore.weStore.appletBundlesStore.getVisibleHosts(this._appletInfo) : undefined;
    } catch (e) {
      console.error(`Failed to get peer host statuses: ${JSON.stringify(e)}`);
    }

    this._pollInterval = window.setInterval(
      async () => {
        this._peerHostsStatus = this._appletInfo ? await this.groupStore.weStore.appletBundlesStore.getVisibleHosts(this._appletInfo) : undefined;
      },
      5000
    );
  }

  disconnectedCallback(): void {
    if (this._unlisten) this._unlisten();
  }

  get publishDisabled() {
    return this._duplicateName;
  }

  async installApplet(fields: { custom_name: string, network_seed?: string }) {
    if (this._installing) return;
    this._installing = true;
    try {


      // Trigger the download of the icon
      this._installationProgress = "Fetching app icon...";
      await toPromise(this.weStore.appletBundlesStore.appletBundleLogo.get(this._appletInfo!.id));

      this._installationProgress = "Searching latest release...";
      const latestRelease =
        await this.weStore.appletBundlesStore.getLatestVersion(this._appletInfo!);

      const appletEntryHash = await this.groupStore.installAndAdvertiseApplet(
        this._appletInfo!,
        fields.custom_name,
        latestRelease,
        fields.network_seed ? fields.network_seed : undefined,
      );

      notify("Installation successful");
      this.close();
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
      this._appletDialog.hide();
      this._installing = false;
      this._installationProgress = undefined;
    } catch (e) {
      this._installationProgress = undefined;
      notifyError("Installation failed! (See console for details)");
      console.log("Installation error:", e);
      this._appletDialog.hide();
      this._installing = false;
    }
  }

  renderForm() {
    if (!this._appletInfo) return html`Error.`;

    switch (this._registeredApplets.value.status) {
      case "pending":
        return html`<div class="row center-content">
          <sl-spinner></sl-spinner>
        </div>`;
      case "complete":
        const allAppletsNames = Array.from(
          this._registeredApplets.value.value.values()
        ).map((applet) => applet?.custom_name);
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
                if (this._appletInfo && allAppletsNames.includes(this._appletInfo!.content.title)) {
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
            .defaultValue=${this._appletInfo!.content.title}
          ></sl-input>

          <span
            style="text-decoration: underline; cursor: pointer;"
            @click=${() => { this._showAdvanced = !this._showAdvanced }}
          >${this._showAdvanced ? "Hide" : "Show"} Advanced
          </span>

          ${
            this._showAdvanced
              ? html`
                <sl-input
                  name="network_seed"
                  id="network-seed-field"
                  .label=${msg("Custom Network Seed")}
                  style="margin-bottom: 16px"
                ></sl-input>
              ` : html``
          }

          <sl-button
            variant="primary"
            type="submit"
            .loading=${this._installing}
          >
            ${msg("Install")}
          </sl-button>
          <div>${this._installationProgress}</div>
        `;

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
      <sl-dialog
        id="applet-dialog"
        .label=${msg("Install Applet")}
        @sl-request-close=${(e) => {
          if (this._installing) {
            e.preventDefault();
          }
        }}
      >
        <div
          class="row"
          style="justify-content: flex-end; align-items: center; color: #3d3d3d; font-size: 15px;"
          title=${
            this._peerHostsStatus && this._peerHostsStatus.responded.length > 0
              ? this._peerHostsStatus.responded.map((key) => encodeHashToBase64(key)).toString().replaceAll(",", "\n")
              : undefined
          }>
          <span class="online-dot ${this._peerHostsStatus && this._peerHostsStatus.responded.length > 0 ? 'online' : 'offline'}"></span>
          ${
            this._peerHostsStatus
              ? html`
                <span>${this._peerHostsStatus.responded.length > 0 ? this._peerHostsStatus.responded.length : 0 } available peer host${this._peerHostsStatus.responded.length === 1 ? "" : "s"}</span>
              `
              : html`<span>pinging peer hosts...</span>`
          }
        </div>
        <form
          class="column"
          ${onSubmit((f) => this.installApplet(f))}
        >
          ${this.renderForm()}
        </form>
      </sl-dialog>
    `;
  }

  static styles = [
    weStyles,
    css`
      .online-dot {
        border-radius: 50%;
        width: 10px;
        height: 10px;
        margin-right: 10px;
      }

      .online {
        background-color: #17d310;
      }

      .offline {
        background-color: #bfbfbf;
      }
    `
  ];
}
