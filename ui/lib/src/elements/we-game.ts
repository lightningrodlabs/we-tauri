import { EntryHashB64 } from "@holochain-open-dev/core-types";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement, PropertyValues } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { property } from "lit/decorators.js";
import { weContext } from "../context";
import { sharedStyles } from "../sharedStyles";
import { WeStore } from "../we-store";
import { WeRender } from "./we-render";

export class WeGame extends ScopedElementsMixin(LitElement) {
  @property()
  gameHash!: EntryHashB64;

  @contextProvided({ context: weContext })
  _store!: WeStore;

  _game = new StoreSubscriber(this, () => this._store.game(this.gameHash));

  addGame() {
    this._store.addGame(this.gameHash);
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues)

    if (changedValues.has('gameHash')) {
      this._store.fetchRenderers(this.gameHash)
    }
  }

  render() {
    if (!this._game.value?.areWePlaying) {
      return html`
        <div class="column">
          <span>You aren't playing this game yet</span>
          <mwc-button label="Play game" @click=${this.addGame}></mwc-button>
        </div>
      `;
    }
    if (!this._game.value.renderers) {
      return html`
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      `;
    }

    return html`<we-render
      .renderer=${this._game.value.renderers.full}
    ></we-render>`;
  }

  static get scopedElements() {
    return {
      "we-render": WeRender,
      "mwc-button": Button,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static get styles() {
    return [sharedStyles]
  }
}
