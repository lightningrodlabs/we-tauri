import { DnaHash, EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { Task } from "@lit-labs/task";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property, state } from "lit/decorators";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { RenderBlock } from "./render-block";



export class AppletNotInstalled extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;


  @contextProvided({ context: weGroupContext })
  weGroupId!: DnaHash;

  @property()
  appletInstanceId!: EntryHash;

  @state()
  private _showAppletDescription: boolean = false;


  private toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }


  render() {

    const appletInstanceInfo = this._matrixStore.getNewAppletInstanceInfo(this.appletInstanceId)!;
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column center-content"
              style="flex: 1; margin-top: 50px;"
            >
              ${!appletInstanceInfo.applet.logoSrc
                ? html`<div
                    class="logo-placeholder-large"
                    style="width: 100px; height: 100px;"
                  >
                    ${appletInstanceInfo.applet.name[0]}
                  </div>`
                : html`<img class="logo-large" src=${appletInstanceInfo.applet.logoSrc} />`}
              <div class="row center-content" style="margin-top: 20px;">
                <div
                  style="font-size: 1.4em; margin-left: 50px; margin-right: 5px;"
                >
                  ${appletInstanceInfo.applet.name}
                </div>
                <mwc-icon-button-toggle
                  onIcon="expand_less"
                  offIcon="expand_more"
                  @click=${this.toggleAppletDescription}
                ></mwc-icon-button-toggle>
              </div>
              ${this._showAppletDescription
                ? html`<div
                    style="margin-top: 10px; font-size: 1em; max-width: 800px; color: #656565;"
                  >
                    ${appletInstanceInfo.applet.description}
                  </div>`
                : html``}
              <div
                style="margin-top: 70px; font-size: 1.2em; text-align: center;"
              >
                This applet has been added by someone else from your group.
              </div>
              <div
                style="margin-top: 10px; font-size: 1.2em; text-align: center;"
              >
                You haven't installed it yet.
              </div>
              <mwc-button
                style="margin-top: 50px;"
                raised
                @click=${() => this._matrixStore.joinApplet(this.weGroupId, this.appletInstanceId!)}
                >INSTALL</mwc-button
              >
            </div>
          </div>
        </div>
      </div>
    `;
  }


  static get scopedElements() {
    return {
      "render-block": RenderBlock,
      "mwc-circular-progress": CircularProgress,
    };
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }
    `,
  ];


}