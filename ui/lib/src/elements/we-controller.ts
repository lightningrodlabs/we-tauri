import { html, css, LitElement } from "lit";
import { state, property, query } from "lit/decorators.js";

import { contextProvided, provide } from "@lit-labs/context";
import { StoreSubscriber } from "lit-svelte-stores";
import { Unsubscriber } from "svelte/store";

import { sharedStyles } from "../sharedStyles";
import { GEAR_ICON_URL } from "../types";
import { WesStore } from "../wes-store";
import { CreateWeDialog } from "./create-we-dialog";
import { WePlayer } from "./we-player";
import { WeGames } from "./we-games";
import { WeWes } from "./we-wes";
import { lightTheme, SlAvatar } from "@scoped-elements/shoelace";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  ListItem,
  Select,
  IconButton,
  Button,
  Card,
} from "@scoped-elements/material-web";
import { WePanel } from "./we-panel";
import { weContext, wesContext } from "../context";

/**
 * @element we-controller
 */
export class WeController extends ScopedElementsMixin(LitElement) {
  /** Public attributes */

  /** Dependencies */

  @contextProvided({ context: wesContext })
  _store!: WesStore;

  _wes = new StoreSubscriber(this, () => this._store.wes);
  _selectedWeId = new StoreSubscriber(this, () => this._store.selectedWeId);
  _selectedWe = new StoreSubscriber(this, () => this._store.selectedWe);

  /** Private properties */

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  async openWeDialog() {
    this._weDialog.open();
  }

  render() {
    return html`
      <div class="wes-list">
        <we-wes></we-wes>
        <img
          class="wes-admin"
          @click=${() => this._store.selectWe(undefined)}
          src="${GEAR_ICON_URL}"
        />
      </div>

      ${this._selectedWeId.value
        ? html`<we-panel
            ${provide(weContext, this._selectedWe.value)}
          ></we-panel>`
        : html`<mwc-button icon="add_circle" @click=${() => this.openWeDialog()}
            >Add We</mwc-button
          >`}

      <create-we-dialog id="we-dialog"></create-we-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
      "mwc-icon-button": IconButton,
      "create-we-dialog": CreateWeDialog,
      "mwc-button": Button,
      "we-panel": WePanel,
      "we-wes": WeWes,
      "sl-avatar": SlAvatar,
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
        @media (min-width: 640px) {
          main {
            max-width: none;
          }
        }
      `,
    ];
  }
}
