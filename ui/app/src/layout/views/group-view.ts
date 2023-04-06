import {
  hashProperty,
  notifyError,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { AppAgentClient, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { GroupInfo, Hrl, OpenViews } from "@lightningrodlabs/we-applet";
import { EntryRecord } from "@holochain-open-dev/utils";

import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
import "@holochain-open-dev/elements/elements/display-error.js";

import { groupStoreContext } from "../../groups/context.js";
import { weStyles } from "../../shared-styles.js";
import "./view-frame.js";
import { AppletInstance } from "../../groups/types.js";
import { AppOpenViews } from "../types.js";
import { openViewsContext } from "../context.js";
import { GroupStore } from "../../groups/group-store.js";
import { mdiInformationOutline } from "@mdi/js";

@localized()
@customElement("group-view")
export class GroupView extends LitElement {
  @property()
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  @consume({ context: openViewsContext, subscribe: true })
  openViews!: AppOpenViews;

  @state()
  installing = false;

  @property()
  view!:
    | { type: "block"; block: string; context: any }
    | {
        type: "entry";
        role: string;
        zome: string;
        entryType: string;
        hrl: Hrl;
        context: any;
      };

  viewToRender(elementVar: string) {
    switch (this.view.type) {
      case "block":
        return `blocks["${this.view.block}"](${elementVar}, window.context)`;
      case "entry":
        return `entries["${this.view.role}"]["${this.view.zome}"]["${this.view.entryType}"].view(${elementVar}, window.hrl[1], window.context)`;
    }
  }

  _appletClient = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupInfo,
        this.groupStore.appletClient.get(this.appletInstanceHash),
        this.groupStore.applets.get(this.appletInstanceHash),
        this.groupStore.isInstalled.get(this.appletInstanceHash),
      ]) as AsyncReadable<
        [GroupInfo, AppAgentClient, EntryRecord<AppletInstance>, boolean]
      >,
    () => [this.groupStore, this.appletInstanceHash]
  );

  renderAppletFrame([groupInfo, client, appletInstance, isInstalled]: [
    GroupInfo,
    AppAgentClient,
    EntryRecord<AppletInstance>,
    boolean
  ]) {
    if (!isInstalled) {
      return html`
        <div class="row center-content" style="flex: 1">
          <sl-card
            ><div class="column center-content">
              <sl-icon
                .src=${wrapPathInSvg(mdiInformationOutline)}
                style="font-size: 64px; margin-bottom: 16px"
              ></sl-icon>
              <span style="margin-bottom: 4px"
                >${msg("You don't have this applet installed yet.")}</span
              >
              <span style="margin-bottom: 16px"
                >${msg("Install it if you want to see this view.")}</span
              >
              <sl-button
                variant="primary"
                .loading=${this.installing}
                @click=${async () => {
                  this.installing = true;
                  try {
                    await this.groupStore.installAppletInstance(
                      this.appletInstanceHash
                    );
                    await this.groupStore.installedApps.reload();
                  } catch (e) {
                    notifyError(msg("Couldn't install applet"));
                    console.error(e);
                  }
                  this.installing = false;
                }}
                >${msg("Install Applet")}</sl-button
              >
            </div></sl-card
          >
        </div>
      `;
    }

    const globalVars = {
      appletClient: client,
      groupInfo,
      context: this.view.context,
      groupServices: { profilesStore: this.groupStore.profilesStore },
      weServices: {
        openViews: {
          openHrl: (hrl: Hrl, context: any) => {
            this.openViews.openHrl(hrl, context);
          },
          openGroupBlock: (block: string) =>
            this.openViews.openGroupBlock(
              this.groupStore.groupDnaHash,
              this.appletInstanceHash,
              block
            ),
          openCrossGroupBlock: (block: string) =>
            this.openViews.openCrossGroupBlock(
              appletInstance.entry.devhub_happ_release_hash,
              block
            ),
        } as OpenViews,
      },
    };
    if (this.view.type === "entry") {
      globalVars["hrl"] = this.view.hrl;
    }
    return html`
      <view-frame
        .initFrameJs=${`function render(applet, el, vars) { applet.groupViews(vars.appletClient, vars.groupInfo, vars.groupServices, vars.weServices).${this.viewToRender(
          "el"
        )}; }`}
        .appletId=${this.groupStore.appletAppIdFromAppletInstance(
          appletInstance.entry
        )}
        .globalVars=${globalVars}
        style="flex: 1"
      ></view-frame>
    `;
  }
  render() {
    switch (this._appletClient.value?.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "error":
        return html`<display-error
          tooltip
          .headline=${msg("Error initializing the client for this group")}
          .error=${this._appletClient.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderAppletFrame(this._appletClient.value.value);
    }
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
