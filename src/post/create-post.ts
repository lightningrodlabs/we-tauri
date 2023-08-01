import { css, CSSResult, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { SlTextarea } from "@scoped-elements/shoelace";
import "../card";
import { sharedStyles } from "../sharedStyles";
import { NHCard } from "../card";
import { NHComponentShoelace } from "../ancestors/base";

@customElement("nh-create-post")
export class NHCreatePost extends NHComponentShoelace {
  @property()
  prompt!: string;
  @property()
  placeholder!: string;
  @property()
  textAreaValue!: string;

  render() {
    return html`
      <nh-card
        .theme=${"dark"}
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
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}

      /* Layout */
      :root {
        display: flex;
      }

      sl-textarea::part(textarea) {
        padding: calc(1px * var(--nh-spacing-sm));
        color:  var(--nh-theme-fg-default);
        background: var(--nh-theme-bg-surface);
      }

      sl-textarea::part(textarea):active {
        border: 1px solid var(--nh-theme-bg-surface);
      }
    `,
  ];
}
