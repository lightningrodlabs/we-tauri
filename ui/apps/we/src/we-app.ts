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
import { LitElement, html, css } from "lit";

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
    const id = "Slimers"
    store.addWe(id, "https://d2r55xnwy6nx47.cloudfront.net/uploads/2018/07/Physarum_CNRS_2880x1500.jpg", cellClient)

    await store.addGame(id, {
      name: "profiles",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
      meta: {},
    });
    await store.addGame(id, {
      name: "chat",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://w7.pngwing.com/pngs/952/46/png-transparent-text-bubble-brand-logo-blue-font-chat-icon-angle-text-rectangle-thumbnail.png",
      meta: {},
    });

    await store.updateGames(id)

    store.addWe("Fish!", "https://www.publicdomainpictures.net/pictures/260000/velka/school-of-fish-1527727063xgZ.jpg", cellClient)


    new ContextProvider(this, weContext, store);

    this.loaded = true;
  }

  render() {
    if (!this.loaded) return html`<span>Loading...</span>`;
    return html`
<we-controller .selected="Slimers"></we-controller>
    `;
  }

  static get scopedElements() {
    return {
      "we-controller": WeController,
    };
  }
  static get styles() {
    return [
      css` :host {
          margin: 0px;
        }`
    ]
  }
}
