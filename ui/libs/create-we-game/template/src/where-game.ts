import { ContextProvider } from "@holochain-open-dev/context";
import { property, state } from "lit/decorators.js";
import {
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import { InstalledCell } from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { LitElement, html } from "lit";

export class WhereGame extends ScopedElementsMixin(LitElement) {
  @property()
  client!: HolochainClient;

  @property()
  profilesStore!: ProfilesStore;

  @property()
  cellData!: InstalledCell;

  @state()
  loaded = false;

  async firstUpdated() {
    await this.profilesStore.fetchAllProfiles();

    new ContextProvider(this, profilesStoreContext, this.profilesStore);

    // TODO: Initialize any store that you have and create a ContextProvider for it
    //
    // eg:
    // new ContextProvider(this, whereContext, new WhereStore(cellClient, store));

    this.loaded = true;
  }

  render() {
    if (!this.loaded)
      return html`<div
        style="display: flex; flex: 1; flex-direction: row; align-items: center; justify-content: center"
      >
        <mwc-circular-progress></mwc-circular-progress>
      </div>`;

    // TODO: add any elements that you have in your game
    return html``;
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      // TODO: add any elements that you have in your game
    };
  }
}
