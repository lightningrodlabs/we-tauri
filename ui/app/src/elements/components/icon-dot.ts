import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { Icon } from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { sharedStyles } from "../../sharedStyles";

export class IconDot extends ScopedElementsMixin(LitElement) {

  @property()
  placement: "top" | "top-start" | "top-end" | "right" | "right-start" | "right-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" = "right";

  @property()
  icon!: string;

  @property()
  invisible: boolean = false;

  render() {
    return html`
      <div style="position: relative; display: flex; align-items: center;">
        <slot></slot>
        <div class="column center-content icon-dot ${classMap({invisible: this.invisible})}">
          <mwc-icon style="color: white; --mdc-icon-size: 12px;">${this.icon}</mwc-icon>
        </span>
      </div>
    `;
  }

  static get elementDefinitions() {
    return {
      "mwc-icon": Icon,
    }
  }


  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
        display: flex;
      }
      .icon-dot {
        background-color: #303f9f;
        position: absolute;
        border-radius: 50%;
        height: 17px;
        width: 17px;
        left: 5px;
        top: 0px;
        /* border: 1px solid white; */
      }

      .invisible {
        display: none;
      }
    `
    ];
  }
}
