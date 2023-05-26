import { LitElement, html, css } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import {
  sharedStyles,
  hashProperty,
  wrapPathInSvg,
  notifyError,
} from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from "@mdi/js";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import SlAlert from "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "./edit-custom-view.js";

import { CustomViewsStore } from "../custom-views-store.js";
import { customViewsStoreContext } from "../context.js";
import { CustomView } from "../types.js";

/**
 * @element custom-view-detail
 * @fires custom-view-deleted: detail will contain { customViewHash }
 */
@localized()
@customElement("custom-view")
export class CustomViewEl extends LitElement {
  // REQUIRED. The hash of the CustomView to show
  @property(hashProperty("custom-view-hash"))
  customViewHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: customViewsStoreContext, subscribe: true })
  customViewsStore!: CustomViewsStore;

  /**
   * @internal
   */
  _customView = new StoreSubscriber(this, () =>
    this.customViewsStore.customViews.get(this.customViewHash)
  );

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteCustomView() {
    try {
      await this.customViewsStore.client.deleteCustomView(this.customViewHash);

      this.dispatchEvent(
        new CustomEvent("custom-view-deleted", {
          bubbles: true,
          composed: true,
          detail: {
            customViewHash: this.customViewHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg("Error deleting the custom view"));
      console.error(e);
    }
  }

  renderDetail(entryRecord: EntryRecord<CustomView>) {
    return html`
      <iframe srcdoc="${entryRecord.entry.html}" style="flex: 1"></iframe>
    `;
  }

  render() {
    switch (this._customView.value.status) {
      case "pending":
        return html`<sl-card>
          <div
            style="display: flex; flex: 1; align-items: center; justify-content: center"
          >
            <sl-spinner style="font-size: 2rem;"></sl-spinner>
          </div>
        </sl-card>`;
      case "complete":
        const customView = this._customView.value.value;

        if (!customView)
          return html`<span
            >${msg("The requested custom view doesn't exist")}</span
          >`;

        if (this._editing) {
          return html`<edit-custom-view
            .currentRecord=${customView}
            @custom-view-updated=${async () => {
              this._editing = false;
            }}
            @edit-canceled=${() => {
              this._editing = false;
            }}
            style="display: flex; flex: 1;"
          ></edit-custom-view>`;
        }

        return this.renderDetail(customView);
      case "error":
        return html`<sl-card>
          <display-error
            .headline=${msg("Error fetching the custom view")}
            .error=${this._customView.value.error.data.data}
          ></display-error>
        </sl-card>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
