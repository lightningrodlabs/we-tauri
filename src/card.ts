import { css, CSSResult, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import "./polyfill";
import { sharedStyles } from "./sharedStyles";

@customElement("nh-card")
export class NHCard extends NHComponentShoelace {
  @property()
  title!: string;
  @property()
  heading!: string;
  @property()
  hasContextMenu: boolean = false;
  @property()
  theme: string = 'dark';

  render() {
    return html`
      <div class="container ${classMap({
        light: this.theme == 'light',
        dark: this.theme == 'dark',
      })}">
        ${this.title ? html`<h2 class="title">${this.title}</h2>` : html``}
        ${this.hasContextMenu ? html`<nav class="dots-context-menu"> <div class="menu-dot"></div> <div class="menu-dot"></div> <div class="menu-dot"></div> </nav>` : html``}
        <div
          class="content" class=${classMap({
            noheading: !this.heading,
          })}
        >
          ${this.heading ? html`<h1>${this.heading}</h1>` : html``}
          <slot></slot>
        </div>
        <slot name="footer"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      :root {
        display: flex;
      }
      
      .container {
        color: var(--nh-theme-fg-default);
        border-radius: calc(1px * var(--nh-radii-xl));
        padding: calc(1px * var(--nh-spacing-xl));
        position: relative;
      }
      .container.light {
        background-color: var(--nh-theme-bg-muted);
      }
      .container.dark {
        background-color: var(--nh-theme-bg-subtle);
      }
      h1,
      *::slotted(*) {
        margin: 0;
        font-family: var(--nh-font-families-body);
      }
      h1 {
        font-weight: var(--nh-font-weights-body-regular);
        margin-bottom: calc(1px * var(--nh-spacing-xl));
      }

      .content {
        padding: calc(1px * var(--nh-spacing-xl));
      }
      .content.noheading {
        padding: 0;
      }
      h2.title {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;
        font-size: calc(1px * var(--nh-font-size-sm));
        text-transform: uppercase;
        line-height: calc(var(--nh-line-heights-headlines-lg));
        margin-top: 0;
        margin-left: 3px;
      }


      .dots-context-menu {
        position: absolute;
        display: flex;
        top: calc(1px * var(--nh-spacing-xl));
        right: calc(1px * var(--nh-spacing-xl));
        height: 7px;
      }
      .menu-dot {
        width: 5px;
        height: 5px;
        margin: 2px;
        border-radius: 100%;
        background: var(--nh-menu-subtitle);
      }
    `,
  ];
}
