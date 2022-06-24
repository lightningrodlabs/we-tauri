import { contextProvided, ContextProvider } from "@lit-labs/context";
import { state, query } from "lit/decorators.js";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import {
  IconButton,
  Button,
  CircularProgress,
  Fab,
} from "@scoped-elements/material-web";
import { classMap } from "lit/directives/class-map.js";
import { DnaHashB64 } from "@holochain-open-dev/core-types";
import { HoloIdenticon } from "@holochain-open-dev/utils";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { CreateWeDialog } from "./create-we-dialog";
import { WeStore } from "../../interior/we-store";
import { WeDashboard } from "../../interior/elements/we-dashboard";
import { WeLogo } from "../../interior/elements/we-logo";
import { WeContext } from "./we-context";
import { sharedStyles } from "../../sharedStyles";
import { HomeScreen } from "./home-screen";
import { get } from "svelte/store";
import { SlTooltip } from "@scoped-elements/shoelace";

export class WesDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  @state()
  wesStore!: WesStore;

  _wes = new TaskSubscriber(
    this,
    () => this.wesStore.fetchWes(),
    () => [this.wesStore]
    );

  @state()
  private _selectedWeId: string | undefined;

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  renderWeList(wes: Record<DnaHashB64, WeStore>) {
    return Object.entries(wes)
      .sort(([a_hash, a_store], [b_hash, b_store]) => a_hash.localeCompare(b_hash))
      .map(
        ([weId, weStore]) =>
          html`
            <we-context .weId=${weId}>
              <we-logo
                .store=${weStore}
                style="margin-top: 8px; border-radius: 50%"
                class=${classMap({ highlighted: weId === this._selectedWeId })}
                @click=${() => { this._selectedWeId=weId; this.requestUpdate(); }}
              ></we-logo>
            </we-context>
          `
      );
  }

  renderWeDashboard() {
    return html`
      <we-context .weId=${this._selectedWeId}>
        <we-dashboard style="flex: 1;"></we-dashboard>
      </we-context>
    `
  }

  renderContent(wes: Record<DnaHashB64, WeStore>) {
    return html`
      <div class="row" style="flex: 1">
        <div
          class="column wes-sidebar"
          style=""
        >

          <sl-tooltip placement="right" content="Home" hoist>
            <mwc-fab
              style="--mdc-theme-secondary: #9ca5e3"
              @click=${() => { this._selectedWeId = undefined }}
            >
              <mwc-icon slot="icon" outlined>explore</mwc-icon>
            </mwc-fab>
          </sl-tooltip>

          ${this.renderWeList(wes)}

          <sl-tooltip placement="right" content="Add Group" hoist>
            <mwc-fab
              icon="group_add"
              @click=${() => this._weDialog.open()}
              style="margin-top: 8px; --mdc-theme-secondary: #9ca5e3;"
            ></mwc-fab>
          </sl-tooltip>

          <span style="flex: 1"></span>

          <holo-identicon .hash=${this.wesStore.myAgentPubKey} style="margin-top: 30px;"></holo-identicon>
        </div>

        <div style="margin-left: 72px; width: 100%: display: flex;">
          ${this._selectedWeId
            ? this.renderWeDashboard()
            : html`<home-screen></home-screen>`}
        </div>

        <create-we-dialog id="we-dialog" @we-added=${(e: CustomEvent) => { this._selectedWeId = e.detail; this.requestUpdate() }}></create-we-dialog>

      </div>
    `;
  }

  render() {
    return this._wes.render({
      complete: (wes) => this.renderContent(wes),
      pending: () => html`<div class="row center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
    });
  }

  static get scopedElements() {
    return {
      "mwc-icon-button": IconButton,
      "mwc-circular-progress": CircularProgress,
      "mwc-button": Button,
      "mwc-fab": Fab,
      "holo-identicon": HoloIdenticon,
      "create-we-dialog": CreateWeDialog,
      "home-screen": HomeScreen,
      "we-dashboard": WeDashboard,
      "we-logo": WeLogo,
      "we-context": WeContext,
      "sl-tooltip": SlTooltip,
    };
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }

        .wes-sidebar {
          padding: 8px;
          align-items: center;
          background-color: #303F9F;
          position: fixed;
          top: 0;
          height: 100vh;
          z-index: 1;
          overflow-y: auto;
        }

        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
        .highlighted {
          border: #9ca5e3 4px solid;
        }
      `,
    ];
  }
}
