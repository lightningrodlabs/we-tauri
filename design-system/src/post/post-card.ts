import { css, CSSResult, html } from "lit";
import {property } from "lit/decorators.js";
import { NHComponent } from '../ancestors/base';
import "../card";
import "../assessment-widget";
import { NHCard } from "../card";
import { NHAssessmentWidget } from "../assessment-widget";
import { b64images } from '@neighbourhoods/design-system-styles';

const kebabCase = (str: string) => str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    ?.join('-')
    .toLowerCase();

export class NHPostCard extends NHComponent {
  @property()
  title!: string;
  @property()
  textContent!: string;
  @property()
  iconImg: string = b64images.icons.pear;

  render() {
    return html`
      <nh-card
        .theme=${"dark"}
        .heading=${this.title}
        .hasContextMenu=${true}
        .hasPrimaryAction=${false}
        .textSize=${"lg"}
        .footerAlign=${"l"}
      >
        <div class="content">
          ${this.textContent !== "" ? html`<p>${this.textContent}</p>` : null}
          <slot name="image"></slot>
        </div>
        <nh-assessment-widget slot="footer" .name=${kebabCase(this.title)} .iconAlt=${`Assess post: "${this.title}"`} .iconImg=${this.iconImg}></nh-assessment-widget>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      "nh-assessment-widget": NHAssessmentWidget,
      "nh-card": NHCard,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      /* Layout */
      .content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      p {
        margin: 0 0 calc(1px * var(--nh-spacing-lg)) 0;
      }

      :host ::slotted([slot=image]) {
        object-fit: cover;
        height: 300px;
      }
    `,
  ];
}
