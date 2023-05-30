import {
  notify,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ActionHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { mdiArrowLeft, mdiCog, mdiToyBrickPlus } from "@mdi/js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog";

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
import "./federated-groups.js";
import "./federate-group-dialog.js";
import "./installable-applets.js";
import "./group-applets.js";
import "./group-applets-settings.js";
import "./your-settings.js";
import "../../custom-views/elements/all-custom-views.js";
import "./create-custom-group-view.js";
import "./edit-custom-group-view.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { openDevhub } from "../../tauri.js";
import { FederateGroupDialog } from "./federate-group-dialog.js";

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
        this.weStore.originalGroupDnaHash,
        this.groupStore.networkSeed,
      ]) as AsyncReadable<[GroupProfile | undefined, DnaHash, string]>,
    () => [this.groupStore, this.weStore]
  );

  renderMain(
    groupProfile: GroupProfile,
    originalGroupDnaHash: DnaHash,
    networkSeed: string
  ) {
    return html`
      <div class="row" style="flex: 1">
        <div class="column" style="flex: 1; margin: 16px">
          <div class="row" style="align-items: center; margin-bottom: 24px">
            <div class="row" style="align-items: center; flex: 1;">
              <img
                .src=${groupProfile.logo_src}
                style="height: 64px; width: 64px; margin-right: 16px; border-radius: 50%"
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
              <span class="title">${msg("Applets")}</span>
              <sl-divider style="--color: grey"></sl-divider>
              <group-applets style="margin-top: 16px; flex: 1"></group-applets>
            </div>

            <federated-groups></federated-groups>
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
                  value="https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
                    originalGroupDnaHash
                  )}/${networkSeed}"
                  style="margin-right: 8px; flex: 1"
                >
                </sl-input>
                <sl-button
                  variant="primary"
                  @click=${async () => {
                    await navigator.clipboard.writeText(
                      `https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
                        originalGroupDnaHash
                      )}/${networkSeed}`
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
          <sl-tab slot="nav" panel="federated-groups"
            >${msg("Federated Groups")}</sl-tab
          >
          <sl-tab slot="nav" panel="your-settings"
            >${msg("Your Settings")}</sl-tab
          >
          <sl-tab-panel name="applets"
            ><group-applets-settings></group-applets-settings>
          </sl-tab-panel>
          <sl-tab-panel name="custom-views">
            <all-custom-views
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
                @click=${() => (this.view = { view: "create-custom-view" })}
                >${msg("Create Custom View")}</sl-button
              >
            </div>
          </sl-tab-panel>
          <sl-tab-panel name="federated-groups">
            <federate-group-dialog
              id="federate-group-dialog"
            ></federate-group-dialog>
            <federated-groups></federated-groups>
            <div class="row">
              <span style="flex: 1"></span>
              <sl-button
                @click=${() => {
                  (
                    this.shadowRoot?.getElementById(
                      "federate-group-dialog"
                    ) as FederateGroupDialog
                  ).show();
                }}
                >${msg("Federate this group")}</sl-button
              >
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
        @create-cancelled=${() => (this.view = { view: "main" })}
        @custom-view-created=${() => (this.view = { view: "main" })}
      ></create-custom-group-view>
    </div>`;
  }

  renderEditCustomView(customViewHash: EntryHash) {
    return html`<div class="column" style="flex: 1">
      <edit-custom-group-view
        .customViewHash=${customViewHash}
        style="flex: 1"
        @edit-cancelled=${() => (this.view = { view: "main" })}
        @custom-view-updated=${() => (this.view = { view: "main" })}
      ></edit-custom-group-view>
    </div>`;
  }

  renderContent(
    groupProfile: GroupProfile,
    originalGroupDnaHash: DnaHash,
    networkSeed: string
  ) {
    switch (this.view.view) {
      case "main":
        return this.renderMain(groupProfile, originalGroupDnaHash, networkSeed);
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
              <sl-button @click=${() => openDevhub()}
                >${msg("Publish an applet")}</sl-button
              >
            </div>

            <installable-applets
              @applet-installed=${() => {
                this.view = { view: "main" };
              }}
            ></installable-applets>
          </div>
        `;
      case "settings":
        return this.renderSettings();
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
        const originalGroupDnaHash = this.groupProfile.value.value[1];
        const networkSeed = this.groupProfile.value.value[2];

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
          <profile-prompt>
            ${this.renderContent(
              groupProfile,
              originalGroupDnaHash,
              networkSeed
            )}
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
    sharedStyles,
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
    `,
  ];
}
