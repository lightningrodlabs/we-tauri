import { DisplayError, hashProperty } from "@holochain-open-dev/elements";
import {
  ListAgentsByStatus,
  PeerStatusContext,
} from "@holochain-open-dev/peer-status";
import { ProfilesContext } from "@holochain-open-dev/profiles";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { AgentPubKey, DnaHash } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { groupStoreContext } from "../context.js";
import { weStyles } from "../../shared-styles.js";
import { GenericGroupStore } from "../group-store.js";

@localized()
export class GroupPeersStatus extends ScopedElementsMixin(LitElement) {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GenericGroupStore<any>;

  @property(hashProperty("group-dna-hash"))
  groupDnaHash!: DnaHash;

  _group = new StoreSubscriber(this, () => this._groupStore?.members);

  renderPeersStatus(members: AgentPubKey[]) {
    return html`
      <list-agents-by-status .agents=${members}></list-agents-by-status>
    `;
  }

  render() {
    switch (this._group.value?.status) {
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
      // "profiles-context": ProfilesContext,
      "list-agents-by-status": ListAgentsByStatus,
      "peer-status-context": PeerStatusContext,
    };
  }

  static styles = weStyles;
}
