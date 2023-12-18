import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html } from 'lit';
import { property } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';

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
        <div class="content">
        <svg class="icon${classMap({
          })}" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5229 2 22 6.47715 22 12C22 17.5229 17.5229 22 12 22C6.47715 22 2 17.5229 2 12ZM4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12ZM12.7071 15.2929C13.0976 15.6834 13.0976 16.3166 12.7071 16.7071C12.3166 17.0976 11.6834 17.0976 11.2929 16.7071C10.9024 16.3166 10.9024 15.6834 11.2929 15.2929C11.6834 14.9024 12.3166 14.9024 12.7071 15.2929ZM11 8C11 7.44771 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13V8Z" fill="currentColor"/>
        </svg>
        ${this.text}
        </div>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    
    `,
  ];
}