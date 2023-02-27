import { DisplayError, hashProperty } from "@holochain-open-dev/elements";
import {
  ListAgentsByStatus,
  PeerStatusContext,
} from "@holochain-open-dev/peer-status";
import { ProfilesContext } from "@holochain-open-dev/profiles";
import {
  asyncDerived,
  asyncDeriveStore,
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { AgentPubKey, DnaHash, encodeHashToBase64 } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";

import { weStoreContext } from "../context.js";
import { GroupStore } from "../groups/group-store.js";
import { weStyles } from "../shared-styles.js";
import { WeStore } from "../we-store.js";

@localized()
export class GroupPeersStatus extends ScopedElementsMixin(LitElement) {
  @consume({ context: weStoreContext, subscribe: true })
  _weStore!: WeStore;

  @property(hashProperty("group-dna-hash"))
  groupDnaHash!: DnaHash;

  _group = new StoreSubscriber(
    this,
    () =>
      join([
        this._weStore.groups.get(this.groupDnaHash),
        asyncDeriveStore(
          this._weStore.groups.get(this.groupDnaHash),
          (groupStore) => groupStore.members
        ),
      ]) as AsyncReadable<[GroupStore, Array<AgentPubKey>]>
  );

  renderPeersStatus([groupStore, members]: [GroupStore, AgentPubKey[]]) {
    return html` <profiles-context .store=${groupStore.profilesStore}>
      <peer-status-context .store=${groupStore.peerStatusStore}>
        <list-agents-by-status
          .agents=${members}
        ></list-agents-by-status> </peer-status-context
    ></profiles-context>`;
  }

  render() {
    switch (this._group.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1;">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        return this.renderPeersStatus(this._group.value.value);
      case "error":
        return html`<display-error
          .headline=${msg("Error displaying the peers of the group")}
          .error=${this._group.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      "display-error": DisplayError,
      "profiles-context": ProfilesContext,
      "list-agents-by-status": ListAgentsByStatus,
      "peer-status-context": PeerStatusContext,
    };
  }

  static styles = weStyles;
}
