import { PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { Task } from "@lit-labs/task";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { RenderBlock } from "./render-block";


const sleep = (ms: number) => new Promise((r) => setTimeout(() => r(null), ms));


export class AppletInstanceRenderer extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @property()
  appletInstanceId!: EntryHash;


  _rendererTask = new Task(
    this,
    async () => {
      await sleep(1);
      return this._matrixStore.fetchAppletInstanceRenderers(this.appletInstanceId, {
        profilesStore: this._profilesStore,
      });
    },
    () => [this._matrixStore, this.appletInstanceId]
  );


  render() {
    return this._rendererTask.render({
      pending: () => html`
        <div class="center-content">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `,
      complete: (renderer) =>
        html`
          <render-block
            .renderer=${renderer.full}
            style="flex: 1"
          ></render-block>
        `,
    });
  }


  static get scopedElements() {
    return {
      "render-block": RenderBlock,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }
    `,
  ];


}