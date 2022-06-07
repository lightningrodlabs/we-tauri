import { html, LitElement, css } from "lit";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { ListProfiles } from "@holochain-open-dev/profiles";
import { Button, TextField, CircularProgress, Card } from "@scoped-elements/material-web";
import { contextProvided } from "@lit-labs/context";
import { AgentPubKeyB64 } from "@holochain-open-dev/core-types";
import { query, state } from "lit/decorators.js";


import { sharedStyles } from "../../sharedStyles";
import { WeStore } from "../we-store";
import { weContext } from "../context";
import { getAllPublishedApps } from "../../processes/devhub/get-happs";


interface GameDescription {
  title: String,
  subtitle: String,
  description: String,
// icon: ?? | undefined,
}


export class InstallableGames extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: weContext, subscribe: true })
  @state()
  _weStore!: WeStore;

  @state()
  private _installableGames!: Array<Object>;

  @state()
  private _loading = true;


  async firstUpdated() {
    const installedApps = await this._weStore.adminWebsocket.listApps({});
    const devhubHapp = installedApps.find(
      (app) => app.installed_app_id === "DevHub"
    )!;

    this._installableGames = await getAllPublishedApps(
      this._weStore.appWebsocket,
      devhubHapp
    );

    this._loading = false;
  }


  renderInstallableGame(game: GameDescription) {
    console.log("installable game being rendered.");
    console.log("game: ", game);
    return html`
      <mwc-card class="game-card">
        <h2 style="padding: 5px; margin:0;">${game.title}</h2>
        <h3 style="padding: 5px; margin: 0;">${game.subtitle}</h3>
        <div style="overflow-y: auto; padding: 5px;">${game.description}</div>
        <mwc-button>INSTALL</mwc-button>
      </mwc-card>
    `;
  }

  render() {

    if (this._loading)
    return html`
      <mwc-circular-progress indeterminate></mwc-circular-progress>
      `;

    return html`
      <div style="display: flex;">
        ${this._installableGames.map((item: any) => {
          let game: GameDescription = {
            title: item.app.content.title,
            subtitle: item.app.content.subtitle,
            description: item.app.content.description,
          }
          return this.renderInstallableGame(game);
        })}
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "list-profiles": ListProfiles,
      "mwc-button": Button,
      "mwc-textfield": TextField,
      "mwc-circular-progress": CircularProgress,
      "mwc-card": Card,
    };
  }

  static localStyles = css`
  .game-card {
      max-width: 300px;
      height: 180px;
      margin: 10px;
  }
  `

  static get styles() {
    return [sharedStyles, this.localStyles];
  }
}