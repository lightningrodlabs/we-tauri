import { EntryHash } from "@holochain/client";
import { hashProperty } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { msg } from "@lit/localize";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";

import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";
import { AppletInstance } from "../types";

@customElement("applet-instance-name")
export class AppletInstanceName extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  appletInstance = new StoreSubscriber(
    this,
    () => this.groupStore.applets.get(this.appletInstanceHash),
    () => []
  );

  renderName(appletInstance: EntryRecord<AppletInstance> | undefined) {
    if (!appletInstance) return html``;

    return html`<span>${appletInstance.entry.custom_name}</span>`;
  }

  render() {
    switch (this.appletInstance.value.status) {
      case "pending":
        return html``;
      case "complete":
        return this.renderName(this.appletInstance.value.value);
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error fetching the group profile")}
          .error=${this.appletInstance.value.error.data.data}
        ></display-error>`;
    }
  }
}
