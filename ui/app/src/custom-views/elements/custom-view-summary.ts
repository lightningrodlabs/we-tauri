import { LitElement, html } from "lit";
import { state, property, customElement } from "lit/decorators.js";
import { EntryHash, Record, ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { consume } from "@lit-labs/context";

import { localized, msg } from "@lit/localize";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import { CustomViewsStore } from "../custom-views-store";
import { customViewsStoreContext } from "../context";
import { CustomView } from "../types";

/**
 * @element custom-view-summary
 * @fires custom-view-selected: detail will contain { customViewHash }
 */
@localized()
@customElement("custom-view-summary")
export class CustomViewSummary extends LitElement {
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
  _customView = new StoreSubscriber(
    this,
    () => this.customViewsStore.customViews.get(this.customViewHash),
    () => [this.customViewHash]
  );

  renderSummary(entryRecord: EntryRecord<CustomView>) {
    return html`
      <div style="display: flex; flex-direction: column">
        <span>${entryRecord.entry.name}</span>
      </div>
    `;
  }

  renderCustomView() {
    switch (this._customView.value.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case "complete":
        if (!this._customView.value.value)
          return html`<span
            >${msg("The requested custom view doesn't exist")}</span
          >`;

        return this.renderSummary(this._customView.value.value);
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the custom view")}
          .error=${this._customView.value.error.data.data}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-card
      style="flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("custom-view-selected", {
            composed: true,
            bubbles: true,
            detail: {
              customViewHash: this.customViewHash,
            },
          })
        )}
    >
      ${this.renderCustomView()}
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
