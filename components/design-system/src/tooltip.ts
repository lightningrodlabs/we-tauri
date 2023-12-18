import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponentShoelace } from './ancestors/base';

export default class NHSlide extends NHComponentShoelace {
  @property()
  text: string = "Tooltip Text";
  @property()
  visible: boolean = true;

  render() {
    return html`
      <div class="tooltip${classMap({
        visible: this.visible,
      })}">
        <slot name="hoverable" class="hoverable">Hover</slot>
        <div class="content">${this.text}</div>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      /* Tooltip container */
      .tooltip {
        position: relative;
        display: inline-block;
      }
      
      /* Tooltip text */
      .tooltip .content {
        visibility: hidden;
        width: 120px;
        background-color: var(--nh-theme-bg-detail); 
        color: #fff;
        text-align: center;
        padding: 4px 0;
        border-radius: 8px;
        position: absolute;
        z-index: 1;
        top: 100%;
        right: 0%;
      }
      
      /* Show the tooltip text when you mouse over the tooltip container */
      .visible .hoverable:hover + .content {
        visibility: visible;
      }

      .tooltip .content::after {
        content: " ";
        position: absolute;
        bottom: 99%;  /* At the top of the tooltip */
        right: 4%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent var(--nh-theme-bg-detail) transparent;
      }
    `,
  ];
}