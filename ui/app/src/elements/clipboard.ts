import { customElement, state, query } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { consume } from "@lit-labs/context";
import { localized } from "@lit/localize";
import { sharedStyles } from "@holochain-open-dev/elements";

import "@shoelace-style/shoelace/dist/components/input/input.js";
import { SearchEntry } from "@lightningrodlabs/we-applet/dist/elements/search-entry.js";


import { EntryHash } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import { AppletInfo, EntryLocationAndInfo, GroupProfile, HrlWithContext } from "@lightningrodlabs/we-applet";
import { SlDialog } from "@shoelace-style/shoelace";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { buildHeadlessWeServices } from "../applets/applet-host.js";

export interface SearchResult {
  hrlsWithInfo: Array<[HrlWithContext, EntryLocationAndInfo]>;
  groupsProfiles: ReadonlyMap<DnaHash, GroupProfile>;
  appletsInfos: ReadonlyMap<EntryHash, AppletInfo>;
}

/**
 * @element search-entry
 * @fires entry-selected - Fired when the user selects some entry. Detail will have this shape: { hrl, context }
 */
@localized()
@customElement("we-clipboard")
export class WeClipboard extends LitElement {
  @consume({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @query("#clipboard-dialog")
  _dialog!: SlDialog;

  @query("#clipboard-search")
  _searchField!: SearchEntry;

  @state()
  mode: "open" | "select" = "open";

  @state()
  clipboardContent: Array<HrlWithContext> = [];

  show(mode: "open" | "select") {
    this.loadClipboardContent();
    this.mode = mode;
    this._dialog.show();
    this._searchField.focus();
  }

  hide() {
    this.mode = "open";
    this._dialog.hide();
  }


  loadClipboardContent() {
    const clipboardJSON: string | null = window.localStorage.getItem("clipboard");
    let clipboardContent: Array<HrlWithContext> = [];
    if (clipboardJSON) {
      clipboardContent = JSON.parse(clipboardJSON);
    }
    this.clipboardContent = clipboardContent;
  }

  removeHrlFromClipboard(hrl: HrlWithContext) {
    const clipboardJSON = window.localStorage.getItem("clipboard");
    let clipboardContent: Array<HrlWithContext> = [];
    if (clipboardJSON) {
      clipboardContent = JSON.parse(clipboardJSON);
      const index = clipboardContent.indexOf(hrl);
      if (index > -1) { // only splice array when item is found
        clipboardContent.splice(index, 1);
      }
    }
    window.localStorage.setItem("clipboard", JSON.stringify(clipboardContent));
  }

  handleHrlSelected(e: { detail: HrlWithContext; target: { reset: () => void; }; }) {
    switch (this.mode) {
      case "open":
        this.dispatchEvent(new CustomEvent("open-hrl", {
          detail: e.detail,
          bubbles: true,
          composed: true,
        }));
        break;
      case "select":
        this.dispatchEvent(new CustomEvent("hrl-selected", {
          detail: e.detail,
          bubbles: true,
          composed: true,
        }));
        break;
    }
    e.target.reset();
    this.hide();
  }


  render() {
    return html`
      <sl-dialog
        id="clipboard-dialog"
        no-header
        @sl-initial-focus=${(e: { preventDefault: () => void; }) => {
          e.preventDefault();
          this._searchField.focus();
        }}
      >
        <div class="column" style="align-items: center;">
          ${this.mode === "select" ? html`<div style = "font-size: 22px;">Select Attachment:</div>` : html``}

          <we-services-context
            .services=${buildHeadlessWeServices(this._weStore)}
          >
            <search-entry
              id="clipboard-search"
              field-label=""
              style="width: 400px;"
              @entry-selected=${(e) => this.handleHrlSelected(e)}
            ></search-entry>
          </we-services-context>

          <div style="margin-top: 30px;">${JSON.stringify(this.clipboardContent)}</div>
      </sl-dialog>
    `;
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }
      `,
    ];
  }
}
