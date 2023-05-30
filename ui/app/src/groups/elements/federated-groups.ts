import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { localized, msg } from "@lit/localize";
import { DnaHash } from "@holochain/client";
import { CloneDnaRecipe } from "@holochain-open-dev/membrane-invitations";
import { mapValues } from "@holochain-open-dev/utils";
import { GroupProfile } from "@lightningrodlabs/we-applet";
import { decode } from "@msgpack/msgpack";
import { consume } from "@lit-labs/context";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import { groupStoreContext } from "../context";
import { GroupStore } from "../group-store";
import { weStyles } from "../../shared-styles";

@localized()
@customElement("federated-groups")
export class FederatedGroups extends LitElement {
  @consume({ context: groupStoreContext, subscribe: true })
  _groupStore!: GroupStore;

  _federatedGroups = new StoreSubscriber(
    this,
    () => this._groupStore.federatedGroups,
    () => [this._groupStore]
  );

  renderGroups(federatedGroups: ReadonlyMap<DnaHash, CloneDnaRecipe>) {
    if (federatedGroups.size === 0) return html``;

    const groupsProfiles = mapValues(
      federatedGroups,
      (recipe) => decode(recipe.custom_content) as GroupProfile
    );

    return html` <div class="column" style="flex: 1">
      <div class="row" style="align-items: center">
        <span class="title" style="flex: 1">${msg("Federated Groups")}</span>
      </div>
      <sl-divider style="--color: grey"></sl-divider>
      <div class="row">
        ${Array.from(groupsProfiles.entries()).map(
          ([groupDnaHash, groupProfile]) => html` <div
            class="column"
            style="align-items: center; cursor: pointer"
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent("open-group", {
                  bubbles: true,
                  composed: true,
                  detail: {
                    originalGroupDnaHash:
                      federatedGroups.get(groupDnaHash)?.original_dna_hash,
                    networkSeed:
                      federatedGroups.get(groupDnaHash)?.network_seed,
                  },
                })
              )}
          >
            <img
              src="${groupProfile.logo_src}"
              style="width: 64px; height: 64px; border-radius: 50%; margin-bottom: 8px"
            /><span>${groupProfile.name}</span>
          </div>`
        )}
      </div>
    </div>`;
  }

  render() {
    switch (this._federatedGroups.value?.status) {
      case "pending":
        return html`<sl-skeleton
          style="height: 48px; width: 48px;"
        ></sl-skeleton>`;
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the applets installed in this group")}
          .error=${this._federatedGroups.value.error}
        ></display-error>`;
      case "complete":
        return this.renderGroups(this._federatedGroups.value.value);
    }
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: contents;
      }
    `,
  ];
}
