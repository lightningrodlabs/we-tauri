import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";

/**
 * Adds an opaque overlay on top of the Icon.
 * Can be used in case an applet is deactivated in the conductor.
 */
export class InactiveOverlay extends ScopedElementsMixin(LitElement) {
  render() {
    return html`
      <div style="position: relative; display: inline-block;">
        <slot></slot>
        <span class="opaque-overlay"></span>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .opaque-overlay {
        background-color: rgba(0, 0, 0, 0.5);
        pointer-events: none;
        position: absolute;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        right: 4px;
        top: 0px;
      }
    `;
  }
}
