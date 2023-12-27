import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash } from '@holochain/client';

import {
  NHAssessmentContainer,
  NHButton,
  NHButtonGroup,
  NHCard,
  NHComponent,
  NHDialog,
  NHPageHeaderCard,
  NHResourceAssessmentTray,
  NHTooltip,
} from '@neighbourhoods/design-system-components';

import { query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import AssessmentWidgetConfigForm from './assessment-widget-config-form';
import ResourceDefList from './resource-def-list';
import { SlDetails, SlIcon } from '@scoped-elements/shoelace';
import { classMap } from 'lit/directives/class-map.js';

export default class NHAssessmentWidgetConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('nh-dialog')
  private _dialog;
  @query('assessment-widget-config-form')
  private _form;
  @query('#resource-def-list')
  private _resourceDefList;
  @query("nh-button[type='submit']")
  submitBtn;
  
  @state()
  editingConfig: boolean = false;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  protected async updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {

  }

  render() {
    return html`
      <main
      >
        <nh-page-header-card .heading=${'Assessment Widget Config'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        <resource-def-list
          id="resource-def-list"
          .sensemakerStore=${this._sensemakerStore.value}
        >
        </resource-def-list>

        <div class="container">
          <assessment-widget-tray
            .editable=${true}
            .editing=${this.editingConfig}
            @add-widget=${() => {
              this.editingConfig = true;
            }}
          >
            <div slot="widgets">
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
            </div>
          </assessment-widget-tray>

          <sl-details
            class="slide ${classMap({
              editing: this.editingConfig,
            })}"
            .open=${this.editingConfig}
            @sl-hide=${(_e: Event) => {
              this.editingConfig = false;
            }}
          >
              <div>
                <h2>Assessment Widget Configuration</h2>
                ${this.renderMainForm()}
              </div>
              <nh-button-group 
                .direction=${"horizontal"}
                class="action-buttons"
              >
                <span slot="buttons">
                  <nh-button
                    id="close-widget-config"
                    .variant=${'warning'}
                    .size=${'md'}
                    @click=${() => {
                      this.editingConfig = false;
                    }}
                  >
                    Cancel
                  </nh-button>
                  <nh-button
                    id="update-widget-config"
                    .variant=${'primary'}
                    .size=${'md'}
                    @click=${() => {
                    }}
                  >
                    Update
                  </nh-button>
                  <nh-button
                    id="add-widget-config"
                    .variant=${'success'}
                    .size=${'md'}
                    @click=${() => {
                    }}
                  >
                    Create
                  </nh-button>
                </span>
              </nh-button-group>
            </div>
          </sl-details>
        </div>
      </main>
    `;
  }

  private renderMainForm(): TemplateResult {
    return html`<assessment-widget-config-form></assessment-widget-config-form>`
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-tooltip': NHTooltip,
    'sl-details': SlDetails,
    'sl-icon': SlIcon,
    'assessment-widget-config-form': AssessmentWidgetConfigForm,
    'resource-def-list': ResourceDefList,
    'assessment-widget-tray': NHResourceAssessmentTray,
    'assessment-widget': NHAssessmentContainer,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }
  
  static get styles() {
    return css`
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      .container {
        flex-direction: column;
        align-items: flex-start;
      }

      .action-buttons {
        position: absolute; 
        right: calc(1px * var(--nh-spacing-xl));
        bottom: calc(1px * var(--nh-spacing-xs));
      }

      h2 {
        text-align: center;
        margin: 0 auto;
        width: 18rem;
      }

      main {
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 1fr 5fr;
        grid-template-rows: 4rem auto;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      resource-def-list {
        grid-column: 1 / 1;
        display: flex;
        align-items: start;
      }

      .container {
        padding: calc(1px * var(--nh-spacing-lg)) 0;
        grid-column: 2 / -1;
        display: grid;
        align-items: flex-start;
        justify-items: center;
        box-sizing: border-box;
        position: relative;
      }

      sl-details {
        width: 100%;
        position: absolute;
        bottom: 0;
      }

      sl-details.editing::part(header) {
        pointer-events: none;
        height: 0px;
        padding: 0;
      }

      sl-details.editing::part(base) {
        opacity: 1;
      }

      sl-details::part(content) {
        min-height: 24rem;
      }

      sl-details::part(base) {
        opacity: 0;
        transition: 0.5s all cubic-bezier(0.4, 0, 1, 1);

        border-radius: calc(1px * var(--nh-radii-lg));
        background-color: var(--nh-theme-bg-surface);
        border-color: var(--nh-theme-fg-disabled);
        margin: 0 calc(1px * var(--nh-spacing-lg));
      }

      sl-details::part(summary-icon) {
        display: none;
      }
    `;
  }
}
