import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";

export class NotificationDot extends ScopedElementsMixin(LitElement) {

  @property()
  placement: "top" | "top-start" | "top-end" | "right" | "right-start" | "right-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" = "right";



  render() {
    return html`
      <div style="position: relative; display: inline-block;">
          <slot></slot>
          <span class="notification-dot"></span>
      </div>
    `;
  }


  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .notification-dot {
        background-color: #e8dc30;
        position: absolute;
        border-radius: 50%;
        width: 15px;
        height: 15px;
        right: 0px;
        top: 0px;
      }
    `;
  }
}

