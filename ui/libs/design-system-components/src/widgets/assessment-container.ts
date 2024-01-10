import { classMap } from "lit/directives/class-map.js";
import { css, CSSResult, html } from "lit";
import {property, query, queryAll } from "lit/decorators.js";
import { NHComponentShoelace } from "../ancestors/base";
import { b64images } from "@neighbourhoods/design-system-styles";

export default class NHAssessmentContainer extends NHComponentShoelace {
  @property()
  iconImg!: string;
  @property()
  iconAlt!: string;
  @property()
  assessmentValue!: number;
  @queryAll(".assessment-icon-container")
  _containers!: HTMLElement[];
  @query(".assessment-background")
  _background!: HTMLElement;

  render() {
    return html`
      <div
        class="assessment-icon-container${classMap({
          empty: !this.iconImg || !this.assessmentValue,
        })}"
      >
        <div class="assessment-background"></div>
          <img class="assessment-icon" src=${`data:image/png;base64,${this?.iconImg || b64images.icons.refresh}`} alt=${this.iconAlt} />
        <div class="assessment-community-counter">${this.assessmentValue}</div>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :root {
        /*Variables not defined as tokens*/
        --animation-short: 250ms;
        --animation-shortest: 180ms;

        --border-r-medium: 24px;
        --border-r-small: 12px;
        --border-r-tiny: 6px;

        --box-shadow-subtle-small: 0px 0px 2px rgba(0, 0, 0, 0.5);
      }

      .assessment-community-counter {
        background-color: var(--nh-theme-accent-muted);
        color: var(--nh-theme-fg-default);
        width: 32px;
        padding: 4px;
        margin-top: 38px;
        border-radius: var(--border-r-tiny);
        text-align: center;
        position: absolute;
        opacity: 0;
        transition: margin var(--animation-short),
          opacity var(--animation-shortest);
      }

      .assessment-icon-container {
        border-radius: var(--border-r-tiny);
        width: 40px;
        height: 40px;
        margin: 4px;
        cursor: pointer;
        transition: background-color var(--animation-shortest);
      }

      .assessment-icon-container.empty {
        cursor: initial;
      }
      .assessment-icon-container.empty:active {
        background-color: var(--nh-theme-bg-detail);
      }

      .clicked-assessment {
        background-color: var(--nh-theme-accent-default);
      }

      .assessment-icon-container:not(.empty):hover {
        background-color: var(--nh-theme-accent-default);
        border-radius: calc(1px * var(--nh-radii-md) - 3px);
      }

      .assessment-icon-container:active {
        background-color: #ffffff;
      }

      .assessment-icon-container:not(.empty):hover > .assessment-community-counter {
        opacity: 1;
        margin-top: 42px;
        top: 25px;
        border-radius: 8px
      }

      .unicode-emoji-container {
        display: grid;
        place-content: center;
        height: 100%;
        width: 100%
      }
      .unicode-emoji-container span {
        font-size: 1.5rem;
      }

      .assessment-background {
        background-color: var(--nh-theme-accent-muted);
        width: 0px;
        height: 36px;
        position: absolute;
        border-radius: var(--border-r-tiny);
        border: 0px solid transparent;
      }

      .send-assessment-ani-class {
        animation: send-assessment-ani 2000ms forwards ease-out;
      }

      @keyframes send-assessment-ani {
        0% {
          width: 0px;
          border: 2px solid transparent;
        }
        90% {
          width: 36px;
          border: 2px solid transparent;
        }
        100% {
          border: 2px solid var(--nh-theme-accent-default);
          width: 36px;
        }
      }

      .assessment-icon {
        width: 32px;
        margin: 4px;
        z-index: 2;
        position: absolute;
        filter: drop-shadow(var(--box-shadow-subtle-small));
      }
    `,
  ];
}
