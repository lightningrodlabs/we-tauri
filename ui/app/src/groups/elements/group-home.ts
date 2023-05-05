import { sharedStyles, wrapPathInSvg } from "@holochain-open-dev/elements";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { encodeHashToBase64 } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { consume } from "@lit-labs/context";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/tab-group/tab-group.js";
import "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js";
import "@shoelace-style/shoelace/dist/components/tab/tab.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "./group-peers-status.js";
import "./installable-applets.js";
import "./group-applets.js";
import "./group-applets-settings.js";
import "./your-settings.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";
import { mdiArrowLeft, mdiCog, mdiToyBrickPlus } from "@mdi/js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog";

type View = "main" | "applets-library" | "settings";

@localized()
@customElement("group-home")
export class GroupHome extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @state()
  view: View = "main";

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
    originalGroupDnaHash,
    networkSeed: string
  ) {
    return html`
      <div class="row" style="flex: 1">
        <div class="column" style="flex: 1; margin: 16px">
          <div class="row" style="align-items: center; margin-bottom: 16px">
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
                this.view = "applets-library";
              }}
              style="font-size: 2rem;"
            ></sl-icon-button>

            <sl-icon-button
              .src=${wrapPathInSvg(mdiCog)}
              @click=${() => {
                this.view = "settings";
              }}
              style="font-size: 2rem;"
            ></sl-icon-button>
          </div>

          <div class="column">
            <span class="title">${msg("Applets")}</span>
            <group-applets style="margin-top: 16px;"></group-applets>
          </div>
        </div>

        <div
          class="column"
          style="background-color: var(--sl-color-primary-300); padding: 16px"
        >
          <group-peers-status style="flex: 1"></group-peers-status>

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

              <a
                style="pointer-events: none"
                href="https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
                  originalGroupDnaHash
                )}/${networkSeed}"
                >https://lightningrodlabs.org/we?we://group/${encodeHashToBase64(
                  originalGroupDnaHash
                )}/${networkSeed}</a
              >
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
              this.view = "main";
            }}
            style="margin-right: 16px"
          ></sl-icon-button>
          <span class="title">${msg("Group Settings")}</span>
        </div>

        <sl-tab-group placement="start" style="flex: 1">
          <sl-tab slot="nav" panel="applets">${msg("Applets")}</sl-tab>
          <sl-tab slot="nav" panel="your-settings"
            >${msg("Your Settings")}</sl-tab
          >
          <sl-tab-panel name="applets"
            ><group-applets-settings></group-applets-settings>
          </sl-tab-panel>
          <sl-tab-panel name="your-settings">
            <your-settings></your-settings>
          </sl-tab-panel>
        </sl-tab-group>
      </div>
    `;
  }

  renderContent(
    groupProfile: GroupProfile,
    originalGroupDnaHash: DnaHash,
    networkSeed: string
  ) {
    switch (this.view) {
      case "main":
        return this.renderMain(groupProfile, originalGroupDnaHash, networkSeed);
      case "applets-library":
        return html`
          <div class="column" style="margin: 16px; flex: 1">
            <div class="row" style="margin-bottom: 16px; align-items: center">
              <sl-icon-button
                .src=${wrapPathInSvg(mdiArrowLeft)}
                @click=${() => {
                  this.view = "main";
                }}
                style="margin-right: 16px"
              ></sl-icon-button>
              <span class="title">${msg("Applets Library")}</span>
            </div>

            <installable-applets></installable-applets>
          </div>
        `;
      case "settings":
        return this.renderSettings();
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
            <span
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
          .error=${this.groupProfile.value.error.data.data}
        ></display-error>`;
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
