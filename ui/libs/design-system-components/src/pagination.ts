import { css, CSSResult, html, TemplateResult } from "lit";
import {property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from './ancestors/base';

export default class NHPagination extends NHComponent {
  @property()
  length!: number;
  @property()
  arrows: boolean = true;
  @state()
  currentIndex: number = 0;

  decrementCurrentIndex() {
    this.currentIndex -= 1;
    this.requestUpdate();
  }

  incrementCurrentIndex() {
    this.currentIndex += 1;
    this.requestUpdate();
  }

  renderPagination(index: number)  : TemplateResult{
    const renderRestOfPagination = () => html`
      ${new Array(this.length).fill(undefined).map((_, i) => {
        return html`<li>
          <span
            class="pagination-number ${classMap({
              active: i == this.currentIndex,
            })}"
            @click=${() => (this.currentIndex = i)}
          >
            ${i + 1}</span
          >
        </li>`;
      })}
    `;

    switch (true) {
      case index > 0 && index < this.length - 1:
        return html`<ul
          id="pagination"
          slot="footer"
          class=${classMap({
            active: index == this.currentIndex,
          })}
        >
          <li>
            <a
              class="arrow-link pagination-number"
              @click=${() => this.decrementCurrentIndex()}
            ></a>
          </li>
          ${renderRestOfPagination()}
          <li>
            <a
              class="arrow-link pagination-number"
              @click=${() => this.incrementCurrentIndex()}
            ></a>
          </li>
        </ul>`;
      case index == this.length - 1:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: index == this.currentIndex,
          })}
        >
          <li>
            <a
              class="arrow-link pagination-number"
              @click=${() => this.decrementCurrentIndex()}
            ></a>
          </li>
          ${renderRestOfPagination()}
          <li><a class="arrow-link pagination-number hidden"></a></li>
        </ul>`;

      default:
        return html`<ul id="pagination">
          <li><a class="arrow-link pagination-number hidden"></a></li>
          ${renderRestOfPagination()}
          <li>
            <a
              class="arrow-link pagination-number"
              @click=${() => this.incrementCurrentIndex()}
            ></a>
          </li>
        </ul>`;
    }
  }

  render() : TemplateResult {
    return html`<div class="container">${this.renderPagination(this.currentIndex)}</div>`;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .container {
        font-family:  var(--nh-font-families-body);
        background-color: var(--nh-theme-bg-surface);
        padding: calc(1px * var(--nh-spacing-xs));
      }

      ul {
        display: flex;
        gap: calc(1px * var(--nh-spacing-xs));
      }

      #pagination {
        margin: 0 auto;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center
        width: 100%;
      }
      #pagination li {
        display: inline-block;
      }
      a.arrow-link, span {
        cursor: pointer;
        display: grid;
        width: 32px;
        height: 32px;
        place-content: center;
        background-color: var(--nh-theme-bg-surface);
        border-radius: calc(1px * var(--nh-radii-base));
        color: var(--nh-theme-fg-default);
        border: 2px solid var(--nh-theme-bg-detail);
        
        text-decoration: none;
        -webkit-transition: background-color 0.4s;
        transition: background-color 0.4s
      }
      a.arrow-link {
        background-repeat: no-repeat;
        background-size: cover;
        border: none;
        background-color: transparent;
      }
      a.arrow-link:hover {
        background-color: var(--nh-theme-bg-surface);
      }
      a.arrow-link:not(.hidden) {
        background-image: url(icons/next-arrow.png);
      }
      a.arrow-link.hidden {
        background-image: url(icons/back-arrow.png);
      }
      .hidden {
        visibility: hidden;
      }
      li:first-child a.arrow-link:not(.hidden) {
        transform: rotate(180deg);
      }
      li:last-child a.arrow-link.hidden {
        transform: rotate(180deg);
      }
      .pagination-number.active {

        --nh-theme-accent-default: #A179FF;
        background-color: var(--nh-theme-accent-default);
      }

      .pagination-number:hover:not(.active) {
        background-color: var(--nh-theme-bg-surface);
      }
    `,
  ];
}
