import { consume } from "@lit-labs/context";
import { state, customElement, query } from "lit/decorators.js";
import { encodeHashToBase64, DnaHash, EntryHash } from "@holochain/client";
import { LitElement, html, css } from "lit";

import "@holochain-open-dev/elements/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "../elements/group-sidebar.js";
import "../layout/dynamic-layout.js";
import { DynamicLayout } from "../layout/dynamic-layout.js";
import "../groups/elements/create-profile.js";
import { CreateProfileInGroup } from "../groups/elements/create-profile.js";

import { weStyles } from "../shared-styles.js";
import { weStoreContext } from "../context.js";
import { WeStore } from "../we-store.js";
import { toPromise } from "../utils.js";
import { ComponentItemConfig } from "golden-layout";

type View =
  | { view: "groupViews"; selectedGroupDnaHash: DnaHash | undefined }
  | {
      view: "crossGroupViews";
      selectedAppletDevHubReleaseEntryHash: EntryHash | undefined;
    };

@customElement("main-dashboard")
export class MainDashboard extends LitElement {
  @state()
  view: View = { view: "groupViews", selectedGroupDnaHash: undefined };

  @consume({ context: weStoreContext })
  @state()
  _weStore!: WeStore;

  @query("create-profile-in-group")
  createProfileInGroup!: CreateProfileInGroup;

  get dynamicLayout() {
    return this.shadowRoot?.getElementById(
      "group-dynamic-layout"
    ) as DynamicLayout;
  }

  async openGroup(groupDnaHash: DnaHash) {
    const groupStore = await toPromise(this._weStore.groups.get(groupDnaHash));
    const myProfile = await toPromise(groupStore.profilesStore.myProfile);
    if (myProfile) {
      this.view = {
        view: "groupViews",
        selectedGroupDnaHash: groupDnaHash,
      };
    } else {
      this.createProfileInGroup.groupDnaHash = groupDnaHash;
      this.createProfileInGroup.show();
    }
  }

  renderGroupView(selectedGroupDnaHash: DnaHash | undefined) {
    return html`
      <div style="width: 100vw" class="row">
        <group-sidebar
          style="flex: 0"
          .selectedGroupDnaHash=${selectedGroupDnaHash}
          @home-selected=${() =>
            (this.view = {
              view: "groupViews",
              selectedGroupDnaHash: undefined,
            })}
          @group-selected=${(e: CustomEvent) =>
            this.openGroup(e.detail.groupDnaHash)}
          @group-created=${(e: CustomEvent) => {
            this.openGroup(e.detail.groupDnaHash);
          }}
          @applet-instance-selected=${(e: CustomEvent) => {
            this.dynamicLayout.openBlock({
              type: "component",
              componentType: "group-applet-block",
              componentState: {
                groupDnaHash: encodeHashToBase64(e.detail.groupDnaHash),
                appletInstanceHash: encodeHashToBase64(
                  e.detail.appletInstanceHash
                ),
                block: "main",
              },
            });
          }}
        ></group-sidebar>

        ${selectedGroupDnaHash
          ? html`
              <dynamic-layout
                id="group-dynamic-layout"
                .rootItemConfig=${{
                  type: "row",
                  content: [
                    {
                      type: "column",
                      content: [
                        {
                          type: "row",
                          content: [
                            {
                              type: "component",
                              title: `Invite new member`,
                              componentType: "group-invite-member",
                              componentState: {
                                groupDnaHash:
                                  encodeHashToBase64(selectedGroupDnaHash),
                              },
                            },
                            {
                              type: "component",
                              title: `Members`,
                              componentType: "group-peers-status",
                              componentState: {
                                groupDnaHash:
                                  encodeHashToBase64(selectedGroupDnaHash),
                              },
                            },
                          ],
                        },

                        {
                          type: "component",
                          componentType: "group-installable-applets",
                          title: `Installable Applets`,
                          header: {},
                          componentState: {
                            groupDnaHash:
                              encodeHashToBase64(selectedGroupDnaHash),
                          },
                        },
                      ],
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
                    {
                      type: "component",
                      title: "Join Groups",
                      componentType: "join-groups",
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
      <create-profile-in-group
        @profile-created=${() => {
          this.view = {
            view: "groupViews",
            selectedGroupDnaHash: this.createProfileInGroup.groupDnaHash,
          };
          this.createProfileInGroup.hide();
        }}
      ></create-profile-in-group>
      ${this.view.view === "groupViews"
        ? this.renderGroupView(this.view.selectedGroupDnaHash)
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
