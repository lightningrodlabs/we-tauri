import { encodeHashToBase64 } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";

@customElement("group-dynamic-layout")
export class GroupDynamicLayout extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  get initialRootItemConfig() {
    return {
      type: "row",
      content: [
        {
          type: "component",
          componentType: "group-installable-applets",
          title: `Installable Applets`,
          header: {},
          componentState: {
            groupDnaHash: encodeHashToBase64(this.groupStore.groupDnaHash),
          },
        },
        {
          type: "component",
          title: `Members`,
          componentType: "group-peers-status",
          componentState: {
            groupDnaHash: encodeHashToBase64(this.groupStore.groupDnaHash),
          },
        },
        {
          type: "component",
          title: `Invite new member`,
          componentType: "group-invite-member",
          componentState: {
            groupDnaHash: encodeHashToBase64(this.groupStore.groupDnaHash),
          },
        },
      ],
    };
  }

  render() {
    return html`<dynamic-layout
      .rootItemConfig=${this.initialRootItemConfig}
    ></dynamic-layout>`;
  }
}
