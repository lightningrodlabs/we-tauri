import { css, CSSResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';

import { encodeHashToBase64 } from '@holochain/client';
import { Readable } from '@holochain-open-dev/stores';
import { get } from 'svelte/store';
import { AppletConfig, SensemakerStore } from '@neighbourhoods/client';
import { SlIconButton, SlTooltip } from '@scoped-elements/shoelace';
import { NHDimensionSlide } from '../components/nh/layout/dimension-slide';
import { classMap } from 'lit/directives/class-map.js';
import { NHCard } from '../components/nh/layout/card';

export class NHSensemakerSettings extends NHComponentShoelace {
  @property()
  sensemakerStore!: SensemakerStore;
  @state()
  appletDetails;
  @property()
  selectedDimensionIndex: number = 0;
  @state()
  activeMethodsDict = new Map();

  connectedCallback() {
    super.connectedCallback();
    let store: Readable<AppletConfig> = this.sensemakerStore?.appletConfig();
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
            debugger;
      });
  }

  decrementSelectedDimensionIndex() {
    this.selectedDimensionIndex -= 1;
    this.requestUpdate();
  }

  incrementSelectedDimensionIndex() {
    this.selectedDimensionIndex += 1;
    this.requestUpdate();
  }

  renderDimensionSlides(slideSubtitle: string, dimensionNames: string[], activeMethod: any) {
    return html` <div class="container">
      <nh-card title=${'PREVIEW ' + slideSubtitle}>
        <img src="post-example.png" style="width: 100%; object-fit: cover" />
      </nh-card>
      ${dimensionNames.map(
        (dimension, i) => html`
          <nh-card
            title="Assessment"
            heading=${'Dimension: ' + dimension}
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
                <h3>1. Select an assessment type: (MOCK)</h3>
                <h3>2. Choose an emoji:</h3>
                <div><img src="assessment-type-example.png" style="width: 100%; object-fit: cover" /></div>
                <div>${activeMethod && activeMethod[0]}
                

          <sl-tooltip content="Settings">
          <sl-icon-button @click=${() => this.handleUpdateActiveMethod('methodName', 'resourceDefEh')} name="gear" label="Settings"></sl-icon-button>
        </sl-tooltip>
                </div>
              </div>
              ${this.renderPagination(i, dimensionNames)}
            </nh-dimension-slide>
          </nh-card>
        `,
      )}
    </div>`;
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
          <li><a class="pagination-number" @click=${this.decrementSelectedDimensionIndex}></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="pagination-number" @click=${this.incrementSelectedDimensionIndex}></a></li>
        </ul>`;
      case dimensionIndex == dimensionNames.length - 1:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a class="pagination-number" @click=${this.decrementSelectedDimensionIndex}></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="pagination-number hidden"></a></li>
        </ul>`;

      default:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a class="pagination-number hidden"></a></li>
          ${renderRestOfPagination(dimensionIndex)}
          <li><a class="pagination-number" @click=${this.incrementSelectedDimensionIndex}></a></li>
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
            ${this.renderDimensionSlides(key, Object.keys(this.appletDetails.methods), activeMethod)}
          `;
        })}
    `;
  }

  handleUpdateActiveMethod(selectedMethodName, resourceDefEh) {
    console.log('selectedMethodName', selectedMethodName);
    const activeMethod = this.activeMethodsDict.get(resourceDefEh);

    if (activeMethod !== selectedMethodName)
      this.sensemakerStore.updateActiveMethod(
        resourceDefEh,
        encodeHashToBase64(this.appletDetails.methods[selectedMethodName]),
      );
  }

  static get scopedElements() {
    return {
      'sl-tooltip': SlTooltip,
      'sl-icon-button': SlIconButton,
      'nh-dimension-slide': NHDimensionSlide,
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
        
    .choose-assessment-widget  {
      display: flex;
    }

    .choose-assessment-widget > div:first-of-type {
      cursor: pointer;
      display: flex;
      
      background-color: var(--nh-theme-bg-surface);
      border-radius: calc(1px * var(--nh-radii-base));
      color: var(--nh-theme-fg-default);
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
  a, span {
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
  a {
    background-repeat: no-repeat;
    background-size: cover;
    border: none;
    background-color: transparent;
  }
  a:hover {
    background-color: var(--nh-theme-bg-surface);
  }
  a:not(.hidden) {
    background-image: url(icons/next-arrow.png);
  }
  a.hidden {
    background-image: url(icons/back-arrow.png);
  }
  li:first-child a:not(.hidden) {
    transform: rotate(180deg);
  }
  li:last-child a.hidden {
    transform: rotate(180deg);
  }
  .pagination-number.active {
--nh-theme-accent-default: #A179FF;
    background-color: var(--nh-theme-accent-default);
  }

  .pagination-number:hover:not(.active) {
    background-color: var(--nh-theme-bg-subtle);
  }

  .widget-card {
    display:none;
  } 
  .widget-card.active {
    display:block;
  } 


h3 {
  font-weight: var(--nh-font-weights-body-regular);
  margin-bottom: calc(1px * var(--nh-spacing-xl));
  font-size: calc(1px * var(--nh-font-size-lg));
  line-height: var(--nh-line-heights-body-relaxed);
}

.choose-assessment-widget {
  gap: calc(1px * var(--nh-spacing-xl));;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 4rem 1fr;
  grid-template-areas: "h1 h2"
                      "c1 c2";
  margin-bottom: calc(1rem * var(--nh-spacing-sm));
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
