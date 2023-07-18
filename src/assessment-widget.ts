import { css, CSSResult, html, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property, query, queryAll } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponentShoelace } from "neighbourhoods-design-system-components";
import "./polyfill";
import { sharedStyles } from "./sharedStyles";

@customElement("nh-assessment-widget")
export class NHAssessmentWidget extends NHComponentShoelace {
  @property()
  name!: string;
  @property()
  iconImg!: string;
  @property()
  iconAlt!: string;
  @queryAll(".assessment-icon-container")
  _containers!: HTMLElement[];
  @query(".assessment-background")
  _background!: HTMLElement;

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    console.log(this._containers);
    this._containers.forEach((container) => {
      let timeoutId: any = null; // Variable to store the timeout ID
      const timerBeforeSending = 2000;
      // Add a click event listener to each container
      container.addEventListener("click", () => {
        const background = container.querySelector(".assessment-background"); // Get the background element

        // If the container already has the clicked-assessment class
        if (container.classList.contains("clicked-assessment")) {
          clearTimeout(timeoutId); // Clear the animation timeout
          container.classList.remove("clicked-assessment"); // Remove the clicked-assessment class
          background!.classList.remove("send-assessment-ani-class"); // Remove the animation class
        } else {
          // If the container doesn't have the clicked-assessment class
          container.classList.add("clicked-assessment"); // Add the clicked-assessment class

          // Set a timeout to trigger the animation after 2 seconds
          timeoutId = setTimeout(() => {
            background!.classList.add("send-assessment-ani-class"); // Add the animation class
          }, timerBeforeSending);
        }
      });
    });
  }

  render() {
    return html`
      <div class="assessment-widget">
        <div class="assessment-container">
          <div
            class="${classMap({
              [`${this.name.toLowerCase()}-assessment`]: !!this.name,
            })}assessment-icon-container"
          >
            <div class="assessment-background"></div>
            <img
              class="assessment-icon"
              src=${`data:image/png;base64,${this.iconImg}`}
              alt=${this.iconAlt}
            />
            <div class="assessment-community-counter">255</div>
          </div>
        </div>
        <nav class="assessment-widget-menu">
          <div class="menu-dot"></div>
          <div class="menu-dot"></div>
          <div class="menu-dot"></div>
        </nav>
      </div>
    `;
  }

  static styles: CSSResult[] = [
    // super.styles as CSSResult,
    css`
      ${unsafeCSS(sharedStyles)}
      :root {
        /*Variables not defined as tokens*/
        --animation-short: 250ms;
        --animation-shortest: 180ms;

        --border-r-medium: 24px;
        --border-r-small: 12px;
        --border-r-tiny: 6px;

        --box-shadow-subtle-small: 0px 0px 2px rgba(0, 0, 0, 0.5);
      }

      .assessment-widget-menu {
        margin: auto 4px;
        cursor: pointer;
      }

      .assessment-widget {
        background-color: var(--nh-theme-bg-subtle);
        padding: 4px;
        margin: 4px;
        border: 1px solid var(--nh-theme-accent-default);
        border-radius: var(--border-r-tiny);
        display: flex;
        width: min-content;
        max-width: 100%;
        overflow: hidden;
      }

      .assessment-container {
        height: 40px;
        display: flex;
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
        background-color: var(--nh-theme-bg-muted);
        border-radius: var(--border-r-tiny);
        width: 40px;
        height: 40px;
        margin-right: 4px;
        cursor: pointer;
        transition: background-color var(--animation-shortest);
      }

      .clicked-assessment {
        background-color: var(--nh-theme-accent-default);
      }

      .assessment-icon-container:hover {
        background-color: var(--nh-theme-accent-default);
      }

      .assessment-icon-container:active {
        background-color: #ffffff;
      }

      .assessment-icon-container:hover > .assessment-community-counter {
        opacity: 1;
        margin-top: 42px;
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

      .menu-dot {
        width: 5px;
        height: 5px;
        margin: 4px;
        border-radius: var(--border-r-tiny);
        background-color: var(--nh-theme-accent-default);
      }
    `,
  ];
}
