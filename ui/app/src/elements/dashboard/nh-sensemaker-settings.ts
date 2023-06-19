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

  renderDimensionSlides(dimensionNames: string[]) {
    return dimensionNames.map(
      (dimension, i) => html`
        <nh-dimension-slide
          heading=${dimension}
          class="slide ${classMap({
            active: i == this.selectedDimensionIndex,
          })}"
        >
          ${this.renderPagination(i, dimensionNames)}
        </nh-dimension-slide>
      `,
    );
  }
  renderPagination(dimensionIndex: number, dimensionNames: string[]) {
    const renderRestOfPagination = (currentIndex: number) => html`
      ${dimensionNames.map((_, i) => {
        return html`<li>
          <span
            class="pagination-number ${classMap({
              active: i == this.selectedDimensionIndex,
            })}"
            @click=${() => this.selectedDimensionIndex = i }
          >
            ${i + 1}</span
          >
        </li>`;
      })}
    `;

    switch (true) {
      case dimensionIndex > 0:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          <li><a @click=${this.decrementSelectedDimensionIndex}>«</a></li>
          ${renderRestOfPagination(dimensionIndex)}
        </ul>`;
      case dimensionIndex < dimensionNames.length - 1:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          ${renderRestOfPagination(dimensionIndex)}
          <li><a @click=${this.incrementSelectedDimensionIndex}>»</a></li>
        </ul>`;

      default:
        return html`<ul
          id="pagination"
          class=${classMap({
            active: dimensionIndex == this.selectedDimensionIndex,
          })}
        >
          ${renderRestOfPagination(dimensionIndex)}
        </ul>`;
    }
  }

  render() {
    // for each resource def, have a dropdown, which is all the dimensions available

    return html`
      ${this.renderDimensionSlides(Object.keys(this.appletDetails.methods))}
      ${Object.entries(this.appletDetails.resource_defs)
        .slice(1)
        .map(([key, eH]: any) => {
          const resourceDefEh = encodeHashToBase64(eH);
          const activeMethod = this.activeMethodsDict.get(resourceDefEh);
          return html`
            <mwc-select
              value=${activeMethod ? activeMethod[0] : null}
              @change=${e => this.updateActiveMethod(e, resourceDefEh)}
            >
            </mwc-select>
            <sl-tooltip content="Settings">
              <span>${key}</span>
              <sl-icon-button name="gear" label="Settings"></sl-icon-button>
            </sl-tooltip>
          `;
        })}
    `;
  }

  updateActiveMethod(event, resourceDefEh) {
    console.log('selected method', event.target.value);
    const selectedMethodName = event.target.value;
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
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    :host {
      width: 100%;
      border-radius: calc(1px * var(--nh-radii-xl));
      background-color: var(--nh-theme-bg-subtle);
      padding: calc(1px * var(--nh-spacing-xl));
      overflow: hidden;
      height: 80vh
      position: relative;
    }

    .slide {
      left: calc(-1000px);

      position: relative;

    }
    .slide.active {
      left: 0;
    }
        #pagination {
          margin: 0 auto;
          display: flex;
          padding: 0;
          text-align: center
          width: 100%;
          align-items: center;
          position: absolute;
          left: -1000px;
        }
        #pagination.active {
          left: 0;
        }

        #pagination li {
          display: inline;
        
        }
        .pagination-number {
          display: block;
          text-decoration: none;
          color: #000;
          padding: 5px 10px;
          border: 1px solid #ddd;
          float: left;
        
        }
        .pagination-number {
          -webkit-transition: background-color 0.4s;
          transition: background-color 0.4s
        }
        .pagination-number.active {
          background-color: #4caf50;
          color: #fff;
        }
        .pagination-number:hover:not(.active) {
          background: #ddd;
        }
    `,
  ];
}
