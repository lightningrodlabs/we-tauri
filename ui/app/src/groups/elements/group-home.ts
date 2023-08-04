import {
  notify,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ActionHash, EntryHash } from "@holochain/client";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { mdiArrowLeft, mdiCog, mdiToyBrickPlus } from "@mdi/js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";

import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";

import "./group-peers-status.js";
import "./related-groups.js";
import "./add-related-group-dialog.js";
import "./installable-applets.js";
import "./group-applets.js";
import "./group-applets-settings.js";
import "./your-settings.js";
import "../../custom-views/elements/all-custom-views.js";
import "./create-custom-group-view.js";
import "./edit-custom-group-view.js";
import "../../applet-bundles/elements/publish-applet-button.js";
import "../../elements/tab-group.js";
import { AddRelatedGroupDialog } from "./add-related-group-dialog.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { weStyles } from "../../shared-styles.js";

type View =
  | {
      view: "main";
    }
  | { view: "applets-library" }
  | { view: "settings" }
  | { view: "create-custom-view" }
  | {
      view: "edit-custom-view";
      customViewHash: ActionHash;
    };

@localized()
@customElement("group-home")
export class GroupHome extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @state()
  view: View = { view: "main" };

  groupProfile = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupProfile,
        this.groupStore.networkSeed,
      ]) as AsyncReadable<[GroupProfile | undefined, string]>,
    () => [this.groupStore, this.weStore]
  );

  renderMain(groupProfile: GroupProfile, networkSeed: string) {
    return html`
      <div class="row" style="flex: 1">
        <div class="column" style="flex: 1; margin: 16px;">
          <div class="row" style="align-items: center; margin-bottom: 24px">
            <div class="row" style="align-items: center; flex: 1;">
              <img
                .src=${groupProfile.logo_src}
                style="height: 64px; width: 64px; margin-right: 16px; border-radius: 50%"
                alt="${groupProfile.name}"
              />
              <span class="title">${groupProfile.name}</span>
            </div>

            <sl-icon-button
              .src=${wrapPathInSvg(mdiToyBrickPlus)}
              @click=${() => {
                this.view = { view: "applets-library" };
              }}
              style="font-size: 2rem;"
            ></sl-icon-button>

            <sl-icon-button
              .src=${wrapPathInSvg(mdiCog)}
              @click=${() => {
                this.view = { view: "settings" };
              }}
              style="font-size: 2rem;"
            ></sl-icon-button>
          </div>

          <div class="row">
            <div class="column" style="flex: 1; margin-right: 16px">
              <span class="title">${msg("Installed Applets")}</span>
              <sl-divider style="--color: grey"></sl-divider>
              <group-applets style="flex: 1; margin: 10px;"></group-applets>
            </div>

            <related-groups></related-groups>
          </div>
        </div>

        <div
          class="column"
          style="width: 260px; padding: 16px; background-color: var(--sl-color-primary-100)"
        >
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <group-peers-status></group-peers-status>
              </div>
            </div>
          </div>

          <sl-dialog
            id="invite-member-dialog"
            .label=${msg("Invite New Member")}
          >
            <div class="column">
              <span
                >${msg(
                  "To invite other people to join this group, send them this link:"
                )}</span
              >

              <div class="row" style="margin-top: 16px">
                <sl-input
                  value="https://lightningrodlabs.org/we?we://group/${networkSeed}"
                  style="margin-right: 8px; flex: 1"
                >
                </sl-input>
                <sl-button
                  variant="primary"
                  @click=${async () => {
                    await navigator.clipboard.writeText(
                      `https://lightningrodlabs.org/we?we://group/${networkSeed}`
                    );
                    notify(msg("Invite link copied to clipboard."));
                  }}
                  >${msg("Copy")}</sl-button
                >
              </div>
            </div>
          </sl-dialog>

          <sl-button
            variant="primary"
            @click=${() => {
              (
                this.shadowRoot?.getElementById(
                  "invite-member-dialog"
                ) as SlDialog
              ).show();
            }}
            >${msg("Invite")}</sl-button
          >
        </div>
      </div>
    `;
  }

  renderSettings() {
    return html`
      <div class="column" style="margin: 16px; flex: 1">
        <div class="row" style="margin-bottom: 16px; align-items: center">
          <sl-icon-button
            .src=${wrapPathInSvg(mdiArrowLeft)}
            @click=${() => {
              this.view = { view: "main" };
            }}
            style="margin-right: 16px; font-size: 1rem"
          ></sl-icon-button>
          <span class="title">${msg("Group Settings")}</span>
        </div>

        <sl-tab-group placement="start" style="flex: 1">
          <sl-tab slot="nav" panel="applets">${msg("Applets")}</sl-tab>
          <sl-tab slot="nav" panel="custom-views"
            >${msg("Custom Views")}</sl-tab
          >
          <sl-tab slot="nav" panel="related-groups"
            >${msg("Related Groups")}</sl-tab
          >
          <sl-tab slot="nav" panel="your-settings"
            >${msg("Your Settings")}</sl-tab
          >
          <sl-tab-panel name="applets" style="display: flex; flex: 1;"
            ><group-applets-settings></group-applets-settings>
          </sl-tab-panel>
          <sl-tab-panel name="custom-views">
            <div class="column">
              <span class="placeholder"
                >${msg(
                  "You can add custom views to this group, combining the relevant blocks from each applet."
                )}</span
              >
              <all-custom-views
                style="margin-top: 8px"
                @edit-custom-view=${(e) => {
                  this.view = {
                    view: "edit-custom-view",
                    customViewHash: e.detail.customViewHash,
                  };
                }}
              ></all-custom-views>
              <div class="row" style="flex: 1">
                <span style="flex: 1"></span>
                <sl-button
                  variant="primary"
                  @click=${() => {
                    this.view = { view: "create-custom-view" };
                  }}
                  >${msg("Create Custom View")}</sl-button
                >
              </div>
            </div>
          </sl-tab-panel>
          <sl-tab-panel name="related-groups">
            <add-related-group-dialog
              id="add-related-group-dialog"
            ></add-related-group-dialog>
            <div class="column">
              <span style="margin-bottom: 8px" class="placeholder"
                >${msg(
                  "You can add related groups to this group so that members of this group can see and join the related groups."
                )}</span
              >
              <related-groups></related-groups>
              <div class="row">
                <span style="flex: 1"></span>
                <sl-button
                  variant="primary"
                  @click=${() => {
                    (
                      this.shadowRoot?.getElementById(
                        "add-related-group-dialog"
                      ) as AddRelatedGroupDialog
                    ).show();
                  }}
                  >${msg("Add a related group")}</sl-button
                >
              </div>
            </div>
          </sl-tab-panel>
          <sl-tab-panel name="your-settings">
            <your-settings></your-settings>
          </sl-tab-panel>
        </sl-tab-group>
      </div>
    `;
  }

  renderCreateCustomView() {
    return html`<div class="column" style="flex: 1">
      <create-custom-group-view
        style="flex: 1"
        @create-cancelled=${() => {
          this.view = { view: "main" };
        }}
        @custom-view-created=${() => {
          this.view = { view: "main" };
        }}
      ></create-custom-group-view>
    </div>`;
  }

  renderEditCustomView(customViewHash: EntryHash) {
    return html`<div class="column" style="flex: 1">
      <edit-custom-group-view
        .customViewHash=${customViewHash}
        style="flex: 1"
        @edit-cancelled=${() => {
          this.view = { view: "main" };
        }}
        @custom-view-updated=${() => {
          this.view = { view: "main" };
        }}
      ></edit-custom-group-view>
    </div>`;
  }

  renderNewSettings() {
    const tabs = [
      ["Applets", html`<group-applets-settings style="display: flex; flex: 1;"></group-applets-settings>`],
      ["Custom Views", html`
        <div class="column">
          <span class="placeholder"
            >${msg(
              "You can add custom views to this group, combining the relevant blocks from each applet."
            )}</span
          >
          <all-custom-views
            style="margin-top: 8px"
            @edit-custom-view=${(e) => {
              this.view = {
                view: "edit-custom-view",
                customViewHash: e.detail.customViewHash,
              };
            }}
          ></all-custom-views>
          <div class="row" style="flex: 1">
            <span style="flex: 1"></span>
            <sl-button
              variant="primary"
              @click=${() => {
                this.view = { view: "create-custom-view" };
              }}
              >${msg("Create Custom View")}</sl-button
            >
          </div>
        </div>
      `],
      ["Related Groups", html`
        <add-related-group-dialog
          id="add-related-group-dialog"
        ></add-related-group-dialog>
        <div class="column">
          <span style="margin-bottom: 8px" class="placeholder"
            >${msg(
              "You can add related groups to this group so that members of this group can see and join the related groups."
            )}</span
          >
          <related-groups></related-groups>
          <div class="row">
            <span style="flex: 1"></span>
            <sl-button
              variant="primary"
              @click=${() => {
                (
                  this.shadowRoot?.getElementById(
                    "add-related-group-dialog"
                  ) as AddRelatedGroupDialog
                ).show();
              }}
              >${msg("Add a related group")}</sl-button
            >
          </div>
        </div>
      `],
      ["Your Settings", html`<your-settings></your-settings>`]
    ];

    return html`
      <div class="column" style="flex: 1; position: relative;">
        <div class="row" style="height: 68px; align-items: center; background: var(--sl-color-primary-200)">
          <sl-icon-button
            .src=${wrapPathInSvg(mdiArrowLeft)}
            @click=${() => {
              this.view = { view: "main" };
            }}
            style="margin-left: 20px; font-size: 30px;"
          ></sl-icon-button>
          <span style="display: flex; flex: 1;"></span>
          <span class="title" style="margin-right: 20px; font-weight: bold;">${msg("Group Settings")}</span>
        </div>

        <tab-group .tabs=${tabs} style="display: flex; flex: 1;">
        <tab-group>
      </div>
    `
  }

  renderContent(groupProfile: GroupProfile, networkSeed: string) {
    switch (this.view.view) {
      case "main":
        return this.renderMain(groupProfile, networkSeed);
      case "applets-library":
        return html`
          <div class="column" style="margin: 16px; flex: 1">
            <div class="row" style="margin-bottom: 16px; align-items: center">
              <sl-icon-button
                .src=${wrapPathInSvg(mdiArrowLeft)}
                @click=${() => {
                  this.view = { view: "main" };
                }}
                style="margin-right: 16px"
              ></sl-icon-button>
              <span class="title" style="flex: 1"
                >${msg("Applets Library")}</span
              >
              <publish-applet-button></publish-applet-button>
            </div>

            <installable-applets
              style="display: flex; flex: 1; overflow-y: auto;"
              @applet-installed=${() => {
                this.view = { view: "main" };
              }}
            ></installable-applets>
          </div>
        `;
      case "settings":
        return this.renderNewSettings();
      case "create-custom-view":
        return this.renderCreateCustomView();
      case "edit-custom-view":
        return this.renderEditCustomView(this.view.customViewHash);
    }
  }

  render() {
    switch (this.groupProfile.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        const groupProfile = this.groupProfile.value.value[0];
        const networkSeed = this.groupProfile.value.value[1];

        console.log("Rendering group home for group with profile: ", groupProfile);

        if (!groupProfile)
          return html`<div class="column center-content" style="flex: 1">
            <h2>${msg("Out of sync")}</h2>
            <span style="max-width: 600px; text-align: center"
              >${msg(
                "Ask one of the members of this group to launch We so that you can synchronize with this group."
              )}</span
            >
          </div>`;

        return html`
          <profile-prompt
            ><span
              slot="hero"
              style="max-width: 500px; margin-bottom: 32px"
              class="placeholder"
              >${msg(
                "Create your personal profile for this group. Only members of this group will be able to see your profile."
              )}</span
            >
            ${this.renderContent(groupProfile, networkSeed)}
          </profile-prompt>
        `;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the group information")}
          .error=${this.groupProfile.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
      }
      sl-tab-panel::part(base) {
        width: 600px;
      }
      sl-tab-panel[active] {
        display: flex;
        justify-content: center;
      }
      .title {
        font-size: 25px;
      }
    `,
  ];
}
