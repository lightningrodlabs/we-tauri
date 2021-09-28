import { html, css, LitElement } from "lit";
import { state, property } from "lit/decorators.js";

import { contextProvided } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { Unsubscriber } from "svelte/store";

import { sharedStyles } from "../sharedStyles";
import { weContext, Dictionary, Signal } from "../types";
import { WeStore } from "../we.store";
import { WeGameDialog } from "./we-game-dialog";
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

  async refresh() {
    await this._store.updateGames(this.selected);
    await this._store.updatePlayers(this.selected);
  }

  async openGameDialog() {
    const dialog = this.gameDialogElem
    dialog.weId = this.selected
    dialog.open();
  }

  get gameDialogElem() : WeGameDialog {
    return this.shadowRoot!.getElementById("game-dialog") as WeGameDialog;
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
    const game = this._store.currentGame(this.selected)
    let gameContent
    if (game) {
      gameContent = html`Content for ${game.name} goes here`
    } else {
      gameContent = html`
${this.selected ? html`<mwc-button icon="add_circle" @click=${() => this.openGameDialog()}>Add hApp</mwc-button>` : ''}
<mwc-button icon="refresh" @click=${() => this.refresh()}>Refresh</mwc-button>`
    }

    return html`
<div class="wes-list">
  <img class="wes-admin"  @click=${() => this.handleWeSelect("")} src="https://cdn.pngsumo.com/dot-in-a-circle-free-shapes-icons-circled-dot-png-512_512.png" />
  <we-wes .selected=${this.selected} @we-selected=${(e:any) => this.handleWeSelect(e.detail)}></we-wes>
</div>

<div class="games-list">
  <div class="we-name">${this.selected}</div>
  <img class="game-admin" @click=${() => this.handleGameSelect("")} src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Gear_icon_svg.svg/560px-Gear_icon_svg.svg.png" />
${this.selected ? html`<we-games .weId=${this.selected}></we-games>` : ''}
</div>

<div class="game-content">
${gameContent}
</div>

<div class="players">${players}</div>

<we-game-dialog id="game-dialog" @game-added=${(e:any) => this.handleGameSelect(e.detail)}> ></we-game-dialog>
`;
  }

  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "mwc-icon-button": IconButton,
      "mwc-button": Button,
      "we-game-dialog" : WeGameDialog,
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
          background-color: darkgrey;
        }
        .wes-admin {
          height: 50px;
          width: 50px;
          padding:6px;
          flex-grow: 0;
        }
        we-wes {
          flex-grow: 1;
        }
        .games-list {
          display: flex;
          flex-direction: column;
          padding: 5px;
          background-color: lightgrey;
        }
        we-games {
          flex-grow: 0;
        }
        .we-name {
          text-align: center;
          border-bottom: solid 1px gray;
        }
        .game-admin {
          height: 50px;
          width: 50px;
          padding: 5px;
          flex-grow: 0;
        }
        .game-content {
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
