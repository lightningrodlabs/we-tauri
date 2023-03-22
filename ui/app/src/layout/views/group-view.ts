import { hashProperty } from "@holochain-open-dev/elements";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { AppAgentClient, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
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

  @property()
  view!:
    | { type: "block"; block: string }
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
        return `blocks["${this.view.block}"](${elementVar})`;
      case "entry":
        return `entries["${this.view.role}"]["${this.view.zome}"]["${this.view.entryType}"].view(window.hrl[1], window.context)(${elementVar})`;
    }
  }

  _appletClient = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupInfo,
        this.groupStore.appletClient.get(this.appletInstanceHash),
        this.groupStore.applets.get(this.appletInstanceHash),
      ]) as AsyncReadable<
        [GroupInfo, AppAgentClient, EntryRecord<AppletInstance>]
      >,
    () => [this.groupStore, this.appletInstanceHash]
  );

  renderAppletFrame([groupInfo, client, appletInstance]: [
    GroupInfo,
    AppAgentClient,
    EntryRecord<AppletInstance>
  ]) {
    const globalVars = {
      appletClient: client,
      groupInfo,
      groupServices: { profilesStore: this.groupStore.profilesStore },
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
    };
    if (this.view.type === "entry") {
      globalVars["context"] = this.view.context;
      globalVars["hrl"] = this.view.hrl;
    }
    return html`
      <view-frame
        .initFrameJs=${`function render(applet, el, vars) { applet.groupViews(vars.appletClient, vars.groupInfo, vars.groupServices, vars.openViews).${this.viewToRender(
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
        return html`<div class="row center-content">
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
