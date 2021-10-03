import { ContextProvider } from "@lit-labs/context";
import { state } from "lit/decorators.js";
import {
  WeController,
  WeStore,
  weContext,
} from "@we/elements";
import { AppWebsocket, AdminWebsocket, InstalledCell } from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { serializeHash } from '@holochain-open-dev/core-types';

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  private store = new WeStore()

  constructor() {
    super();
  }

  //TODO fix
  getLogo(id: string) : string {
    switch (id) {
    case "self":
      return "https://cdn.pngsumo.com/dot-in-a-circle-free-shapes-icons-circled-dot-png-512_512.png"
    case "slime":
      return "https://d2r55xnwy6nx47.cloudfront.net/uploads/2018/07/Physarum_CNRS_2880x1500.jpg"
    case "fish":
      return "https://www.publicdomainpictures.net/pictures/260000/velka/school-of-fish-1527727063xgZ.jpg"
    }
    return ""
  }

  async initialize() {
    await this.store.newWe("self",  this.getLogo("self"))
    await this.store.addGame("self", {
      name: "who",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://raw.githubusercontent.com/lightningrodlabs/we/main/ui/apps/we/who.png",
      meta: {},
    });
    await this.store.addGame("self", {
      name: "synDocs",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://cdn1.iconfinder.com/data/icons/hawcons/32/699327-icon-55-document-text-512.png",
      meta: {},
    });

    await this.store.newWe("slime",  this.getLogo("slime"))
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

    await this.store.newWe("fish", this.getLogo("fish"))
    await this.store.addGame("fish", {
      name: "chat",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://elemental-chat.holo.host/img/ECLogoWhiteMiddle.png",
      meta: {},
    });

  }


  async loadWe(installedAppId: string) {

    const appInfo = await this.store.appWebsocket!.appInfo({
      installed_app_id: installedAppId,
    });

    const id = installedAppId.slice(3)
    await this._loadWe(id, appInfo.cell_data[0])
  }

  async _loadWe(id: string, cell: InstalledCell ) {
    const dna = serializeHash(cell.cell_id[0]);
    console.log("loading DNA ", dna)

    const cellClient = new HolochainClient(this.store.appWebsocket!, cell);

    this.store.addWe(id, this.getLogo(id), cellClient) //TODO fix getlogo
    await this.store.updateGames(id)

    console.log("games in ",id, this.store.games(id))

  }

  async firstUpdated() {

    this.store.adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:9000` //${process.env.HCADMIN_PORT}`
    );

    this.store.appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`
    );

    const appInfo = await this.store.appWebsocket!.appInfo({
      installed_app_id: "we",
    });

    const installedCells = appInfo.cell_data;
    this.store.myAgentPubKey = serializeHash(installedCells[0].cell_id[1]);
    this.store.weDnaHash = serializeHash(installedCells[0].cell_id[0]);
    console.log("DNA ", this.store.weDnaHash)

    let active = await this.store.adminWebsocket.listActiveApps();
    if (active.indexOf("we-self") == -1) {
      await this.initialize()
    } else {
      console.log("installed apps", active)
      for (const app of active) {
        if (app.startsWith("we-")) {
          await this.loadWe(app)
        }
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
