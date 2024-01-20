import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";

export class AppletIconBadge extends ScopedRegistryHost(LitElement) {

  @property()
  logoSrc!: string;

  render() {
    return html`
      <div style="position: relative; display: inline-block;">
          <slot></slot>
          <img class="applet-icon-badge" src="${this.logoSrc}" />
      </div>
    `;
  }


  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .applet-icon-badge {
        position: absolute;
        pointer-events: none;
        border-radius: 50%;
        border: 2px solid white;
        width: 25px;
        height: 25px;
        right: 0px;
        bottom: 0px;
      }
    `;
  }
}
