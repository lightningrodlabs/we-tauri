import { css, html, LitElement, PropertyValues } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { consume, ContextProvider, provide } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { StoreSubscriber, Unsubscriber } from "@holochain-open-dev/stores";
import {
  PeerStatusStore,
  peerStatusStoreContext,
} from "@holochain-open-dev/peer-status";
import {
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import { DnaHash } from "@holochain/client";

import { WeStore } from "../../we-store.js";
import { groupStoreContext, weStoreContext } from "../../context.js";
import { GroupStore } from "../group-store.js";

export class GroupContext extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext, subscribe: true })
  @state()
  weStore!: WeStore;

  @property()
  groupDnaHash!: DnaHash;

  @provide({ context: groupStoreContext })
  groupStore!: GroupStore;

  @provide({ context: profilesStoreContext })
  profilesStore!: ProfilesStore;

  @provide({ context: peerStatusStoreContext })
  peerStatusStore!: PeerStatusStore;

  unsubscribe: Unsubscriber | undefined;

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    if (changedValues.has("groupDnaHash")) {
      if (this.unsubscribe) this.unsubscribe();

      this.unsubscribe = this.weStore.groups
        .get(this.groupDnaHash)
        .subscribe((v) => {
          if (v.status === "complete") {
            this.groupStore = v.value;
            this.profilesStore = v.value.profilesStore;
            this.peerStatusStore = v.value.peerStatusStore;
          }
        });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
