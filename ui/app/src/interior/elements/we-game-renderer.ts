import { html, LitElement } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import { Button, TextField, Snackbar, CircularProgress } from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64, EntryHashB64 } from "@holochain-open-dev/core-types";
import { query, state, property } from "lit/decorators.js";

import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";
import { RenderBlock } from "./render-block";
import { Renderer } from "@lightningrodlabs/we-game";



export class WeGameRenderer extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _store!: WeStore;

  @state()
  _pubKey: AgentPubKeyB64 | undefined;

  @state()
  private _renderer: Renderer | undefined;

  @property()
  gameHash!: EntryHashB64;

  @state()
  private _loading: boolean = true;


  async firstUpdated() {
    const gameRenderers = await this._store.fetchGameRenderers(this.gameHash);
    this._renderer = gameRenderers.full;
  }

  render() {
    if (!this._renderer) {
      return html `
        <div class="center-conent">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>
      `
    } else {
      return html`
        <render-block .renderer=${this._renderer}></render-block>
      `;
    }
  }

  static get scopedElements() {
    return {
      "render-block": RenderBlock,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static styles = [sharedStyles];
}
