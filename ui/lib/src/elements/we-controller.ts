import { html, css, LitElement } from "lit";
import { state, property, query } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { Unsubscriber } from "svelte/store";

import { sharedStyles } from "../sharedStyles";
import { weContext, Dictionary, Signal } from "../types";
import { WeStore } from "../we.store";
import { WeGameDialog } from "./we-game-dialog";
import { WeDialog } from "./we-dialog";
import { WePlayer } from "./we-player";
import { WeGames } from "./we-games";
import { WeWes } from "./we-wes";
import { lightTheme, SlAvatar } from '@scoped-elements/shoelace';
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  ListItem,
  Select,
  IconButton,
  Button,
} from "@scoped-elements/material-web";

const GEAR_ICON_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Gear_icon_svg.svg/560px-Gear_icon_svg.svg.png"

/**
 * @element we-controller
 */
export class WeController extends ScopedElementsMixin(LitElement) {
  constructor() {
    super();
  }

  /** Public attributes */

  /** Dependencies */

  @contextProvided({ context: weContext })
  _store!: WeStore;

  _wes = new StoreSubscriber(this, () => this._store.wes);

  /** Private properties */

  @property() selected = ""

  @query('#game-dialog')
  _gameDialog!: WeGameDialog;

  @query('#we-dialog')
  _weDialog!: WeDialog;

  async initialize() {
    await this._store.newWe("self",  this.getLogo("self"))
    await this._store.addGame("self", {
      name: "who",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://raw.githubusercontent.com/lightningrodlabs/we/main/ui/apps/we/who.png",
      meta: {},
    });
    await this._store.addGame("self", {
      name: "synDocs",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://cdn1.iconfinder.com/data/icons/hawcons/32/699327-icon-55-document-text-512.png",
      meta: {},
    });

    await this._store.newWe("slime",  this.getLogo("slime"))
    await this._store.addGame("slime", {
      name: "chat",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://elemental-chat.holo.host/img/ECLogoWhiteMiddle.png",
      meta: {},
    });
    await this._store.addGame("slime", {
      name: "synDocs",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://cdn1.iconfinder.com/data/icons/hawcons/32/699327-icon-55-document-text-512.png",
      meta: {},
    });
    await this._store.addGame("slime", {
      name: "where",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://cdn-icons-png.flaticon.com/512/235/235861.png",
      meta: {},
    });

    await this._store.newWe("fish", this.getLogo("fish"))
    await this._store.addGame("fish", {
      name: "chat",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      logo_url: "https://elemental-chat.holo.host/img/ECLogoWhiteMiddle.png",
      meta: {},
    });

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

  async refresh() {
    await this._store.updateGames(this.selected);
    await this._store.updatePlayers(this.selected);
  }

  async openGameDialog() {
    this._gameDialog.weId = this.selected
    this._gameDialog.open();
  }

  async openWeDialog() {
    this._weDialog.open();
  }

  private handleGameSelect(game: string): void {
    this._store.selectGame(this.selected, game);
  }

  private handleWeSelect(weId: string): void {
    console.log("selecting we:", weId)
    this.selected = weId;
  }

//    <sl-avatar .image=${profile.fields.avatar}></sl-avatar>
//    <div>${profile.nickname}</div></li>`
  render() {
    const we = this._wes.value[this.selected]
    let players;
    if (we) {
      players = we.players.map((player)=>{
        return html`
<we-player
.hash=${player}
.size=${32}
.me=${player == this._store.myAgentPubKey}
></we-player>
`
      })
    }
    let content
    if (!this.selected) {
      content = html`<mwc-button icon="add_circle" @click=${() => this.openWeDialog()}>Add We</mwc-button>`
    } else {
      const game = this._store.currentGame(this.selected)
      if (game) {
        content = html`Content for ${game.name} goes here`
      } else {
        content = html`<mwc-button icon="add_circle" @click=${() => this.openGameDialog()}>Add hApp</mwc-button>
<mwc-button icon="refresh" @click=${() => this.refresh()}>Refresh</mwc-button>`
      }
    }

    return html`
<div class="wes-list">
  <we-wes .selected=${this.selected} @we-selected=${(e:any) => this.handleWeSelect(e.detail)}></we-wes>
  <img class="wes-admin"  @click=${() => this.handleWeSelect("")} src="${GEAR_ICON_URL}" />
</div>

${this.selected ? html`
<div class="games-list">
  <div class="we-name">${this.selected}</div>
   <we-games .weId=${this.selected}></we-games>
  <img class="game-admin" @click=${() => this.handleGameSelect("")} src="${GEAR_ICON_URL}"/>
</div>` : ''}

<div class="content-pane">
${content}
</div>

<div class="players">${players}</div>

<we-game-dialog id="game-dialog" @game-added=${(e:any) => this.handleGameSelect(e.detail)}> ></we-game-dialog>
<we-dialog id="we-dialog" @we-added=${(e:any) => this.handleWeSelect(e.detail)}> ></we-dialog>
`;
  }

  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "mwc-icon-button": IconButton,
      "mwc-button": Button,
      "we-game-dialog" : WeGameDialog,
      "we-dialog" : WeDialog,
      "we-player" : WePlayer,
      "we-games" : WeGames,
      "we-wes" : WeWes,
      'sl-avatar': SlAvatar,
    };
  }

  static get styles() {
    return [
      lightTheme,
      sharedStyles,
      css`
        :host {
          margin: 0px;
          height: 100vh;
          display: flex;
        }
        .wes-list {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: darkgrey;
          padding: 5px;
        }
        .wes-admin {
          height: 50px;
          width: 50px;
          padding-top: 5px;
          flex-grow: 0;
          border-top: solid 1px gray;
        }
        we-wes {
          flex-grow: 0;
        }
        .games-list {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 5px;
          background-color: lightgrey;
        }
        we-games {
          flex-grow: 0;
        }
        .we-name {
          text-align: center;
          border-bottom: solid 1px gray;
          margin-bottom: 5px;
          width: 100%;
        }
        .game-admin {
          height: 50px;
          width: 50px;
          padding: 5px;
          flex-grow: 0;
          border-top: solid 1px gray;
        }
        .content-pane {
          flex-grow: 1;
          padding: 10px;
        }
        .players {
          width: 40px;
          background-color: lightgrey;
          height: 100vh;
          padding: 2px;
        }
        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
      `,
    ];
  }
}
