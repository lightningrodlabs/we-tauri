import { PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { EntryHash } from "@holochain/client";
import { AppBlockDelegate, SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { contextProvided } from "@lit-labs/context";
import { Task } from "@lit-labs/task";
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { AppBlockRenderer } from "../components/block-renderer";

export class AppletInstanceRenderer extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @property()
  appletInstanceId!: EntryHash;

  _rendererTask = new Task(
    this,
    async () => {
      return this._matrixStore.fetchAppletInstanceRenderers(this.appletInstanceId);
    },
    () => [this._matrixStore, this.appletInstanceId]
  );

  render() {
    return this._rendererTask.render({
      pending: () => html`
        <div class="row center-content" style="flex: 1;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `,
      complete: (renderers) => {
        console.log("got renderers", renderers)
        if (renderers.appletRenderers && renderers.appletRenderers['full']) {
          const delegate: AppBlockDelegate = this._matrixStore.createAppDelegate(this.appletInstanceId)
          console.log(delegate)
          return html`<app-block-renderer .component=${renderers.appletRenderers['full']} .nhDelegate=${delegate} style="flex: 1"></app-block-renderer>`
        }
      },
    });
  }

  static get elementDefinitions() {
    return {
      "app-block-renderer": AppBlockRenderer,
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
