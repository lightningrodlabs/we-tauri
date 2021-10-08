import { ContextProvider } from "@lit-labs/context";
import { state } from "lit/decorators.js";
import { WeController, WesStore, wesContext } from "@we/elements";
import {
  AppWebsocket,
  AdminWebsocket,
  InstalledCell,
} from "@holochain/conductor-api";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { serializeHash } from "@holochain-open-dev/core-types";

export class WeApp extends ScopedElementsMixin(LitElement) {
  @state()
  loaded = false;

  private _store!: WesStore;

  constructor() {
    super();
  }

  //TODO fix
  getLogo(id: string): string {
    switch (id) {
      case "self":
        return "https://cdn.pngsumo.com/dot-in-a-circle-free-shapes-icons-circled-dot-png-512_512.png";
      case "slime":
        return "https://d2r55xnwy6nx47.cloudfront.net/uploads/2018/07/Physarum_CNRS_2880x1500.jpg";
      case "fish":
        return "https://www.publicdomainpictures.net/pictures/260000/velka/school-of-fish-1527727063xgZ.jpg";
    }
    return "";
  }

  async initialize() {
    await this._store.newWe("self", this.getLogo("self"));

    await this._store.newWe("slime", this.getLogo("slime"));
  }

  async firstUpdated() {
    const adminWebsocket = await AdminWebsocket.connect(
      `ws://localhost:9000` //${process.env.HCADMIN_PORT}`
    );

    const appWebsocket = await AppWebsocket.connect(
      `ws://localhost:${process.env.HC_PORT}`
    );

    const appInfo = await appWebsocket!.appInfo({
      installed_app_id: "we",
    });
    this._store = new WesStore();

    const installedCells = appInfo.cell_data;
    this._store.myAgentPubKey = serializeHash(installedCells[0].cell_id[1]);
    this._store.weDnaHash = serializeHash(installedCells[0].cell_id[0]);
    console.log("DNA ", this.store.weDnaHash);

    let active = await this.store.adminWebsocket.listActiveApps();
    if (active.indexOf("we-self") == -1) {
      await this.initialize();
    } else {
      console.log("installed apps", active);
      for (const app of active) {
        if (app.startsWith("we-")) {
          await this.loadWe(app);
        }
      }
    }

    new ContextProvider(this, wesContext, this._store);

    this.loaded = true;
  }

  render() {
    if (!this.loaded) return html`<span>Loading...</span>`;
    return html` <we-controller></we-controller> `;
  }

  static get scopedElements() {
    return {
      "we-controller": WeController,
    };
  }
  static get styles() {
    return [
      css`
        :host {
          margin: 0px;
        }
      `,
    ];
  }
}
