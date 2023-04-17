import { consume } from "@lit-labs/context";
import { state, customElement, query } from "lit/decorators.js";
import { encodeHashToBase64, DnaHash, EntryHash } from "@holochain/client";
import { LitElement, html, css } from "lit";
import { listen } from "@tauri-apps/api/event";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "./group-sidebar.js";
import "./join-group-dialog.js";
import "../layout/dynamic-layout.js";
import { DynamicLayout } from "../layout/dynamic-layout.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { JoinGroupDialog } from "./join-group-dialog.js";
import {
  asyncDerived,
  asyncDeriveStore,
  joinAsyncMap,
  toPromise,
} from "@holochain-open-dev/stores";
import { mapValues } from "@holochain-open-dev/utils";

type View =
  | {
      view: "groupViews";
      selectedGroupDnaHash: DnaHash | undefined;
      selectedAppleReleaseEntryHash: EntryHash | undefined;
    }
  | {
      view: "crossGroupViews";
      selectedAppletDevHubReleaseEntryHash: EntryHash | undefined;
    };

@customElement("main-dashboard")
export class MainDashboard extends LitElement {
  @state()
  view: View = {
    view: "groupViews",
    selectedGroupDnaHash: undefined,
    selectedAppleReleaseEntryHash: undefined,
  };

  @consume({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @query("join-group-dialog")
  joinGroupDialog!: JoinGroupDialog;

  async firstUpdated() {
    const unlisten = await listen("join-group", async (e) => {
      const networkSeed = e.payload as string;

      const groups = await toPromise(
        asyncDeriveStore(this._weStore.allGroups, (groups) =>
          joinAsyncMap(
            mapValues(groups, (groupStore) => groupStore.networkSeed)
          )
        )
      );

      const alreadyJoinedGroup = Array.from(groups.entries()).find(
        ([_, groupNetworkSeed]) => groupNetworkSeed === networkSeed
      );

      if (alreadyJoinedGroup) {
        this.openGroup(alreadyJoinedGroup[0]);
      } else {
        this.joinGroupDialog.open(networkSeed);
      }
    });
  }

  get dynamicLayout() {
    return this.shadowRoot?.getElementById(
      "group-dynamic-layout"
    ) as DynamicLayout;
  }

  async openGroup(groupDnaHash: DnaHash) {
    this.view = {
      view: "groupViews",
      selectedGroupDnaHash: groupDnaHash,
      selectedAppleReleaseEntryHash: undefined,
    };
  }

  renderGroupView(
    selectedGroupDnaHash: DnaHash | undefined,
    selectedAppletInstanceHash: EntryHash | undefined
  ) {
    return html`
      <div style="width: 100vw" class="row">
        <group-sidebar
          style="flex: 0"
          .selectedGroupDnaHash=${selectedGroupDnaHash}
          @home-selected=${() =>
            (this.view = {
              view: "groupViews",
              selectedGroupDnaHash: undefined,
              selectedAppleReleaseEntryHash: undefined,
            })}
          @group-selected=${(e: CustomEvent) =>
            this.openGroup(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) => {
            this.openGroup(e.detail.groupDnaHash);
          }}
          @applet-instance-selected=${(e: CustomEvent) => {
            this.view = {
              view: "groupViews",
              selectedGroupDnaHash: e.detail.groupDnaHash,
              selectedAppleReleaseEntryHash: e.detail.appletInstanceHash,
            };
          }}
        ></group-sidebar>

        ${selectedAppletInstanceHash
          ? html`
              <dynamic-layout
                id="group-dynamic-layout"
                .rootItemConfig=${{
                  type: "row",
                  content: [
                    {
                      type: "component",
                      title: `Group Applet`,
                      componentType: "group-applet-block",
                      componentState: {
                        block: "main",
                        groupDnaHash: encodeHashToBase64(selectedGroupDnaHash!),
                        appletInstanceHash: encodeHashToBase64(
                          selectedAppletInstanceHash
                        ),
                      },
                    },
                  ],
                }}
                style="flex: 1; min-width: 0;"
              ></dynamic-layout>
            `
          : selectedGroupDnaHash
          ? html`
              <dynamic-layout
                id="group-dynamic-layout"
                .rootItemConfig=${{
                  type: "row",
                  content: [
                    {
                      type: "component",
                      title: `Group`,
                      componentType: "group-home",
                      componentState: {
                        groupDnaHash: encodeHashToBase64(selectedGroupDnaHash),
                      },
                    },
                  ],
                }}
                style="flex: 1; min-width: 0;"
              ></dynamic-layout>
            `
          : html`
              <dynamic-layout
                .rootItemConfig=${{
                  type: "row",
                  content: [
                    {
                      type: "component",
                      title: "Welcome",
                      componentType: "welcome",
                    },
                  ],
                }}
                style="flex: 1; min-width: 0;"
              ></dynamic-layout>
            `}
      </div>
    `;
  }

  render() {
    return html`
      <join-group-dialog></join-group-dialog>
      ${this.view.view === "groupViews"
        ? this.renderGroupView(
            this.view.selectedGroupDnaHash,
            this.view.selectedAppleReleaseEntryHash
          )
        : html``}
    `;
  }

  static get styles() {
    return [
      weStyles,
      css`
        :host {
          flex: 1;
          display: flex;
        }
      `,
    ];
  }
}
