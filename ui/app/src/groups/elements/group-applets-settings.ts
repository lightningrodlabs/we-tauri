import {
  asyncDeriveAndJoin,
  AsyncReadable,
  join,
  mapAndJoin,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
  toPromise,
} from "@holochain-open-dev/stores";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit-labs/context";
import { css, html, LitElement } from "lit";
import { localized, msg } from "@lit/localize";
import { DnaHash, EntryHash } from "@holochain/client";
import {
  hashState,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import {
  mdiArchiveArrowDown,
  mdiArchiveArrowUp,
  mdiExportVariant,
  mdiToyBrickPlus,
} from "@mdi/js";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/divider/divider.js";

import "./federate-applet-dialog.js";
import "./group-context.js";
import "./group-logo.js";
import "../../applets/elements/applet-logo.js";

import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import "../../elements/sidebar-button.js";
import { weStyles } from "../../shared-styles.js";
import { Applet } from "../../applets/types.js";
import { WeStore } from "../../we-store.js";
import { weStoreContext } from "../../context.js";

@localized()
@customElement("group-applets-settings")
export class GroupAppletsSettings extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _groupApplets = new StoreSubscriber(
    this,
    () =>
      join([
        asyncDeriveAndJoin(
          pipe(this._groupStore.allApplets, (allApplets) =>
            sliceAndJoin(this._groupStore.applets, allApplets)
          ),
          (applets) =>
            mapAndJoin(applets, (applet, appletHash) =>
              this._groupStore.appletFederatedGroups.get(appletHash)
            )
        ),

        pipe(this._groupStore.archivedApplets, (allApplets) =>
          sliceAndJoin(this._groupStore.applets, allApplets)
        ),
      ]) as AsyncReadable<
        [
          [
            ReadonlyMap<EntryHash, Applet>,
            ReadonlyMap<EntryHash, Array<DnaHash>>
          ],
          ReadonlyMap<EntryHash, Applet>
        ]
      >,
    () => [this._groupStore]
  );

  @state(hashState())
  appletToArchive: EntryHash | undefined;

  @state(hashState())
  appletToUnarchive: EntryHash | undefined;

  @state(hashState())
  appletToFederate: EntryHash | undefined;

  @state()
  archiving = false;

  @state()
  unarchiving = false;

  async archiveApplet(appletToArchive: EntryHash) {
    this.archiving = true;
    try {
      await this._groupStore.groupClient.archiveApplet(appletToArchive!);

      const groupsForApplet = await toPromise(
        this._weStore.groupsForApplet.get(appletToArchive)
      );
      const otherGroupsForApplet = Array.from(groupsForApplet.keys()).filter(
        (groupDnaHash) =>
          groupDnaHash.toString() !== this._groupStore.groupDnaHash.toString()
      );

      if (otherGroupsForApplet.length === 0)
        this._weStore.appletBundlesStore.disableApplet(appletToArchive);

      this.appletToArchive = undefined;
    } catch (e) {
      notifyError(msg("Error archiving the applet."));
      console.error(e);
    }

    this.archiving = false;
  }

  async unarchiveApplet(appletToUnarchive: EntryHash) {
    this.unarchiving = true;
    try {
      await this._groupStore.groupClient.unarchiveApplet(appletToUnarchive!);
      await this._groupStore.installApplet(appletToUnarchive!);

      this.appletToUnarchive = undefined;
    } catch (e) {
      notifyError(msg("Error unarchiving the applet."));
      console.error(e);
    }

    this.unarchiving = false;
  }

  renderArchiveDialog() {
    if (!this.appletToArchive) return html``;

    return html`<sl-dialog
      .label=${msg("Archive Applet")}
      open
      @sl-request-close=${(e) => {
        if (this.archiving) {
          e.preventDefault();
        }
      }}
      @sl-hide=${() => {
        this.appletToArchive = undefined;
      }}
    >
      <span>${msg("Do you want to archive this applet from this group?")}</span
      ><br /><br />
      <span
        >${msg(
          "You will be able to unarchive it in the future and no data will be lost."
        )}</span
      >
      <sl-button
        slot="footer"
        @click=${() => {
          this.appletToArchive = undefined;
        }}
        >${msg("Cancel")}</sl-button
      >
      <sl-button
        slot="footer"
        .loading=${this.archiving}
        variant="primary"
        @click=${() => this.archiveApplet(this.appletToArchive!)}
        >${msg("Archive")}</sl-button
      >
    </sl-dialog>`;
  }

  renderUnarchiveDialog() {
    if (!this.appletToUnarchive) return html``;

    return html`<sl-dialog
      .label=${msg("Unarchive Applet")}
      open
      @sl-request-close=${(e) => {
        if (this.unarchiving) {
          e.preventDefault();
        }
      }}
      @sl-hide=${() => {
        this.appletToUnarchive = undefined;
      }}
    >
      <span
        >${msg("Do you want to unarchive this applet from this group?")}</span
      ><br /><br />
      <span
        >${msg(
          "This will make the applet available again to all the members of the group."
        )}</span
      >
      <sl-button
        slot="footer"
        @click=${() => {
          this.appletToUnarchive = undefined;
        }}
        >${msg("Cancel")}</sl-button
      >
      <sl-button
        slot="footer"
        .loading=${this.unarchiving}
        variant="primary"
        @click=${() => this.unarchiveApplet(this.appletToUnarchive!)}
        >${msg("Unarchive")}</sl-button
      >
    </sl-dialog>`;
  }

  renderFederateDialog() {
    if (!this.appletToFederate) return html``;

    return html`<federate-applet-dialog
      .appletHash=${this.appletToFederate}
      @sl-hide=${() => {
        this.appletToFederate = undefined;
      }}
    ></federate-applet-dialog>`;
  }

  renderInstalledApplets(
    applets: ReadonlyMap<EntryHash, Applet>,
    federatedGroups: ReadonlyMap<EntryHash, Array<DnaHash>>
  ) {
    if (applets.size === 0)
      return html`
        <div class="row center-content" style="flex: 1">
          <span
            class="placeholder"
            style="margin: 24px; text-align: center; max-width: 600px; font-size: 20px;"
            >${msg(
              "This group doesn't have any applets installed yet. Go to the applet library (the "
            )} <sl-icon .src=${wrapPathInSvg(mdiToyBrickPlus)}></sl-icon>${msg(
              " icon in the group home view) to install applets to this group."
            )}
          </span>
        </div>
      `;

    return html`
      ${this.renderArchiveDialog()} ${this.renderFederateDialog()}
      <div class="column" style="flex: 1;">
        ${Array.from(applets.entries())
          .sort(([_, a], [__, b]) => a.custom_name.localeCompare(b.custom_name))
          .map(
            ([appletHash, applet]) =>
              html`
                <sl-card style="flex: 1; margin-bottom: 16px">
                  <div class="row" style="flex: 1; align-items: center">
                    <applet-logo
                      .appletHash=${appletHash}
                      style="margin-right: 16px"
                    ></applet-logo>
                    <span style="flex: 1">${applet.custom_name}</span>

                    ${Array.from(federatedGroups.get(appletHash)!).map(
                      (groupDnaHash) => html`
                        <group-context .groupDnaHash=${groupDnaHash}>
                          <group-logo
                            style="margin-right: 8px; --size: 32px"
                          ></group-logo
                        ></group-context>
                      `
                    )}

                    <sl-tooltip .content=${msg("Federate")}>
                      <sl-icon-button
                        .src=${wrapPathInSvg(mdiExportVariant)}
                        style="font-size: 2rem"
                        @click=${() => {
                          this.appletToFederate = appletHash;
                        }}
                      ></sl-icon-button>
                    </sl-tooltip>
                    <sl-tooltip .content=${msg("Archive")}>
                      <sl-icon-button
                        .src=${wrapPathInSvg(mdiArchiveArrowDown)}
                        style="font-size: 2rem;"
                        @click=${() => {
                          this.appletToArchive = appletHash;
                        }}
                      ></sl-icon-button>
                    </sl-tooltip>
                  </div>
                </sl-card>
              `
          )}
      </div>
    `;
  }

  renderArchivedApplets(applets: ReadonlyMap<EntryHash, Applet>) {
    if (applets.size === 0)
      return html`
        <div class="row center-content" style="flex: 1">
          <span
            class="placeholder"
            style="margin: 24px; text-align: center; max-width: 600px"
            >${msg("This group doesn't have any archived applets yet.")}
          </span>
        </div>
      `;

    return html`
      ${this.renderUnarchiveDialog()}
      <div class="column" style="flex: 1;">
        ${Array.from(applets.entries())
          .sort(([_, a], [__, b]) => a.custom_name.localeCompare(b.custom_name))
          .map(
            ([appletHash, applet]) =>
              html`
                <sl-card style="flex: 1; margin-bottom: 16px">
                  <div class="row" style="flex: 1; align-items: center">
                    <applet-logo
                      .appletHash=${appletHash}
                      style="margin-right: 16px"
                    ></applet-logo>
                    <span style="flex: 1">${applet.custom_name}</span>

                    <sl-tooltip .content=${msg("Unarchive")}>
                      <sl-icon-button
                        .src=${wrapPathInSvg(mdiArchiveArrowUp)}
                        style="font-size: 2rem;"
                        @click=${() => {
                          this.appletToUnarchive = appletHash;
                        }}
                      ></sl-icon-button>
                    </sl-tooltip>
                  </div>
                </sl-card>
              `
          )}
      </div>
    `;
  }

  render() {
    switch (this._groupApplets.value?.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px;"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._groupApplets.value.error}
        ></display-error>`;
      case "complete":
        return html`
          <div class="column" style="flex: 1">
            <span class="title" style="margin-bottom: 16px"
              >${msg("Active Applets")}</span
            >
            ${this.renderInstalledApplets(
              this._groupApplets.value.value[0][0],
              this._groupApplets.value.value[0][1]
            )}

            <sl-divider></sl-divider>

            <span class="title" style="margin-bottom: 16px"
              >${msg("Archived Applets")}</span
            >

            ${this.renderArchivedApplets(this._groupApplets.value.value[1])}
          </div>
        `;
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
