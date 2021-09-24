import { ContextProvider } from "@lit-labs/context";
import { state } from "lit/decorators.js";
import {
  WeController,
  WeStore,
  weContext,
} from "@we/elements";
import { AppWebsocket } from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html } from "lit";

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  async firstUpdated() {
    const appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`
    );
    const appInfo = await appWebsocket.appInfo({
      installed_app_id: "we",
    });

    const cellData = appInfo.cell_data[0];
    const cellClient = new HolochainClient(appWebsocket, cellData);
    const store = new WeStore()
    store.addWe("we", "https://d2r55xnwy6nx47.cloudfront.net/uploads/2018/07/Physarum_CNRS_2880x1500.jpg", cellClient)

    new ContextProvider(this, weContext, store);

    this.loaded = true;
  }

  render() {
    if (!this.loaded) return html`<span>Loading...</span>`;
    return html`
<we-controller></we-controller>
    `;
  }

  static get scopedElements() {
    return {
      "we-controller": WeController,
    };
  }
}
