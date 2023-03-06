import { DisplayError, hashProperty } from "@holochain-open-dev/elements";
import {
  asyncDerived,
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
import { property, query } from "lit/decorators.js";
import { GroupInfo } from "../../../../libs/we-applet/dist/index.js";
import { groupStoreContext } from "../../groups/context.js";
import { weStyles } from "../../shared-styles.js";
import { GroupStore } from "../../we-store.js";

const importfunction = `function esm(templateStrings, ...substitutions) {
  let js = templateStrings.raw[0];
  for (let i = 0; i < substitutions.length; i++) {
    js += substitutions[i] + templateStrings.raw[i + 1];
  }
  return (
    'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(js)))
  );
}
async function importModuleFromText(text) {
  const module = await import(esm\`\${text}\`);

  return module;
}`;

export class ViewFrame extends ScopedElementsMixin(LitElement) {
  @property()
  globalVars: any;

  @property()
  appletJs!: string;

  @property()
  initFrameJs!: string;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  onLoad() {
    const iframe = this.iframe;

    if (this.globalVars) {
      for (const [key, value] of Object.entries(this.globalVars)) {
        this.iframe.contentWindow![key] = value;
      }
    }
    const js = this.appletJs;
    const scriptChild = iframe.contentDocument!.createElement("script");
    scriptChild.innerHTML =
      importfunction +
      " const js = `" +
      js +
      "`;importModuleFromText(js).then(m => { const applet = m.default;  " +
      this.initFrameJs +
      "});";
    setTimeout(() => {
      iframe.contentDocument!.body.appendChild(scriptChild);
    });
  }

  render() {
    return html`<iframe
      id="view-frame"
      @load=${() => this.onLoad()}
      style="flex: 1"
    ></iframe>`;
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

@localized()
export class GroupAppletMain extends ScopedElementsMixin(LitElement) {
  @property()
  @consume({ context: groupStoreContext, subscribe: true })
  groupStore!: GroupStore;

  @property(hashProperty("applet-instance-hash"))
  appletInstanceHash!: EntryHash;

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

  renderAppletMain([groupInfo, guiFile, client]: [
    GroupInfo,
    string,
    AppAgentClient
  ]) {
    return html`
      <view-frame
        .appletJs=${guiFile}
        .initFrameJs=${"const div = document.createElement('div'); applet.groupViews(window.appletClient, window.groupInfo, window.groupServices).main(div); document.body.appendChild(div); console.log(div.children[0]._allEvents)"}
        .globalVars=${{
          appletClient: client,
          groupInfo,
          groupServices: { profilesStore: this.groupStore.profilesStore },
        }}
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
        return this.renderAppletMain(this._appletGui.value.value);
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
