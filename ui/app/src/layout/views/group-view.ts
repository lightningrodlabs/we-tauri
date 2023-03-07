import { DisplayError, hashProperty } from "@holochain-open-dev/elements";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { AppAgentClient, EntryHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { GroupInfo, Hrl } from "@lightningrodlabs/we-applet";

import { groupStoreContext } from "../../groups/context.js";
import { weStyles } from "../../shared-styles.js";
import { GroupStore } from "../../we-store.js";
import { ViewFrame } from "./view-frame.js";

@localized()
export class GroupView extends ScopedElementsMixin(LitElement) {
  @property()
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

  @property()
  view!:
    | { type: "main" }
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
      case "main":
        return `main(${elementVar})`;
      case "block":
        return `blocks[${this.view.block}](${elementVar})`;
      case "entry":
        return `entries[${this.view.role}][${this.view.zome}][${this.view.entryType}](${elementVar}, window.hrl[1], window.context)`;
    }
  }

  _appletGui = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.groupInfo,
        this.groupStore.appletsGuis.get(this.appletInstanceHash),
        this.groupStore.appletClient.get(this.appletInstanceHash),
      ]) as AsyncReadable<[GroupInfo, string, AppAgentClient]>,
    () => [this.groupStore, this.appletInstanceHash]
  );

  renderAppletFrame([groupInfo, guiFile, client]: [
    GroupInfo,
    string,
    AppAgentClient
  ]) {
    const globalVars = {
      appletClient: client,
      groupInfo,
      groupServices: { profilesStore: this.groupStore.profilesStore },
    };
    if (this.view.type === "entry") {
      globalVars["context"] = this.view.context;
      globalVars["hrl"] = this.view.hrl;
    }
    return html`
      <view-frame
        .appletJs=${guiFile}
        .initFrameJs=${`function render(applet, el, vars) { applet.groupViews(vars.appletClient, vars.groupInfo, vars.groupServices).${this.viewToRender(
          "el"
        )}; }`}
        .globalVars=${globalVars}
        style="flex: 1"
      ></view-frame>
    `;
  }
  render() {
    switch (this._appletGui.value?.status) {
      case "pending":
        return html`<div class="row center-content">
          <mwc-circular-progress></mwc-circular-progress>
        </div>`;
      case "error":
        return html`<display-error
          tooltip
          .error=${this._appletGui.value.error.data.data}
        ></display-error>`;
      case "complete":
        return this.renderAppletFrame(this._appletGui.value.value);
    }
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "display-error": DisplayError,
      "view-frame": ViewFrame,
    };
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
