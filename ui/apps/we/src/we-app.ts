import { ContextProvider } from "@lit-labs/context";
import { state } from "lit/decorators.js";
import {
  WeController,
  WeStore,
  weContext,
} from "@we/elements";
import { AppWebsocket, AdminWebsocket } from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  private store = new WeStore()
  private adminWebsocket : AdminWebsocket | null = null;

  constructor() {
    super();
  }

  async loadApp(appWebsocket: AppWebsocket, installeAppId: string) {

    const appInfo = await appWebsocket.appInfo({
      installed_app_id: installeAppId,
    });

    const cellData = appInfo.cell_data[0];
    const cellClient = new HolochainClient(appWebsocket, cellData);
    const id = installeAppId.slice(3)

    await this.store.updateGames(id)

    // TODO delete me, just here for starters
    if (id=="self" && Object.keys(this.store.games(id)).length==0) {
      this.store.addWe(id, "https://cdn.pngsumo.com/dot-in-a-circle-free-shapes-icons-circled-dot-png-512_512.png", cellClient)

      await this.store.addGame(id, {
        name: "who",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
        meta: {},
      });
      await this.store.addGame(id, {
        name: "synDocs",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://cdn1.iconfinder.com/data/icons/hawcons/32/699327-icon-55-document-text-512.png",
        meta: {},
      });


      this.store.addWe("slime", "https://d2r55xnwy6nx47.cloudfront.net/uploads/2018/07/Physarum_CNRS_2880x1500.jpg", cellClient)
      await this.store.addGame("slime", {
        name: "chat",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://elemental-chat.holo.host/img/ECLogoWhiteMiddle.png",
        meta: {},
      });
      await this.store.addGame("slime", {
        name: "synDocs",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://cdn1.iconfinder.com/data/icons/hawcons/32/699327-icon-55-document-text-512.png",
        meta: {},
      });
      await this.store.addGame("slime", {
        name: "where",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://cdn-icons-png.flaticon.com/512/235/235861.png",
        meta: {},
      });

      this.store.addWe("fish", "https://www.publicdomainpictures.net/pictures/260000/velka/school-of-fish-1527727063xgZ.jpg", cellClient)
      await this.store.addGame("fish", {
        name: "chat",
        dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
        ui_url: "http://someurl",
        logo_url: "https://elemental-chat.holo.host/img/ECLogoWhiteMiddle.png",
        meta: {},
      });

    }
  }

  async firstUpdated() {

    this.adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:9000` //${process.env.HCADMIN_PORT}`
    );

    const appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`
    );

    const active = await this.adminWebsocket.listActiveApps();
    for (const app of active) {
      if (app.startsWith("we-")) {
        await this.loadApp(appWebsocket, app)
      }
    }

    new ContextProvider(this, weContext, this.store);

    this.loaded = true;
  }

  render() {
    if (!this.loaded) return html`<span>Loading...</span>`;
    return html`
<we-controller .selected="self"}></we-controller>
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
