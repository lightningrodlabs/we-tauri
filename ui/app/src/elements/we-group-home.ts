import { PeerStatusStore, peerStatusStoreContext } from "@holochain-open-dev/peer-status";
import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property } from "lit/decorators";
import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";








export class WeGroupHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @contextProvided({ context: peerStatusStoreContext, subscribe: true })
  _peerStatusStore!: PeerStatusStore;

  @property()
  weGroupId!: EntryHash;

  _info = new TaskSubscriber(
    this,
    () => this._matrixStore.fetchWeGroupInfo(this.weGroupId),
    () => [this._matrixStore]
  );


  render() {
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; margin: 24px;">
              <div class="row center-content" style="margin-top: 56px">
                <div class="column center-content">
                  ${this._info.value
                    ? html`<img
                        class="logo-large"
                        style=" width: 150px; height: 150px;"
                        src=${this._info.value.logo_src}
                      />`
                    : html``}
                  <div
                    style="font-size: 1.4em; margin-top: 30px; font-weight: bold;"
                  >
                    ${this._info.value?.name}
                  </div>
                </div>

                <invitations-block
                  style="margin-left: 50px;"
                ></invitations-block>
              </div>

              <div class="row title" style="margin-top: 80px;">
                <span style="align-self: start">Applets Library</span>
              </div>

              <hr style="width: 100%" />

              <installable-applets></installable-applets>
            </div>
          </div>
        </div>
      </div>
    `;
  }


}