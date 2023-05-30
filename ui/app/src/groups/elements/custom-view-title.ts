import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { hashProperty } from "@holochain-open-dev/elements";
import { ActionHash } from "@holochain/client";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { weStyles } from "../../shared-styles";
import { GroupStore } from "../group-store";
import { groupStoreContext } from "../context";
import { CustomView } from "../../custom-views/types";

@customElement("custom-view-title")
export class CustomViewTitle extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  /**
   * REQUIRED. The Hrl of the entry to render
   */
  @property(hashProperty("custom-view-hash"))
  customViewHash!: ActionHash;

  customView = new StoreSubscriber(
    this,
    () => this.groupStore.customViewsStore.customViews.get(this.customViewHash),
    () => [this.customViewHash]
  );

  renderTitle(customView: EntryRecord<CustomView> | undefined) {
    if (!customView) return html``;

    return html` <sl-icon
        .src=${customView.entry.logo}
        style="display: flex; margin-top: 2px; margin-right: 4px"
      ></sl-icon>
      <span style="color: rgb(119,119,119)">${customView.entry.name}</span>`;
  }

  render() {
    switch (this.customView.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderTitle(this.customView.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the custom view")}
          .error=${this.customView.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
