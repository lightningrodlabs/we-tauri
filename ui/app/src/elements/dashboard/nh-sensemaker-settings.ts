import { css, CSSResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { NHCard, NHComponentShoelace, NHSlide } from '@neighbourhoods/design-system-components';

import { encodeHashToBase64 } from '@holochain/client';
import { Readable } from '@holochain-open-dev/stores';
import { get } from 'svelte/store';
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { SlIconButton, SlTooltip, SlButton } from '@scoped-elements/shoelace';
import { classMap } from 'lit/directives/class-map.js';

export class NHSensemakerSettings extends NHComponentShoelace {
  @property()
  sensemakerStore!: SensemakerStore;
  @state()
  appletDetails;
  @property()
  selectedDimensionIndex: number = 0;
  @state()
  activeMethodsDict = new Map();
  @state()
  selectedMethod : boolean = false;
  @state()
  selectedMethodIndex!: number;
  @property()
  currentVisibleDimensionIndex!: number;

  connectedCallback() {
    super.connectedCallback();
    let store: Readable<AppletConfig> = this.sensemakerStore?.flattenedAppletConfigs();
    store &&
      store.subscribe(appletConfig => {
        this.appletDetails = appletConfig;
        if (Object.values(appletConfig.resource_defs).length <= 1)
          return console.log("Didn't register the applet's resource defs yet");
        this.activeMethodsDict = Object.entries(appletConfig.resource_defs)
          .slice(1)
          .reduce(
            // Slice to remove Generic Resource
            (dict, [_, eH]): any => {
              const resourceDefEh = encodeHashToBase64(eH);
              const activeMethodEh = get(this.sensemakerStore.activeMethod())[resourceDefEh];
              const activeMethod = Object.entries(appletConfig.methods).find(
                ([methodName, methodEh]: any) => encodeHashToBase64(methodEh) === activeMethodEh,
              );
              dict.set(resourceDefEh, activeMethod);
              return dict;
            },
            new Map(),
            );
      });
  }

  decrementSelectedDimensionIndex(i: number) {
    this.selectedDimensionIndex -= 1;
    this.requestUpdate();
  }

  incrementSelectedDimensionIndex(i: number) {
    this.selectedDimensionIndex += 1;
    this.requestUpdate();
  }

  renderDimensionSlides(slideSubtitle: string, dimensionNames: string[], currentResourceDefEh: any) {
    return html`<div class="container">
      <div style="display:flex; gap: 8px; flex-direction: column;">
        <nh-card .theme=${"light"} title=${'PREVIEW WITH POST'}>
          <div class="preview-container">
            <img src="post-example.png" style="width: 100%; object-fit: cover" />
            ${this.selectedMethod && (typeof this.currentVisibleDimensionIndex == 'number') ? html`<span class="widget-display">${Array.from(this.renderAssessmentEmoji(dimensionNames[this.currentVisibleDimensionIndex]))[0]}</span>` : html``}
          </div>
        </nh-card>
      </div>
      ${dimensionNames.map(
        (dimension, i) => html`
          <nh-card
            .title=${"Assessment"}
            .heading=${'Dimension: ' + dimension}
            class="widget-card ${classMap({
              active: i == this.selectedDimensionIndex,
            })}"
          >
            <nh-dimension-slide
              heading=${'This is a brief description of the dimension so that it is clear what dimension the assessment is being applied to.'}
              class="slide ${classMap({
                active: i == this.selectedDimensionIndex,
              })}"
            >
              <div class="choose-assessment-widget">
                <h3>Assessment Type:</h3>
                <h3>Emoji:</h3>
                <div>${generateAssessmentTypeImg(this.selectedDimensionIndex)}</div>
                <div class="widget-choice">
                  <a class="${classMap({
                    selected: i == this.selectedMethodIndex,
                  })} select-widget-link" @click=${() => {this.selectedMethodIndex = i; this.handleUpdateActiveMethod(dimension,  currentResourceDefEh)}}>
                    <span class="widget-display">${this.renderAssessmentEmoji(dimension)}</span>
                    <sl-button size="large" class="choose-widget-button" label=${this.selectedMethodIndex == i ? "Selected" : "Choose Me"}>
                      ${this.selectedMethodIndex == i ? "Selected" : "Choose Me"}   
                    </sl-button>
                  </a>
                </div>

              </div>
            </nh-dimension-slide>
            ${this.renderPagination(i, dimensionNames)}
          </nh-card>
        `,
      )}
    </div>`;
  }
  renderAssessmentEmoji(method) {
    let emojis;

    switch (method) {
        case ('average_star_method'):
            emojis = "⭐";
            break;
        case ('average_heat_method'):
            emojis = "🧊❄️💧🌶️🔥";
            break;
        case ('total_importance_method'):
            emojis = "✅";
            break;
        case ('total_thumbs_up'):
            emojis = "👍 👎";
            break;
    }
    return emojis;
  }
  renderPagination(dimensionIndex: number, dimensionNames: string[]) {
    const renderRestOfPagination = (currentIndex: number) => html`
      ${dimensionNames.map((_, i) => {
        return html`<li>
          <span
            class="pagination-number ${classMap({
              active: i == this.selectedDimensionIndex,
            })}"
            @click=${() => (this.selectedDimensionIndex = i)}
          >
            ${i + 1}</span
          >
        </li>`;
      })}
    `;

    switch (true) {
      case dimensionIndex > 0 && dimensionIndex < dimensionNames.length - 1:
        return html`<ul
          id="pagination"
          slot="footer"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a class="arrow-link pagination-number" @click=${() => this.decrementSelectedDimensionIndex(dimensionIndex)}></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="arrow-link pagination-number" @click=${() => this.incrementSelectedDimensionIndex(dimensionIndex)}></a></li>
        </ul>`;
      case dimensionIndex == dimensionNames.length - 1:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a class="arrow-link pagination-number" @click=${() => this.decrementSelectedDimensionIndex(dimensionIndex)}></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="arrow-link pagination-number hidden"></a></li>
        </ul>`;

      default:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a class="arrow-link pagination-number hidden"></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="arrow-link pagination-number" @click=${() => this.incrementSelectedDimensionIndex(dimensionIndex)}></a></li>
        </ul>`;
    }
  }

  render() {
    // for each resource def, have a dropdown, which is all the dimensions available

    return html`
      ${Object.entries(this.appletDetails.resource_defs)
        .slice(1)
        .map(([key, eH]: any) => {
          const resourceDefEh = encodeHashToBase64(eH);
          const activeMethod = this.activeMethodsDict.get(resourceDefEh);
          return html`
            ${this.renderDimensionSlides(key, Object.keys(this.appletDetails.methods), resourceDefEh)}
          `;
        })}
    `;
  }

  handleUpdateActiveMethod(selectedMethodName, resourceDefEh) {
    const activeMethod = this.activeMethodsDict.get(resourceDefEh);

    this.currentVisibleDimensionIndex = this.selectedDimensionIndex;
    try {
      if (activeMethod !== selectedMethodName) this.sensemakerStore.updateActiveMethod(
        resourceDefEh,
        encodeHashToBase64(this.appletDetails.methods[selectedMethodName]),
        );
        this.selectedMethod = !!selectedMethodName;
      } catch (error) {
        console.warn("Error updating active method: ", error)
      }
      (this.parentElement!.parentElement as any).setPrimaryActionEnabled(!!this.selectedMethod) // TODO: Make this not a hacky shortcut for DWEB!
  }

  static get scopedElements() {
    return {
      'sl-tooltip': SlTooltip,
      'sl-button': SlButton,
      'nh-dimension-slide': NHSlide,
      'nh-card': NHCard,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    :host {
      width: 100%;
      height: 100%;
      border-radius: calc(1px * var(--nh-radii-xl));
      overflow: hidden;
      position: relative;
      color: var(--nh-theme-fg-default);
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 2fr;
      grid-template-rows: 1fr;
      width: 100%;
      gap: calc(1px * var(--nh-spacing-xl));
    }

    .preview-container {
      position: relative;
    }

    @media (max-width: 640px) {
      .container {
        height: 250vh;
        display: flex;
        flex-direction: column;
      }
    }

    .slide {
      left: calc(-1000px);
      position: absolute;

    }
    .slide.active, #pagination.active {
      position: static;
      display: flex;
      width: 100%;
      gap: 4px;
    }

    .choose-assessment-widget > div:first-of-type {
      cursor: pointer;
      display: flex;
      
      background-color: var(--nh-theme-bg-surface);
      border-radius: calc(1px * var(--nh-radii-base));
      color: var(--nh-theme-fg-default);
    }
    
    .choose-widget-button::part(base){
      border-radius: calc(1px * var(--nh-radii-md));
      background-color: var(--nh-theme-bg-surface);
      color: var(--nh-theme-fg-default);
      font-weight: 500;
      width: calc(1rem * var(--nh-spacing-sm));
      border: none;
    }
    .choose-widget-button::part(base) {
      background-color: var(--nh-theme-bg-muted);
    }

  #pagination {
    margin: 0 auto;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center
    width: 100%;
    position: absolute;
    left: -1000px;
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
    border: 2px solid var(--nh-theme-bg-muted);
    
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
    background-color: var(--nh-theme-bg-subtle);
  }

  .widget-display, .widget-choice, .choose-assessment-widget {
    display: flex;
  }
  .widget-choice {
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }

  .select-widget-link:hover .widget-display {
    transition: 0.4s all ease-in;
    cursor: pointer;
    font-family: var(--nh-font-families-headlines);
  } 
  .select-widget-link:hover .widget-display {
    --nh-theme-accent-default: #A179FF;
    border-color: var(--nh-theme-accent-default);
  }
  .select-widget-link.selected .widget-display {
    border-color: var(--nh-theme-accent-muted);
  }
  .select-widget-link:hover sl-button::part(base) {
    --nh-theme-accent-default: #A179FF;
    background-color: var(--nh-theme-accent-default);
  }
  .select-widget-link.selected sl-button::part(base), .select-widget-link.selected:hover sl-button::part(base) {
    color: var(--nh-theme-fg-default);
    font-weight: 400;
    background-color: var(--nh-theme-accent-muted);
  }
  .select-widget-link sl-button::part(base) {
    padding-top: calc(1px * var(--nh-spacing-md));
    padding-bottom: calc(1px * var(--nh-spacing-md));
    --sl-input-height-large: 50px;
    --sl-input-border-width: 10px;
  }

  .widget-display {
    padding: 0 0 16px 0;
    margin-top: 84px;
    display: flex;
    transform: scale(2);
    width: auto;
    flex-wrap: nowrap;
    display: grid;
    place-items: center;
    padding: 0 0 calc(1px * var(--nh-spacing-md)) 0;
    margin-top: calc(1px * var(--nh-spacing-xl));
    font-size: 80%;
  }
  .todo .widget-display {
    top: 20%;
  }
  .widget-card {
    display:none;
  } 
  .widget-card.active {
    display:block;
  } 

  .preview-container span {
    position: absolute;
    bottom: 6%;
    right: 10%;
    display: block;
    background: transparent;
    border: 0;
    padding: 0;
  }


