import { css, CSSResult, html, TemplateResult } from "lit";
import {property } from "lit/decorators.js";
import SlTextarea from "@shoelace-style/shoelace/dist/components/textarea/textarea.js";
import NHCard from "../card";
import { NHComponentShoelace } from "../ancestors/base";

export default class NHCreatePost extends NHComponentShoelace {
  @property()
  prompt!: string;
  @property()
  placeholder!: string;
  @property()
  textAreaValue!: string;

  render() : TemplateResult {
    return html`
      <nh-card
        class="squarish"  
        .theme=${"light"}
        .heading=${this.prompt}
        .hasContextMenu=${false}
        .hasPrimaryAction=${true}
        .textSize=${"sm"}
        .footerAlign=${"r"}
      >
        <sl-textarea value=${this.textAreaValue} filled placeholder=${this.placeholder} resize="auto"></sl-textarea>
        <slot slot="footer" name="footer"></slot>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      "sl-textarea": SlTextarea,
      "nh-card": NHCard,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`

      /* Layout */
      :root {
        display: flex;
      }

      sl-textarea::part(textarea) {
        padding: calc(1px * var(--nh-spacing-sm));
        color:  var(--nh-theme-fg-default);
        background: var(--nh-theme-bg-element);
      }

      sl-textarea::part(textarea):active {
        border: 1px solid var(--nh-theme-bg-element);
      }
    `,
  ];
}
