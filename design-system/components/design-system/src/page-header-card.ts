import { css, CSSResult, html } from "lit";
import {property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from './ancestors/base';

export default class NHPageHeaderCard extends NHComponent {
  @property()
  heading!: string;
  @property()
  theme: string = "dark";

  render() {
    return html`
      <div
        class="container${classMap({
          light: this.theme == "light",
          dark: this.theme == "dark",
        })}"
      >
        <slot name="secondary-action"></slot>
        <div
          class="content${classMap({
            noheading: !this.heading,
          })}"
          >
          ${this.heading !== "" ? html`<h1>${this.heading}</h1>` : html``}
        </div>
        <slot name="primary-action"></slot>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    /* Layout */
    :host {
      grid-column: 1 / -1;
    }
    
    .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--nh-theme-fg-default);
      border-radius: calc(1px * var(--nh-radii-md));
      padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-md));
      position: relative;
    }
    .container.light {
      background-color: var(--nh-theme-bg-detail);
    }
    .container.dark {
      background-color: var(--nh-theme-bg-surface);
    }
    
    /* Headings */

    h1 {
      font-family: var(--nh-font-families-body);
      font-size: calc(1px * var(--nh-font-size-3xl));
      margin: auto;
      padding: calc(1px * var(--nh-spacing-xxs)) calc(1px * var(--nh-spacing-xl));
      line-height: var(--nh-line-heights-headlines-default);
      font-weight: var(--nh-font-weights-body-regular);
    }
    
    /* Slot specific */
      
    :host([slot="nav"]) .container {
      padding: calc(1px * var(--nh-spacing-sm)) calc(1px * var(--nh-spacing-sm));
      background-color: transparent;
    }
    :host([slot="top-menu"]) .container {
      padding: 0;
      grid-template-area: "top";
    }
    `,
  ];
}