h3 {
  font-weight: var(--nh-font-weights-body-regular);
  margin-bottom: calc(1px * var(--nh-spacing-xl));
  font-size: calc(1px * var(--nh-font-size-lg));
  line-height: var(--nh-line-heights-body-relaxed);
}

.choose-assessment-widget {
  gap: calc(1px * var(--nh-spacing-xl));
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 4rem 1fr;
  grid-template-areas: "h1 h2"
                      "c1 c2";
}
.choose-assessment-widget h3:first-of-type {
  grid-area: h1;
}
.choose-assessment-widget h3:last-of-type {
  grid-area: h2;
}
.choose-assessment-widget div:first-of-type {
  grid-area: c1;
}
.choose-assessment-widget div:last-of-type {
  grid-area: c2;
}
    `,
  ];
}
function generateAssessmentTypeImg(selectedDimensionIndex: number) {
  switch (true) {
    case 3 == selectedDimensionIndex:
    return html`<img src="assessment-type-example-1.png" style="width: 100%; object-fit: cover" />`
    case [1].includes(selectedDimensionIndex):
      return html`<img src="assessment-type-example-2.png" style="width: 100%; object-fit: cover" />`
    case [0,2].includes(selectedDimensionIndex):
      return html`<img src="assessment-type-example-3.png" style="width: 100%; object-fit: cover" />`
  }
}

