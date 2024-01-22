import { compareUint8Arrays } from '@neighbourhoods/app-loader';
import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { object, string, number, ObjectSchema } from 'yup';
import { MatrixStore } from '../../matrix-store';
import { matrixContext, weGroupContext } from '../../context';
import {
  AppInfo,
  CallZomeResponse,
  DnaHash,
  EntryHash,
  EntryHashB64,
  decodeHashFromBase64,
  encodeHashToBase64,
} from '@holochain/client';

import {
  NHAssessmentContainer,
  NHButton,
  NHButtonGroup,
  NHCard,
  NHComponent,
  NHDialog,
  NHForm,
  NHPageHeaderCard,
  NHResourceAssessmentTray,
  NHTooltip,
} from '@neighbourhoods/design-system-components';

import { property, query, state } from 'lit/decorators.js';
import { b64images } from '@neighbourhoods/design-system-styles';
import ResourceDefList from '../resource-def-list';
import { SlDetails, SlIcon } from '@scoped-elements/shoelace';
import { classMap } from 'lit/directives/class-map.js';
import {
  AssessmentWidgetBlockConfig,
  AssessmentWidgetConfig,
  AssessmentWidgetRegistrationInput,
  Dimension,
  NeighbourhoodAppletRenderers,
  RangeKind,
  SensemakerStore,
} from '@neighbourhoods/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { heart, thumb, clap, like_dislike, fire_range } from '../icons-temp';
import { decode } from '@msgpack/msgpack';
import {
  InputAssessmentRenderer,
  createAppDelegate,
  createResourceBlockDelegate,
} from '@neighbourhoods/app-loader';
import { get } from 'svelte/store';
import { Applet, AppletInstanceInfo } from '../../types';
import { FakeInputAssessmentWidgetDelegate } from '@neighbourhoods/app-loader';

function rangeKindEqual(range1: RangeKind, range2: RangeKind) {
  return (
    Object.keys(range1)[0] == Object.keys(range2)[0] && // Number type
    Object.values(range1)[0]!.min == Object.values(range2)[0]!.min &&
    Object.values(range1)[0]!.max == Object.values(range2)[0]!.max
  );
}

export default class NHAssessmentWidgetConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({ attribute: false })
  _matrixStore!: MatrixStore;

  @property({ attribute: false })
  @consume({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  @property() // Selected from the sub-menu of the page
  resourceDef!: any;

  appletRenderers!: NeighbourhoodAppletRenderers;
  currentApplet!: Applet;
  
  @query('nh-form') private _form;
  // @query('#resource-def-list') private _resourceDefList;
  @query("nh-button[type='submit']") private submitBtn;
  // @query('#update-widget-config') updateBtn;
  
  @state() loading: boolean = false;
  @state() editingConfig: boolean = false;
  
  @state() selectWidgetInputValue: string = '';

  fetchedConfig!: AssessmentWidgetBlockConfig[];

  configuredInputWidgets!: AssessmentWidgetConfig[];
  
  @state() private _appletInstanceInfo!: AppletInstanceInfo | undefined;
  @state() private _registeredWidgets: Record<EntryHashB64, AssessmentWidgetRegistrationInput> = {};
  
  @state() private _inputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _outputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  /* Temp - need to add Store method that returns records with entry hashes*/
  @state() private _unpartitionedDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;


  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    this.loading = true;
    try {
      if (!this._sensemakerStore?.value || !this.weGroupId) return;
      await this.fetchDimensionEntries();
      await this.fetchRangeEntries();
      await this.partitionDimensionEntries();
      await this.fetchRegisteredWidgets();
      await this.fetchExistingWidgetConfigBlock();

      const appletInstanceInfos = get(
        this._matrixStore?.getAppletInstanceInfosForGroup(this.weGroupId),
      );
      const applets = get(await this._matrixStore.fetchAllApplets(this.weGroupId));
      if (!applets?.length) return (this.loading = false);

      this.currentApplet = applets[0][1]; // TODO: un-hard code this once we are fed an applet Id (maybe from the nav somewhere.. once it distinguishes between applets)
      this._appletInstanceInfo = appletInstanceInfos?.find(appletInfo => {
        return appletInfo.applet.title == this.currentApplet.title;
      });
      const sameHash = compareUint8Arrays(applets[0][0], this._appletInstanceInfo?.appletId);
      const sameHash2 = compareUint8Arrays(
        applets[0][0],
        this._appletInstanceInfo?.applet.devhubHappReleaseHash,
      );
      this.appletRenderers = await this._matrixStore.fetchAppletInstanceRenderers(
        this._appletInstanceInfo!.appletId,
      );
      // console.log('renderers :>> ', renderers);
    } catch (error) {
      console.error('Could not fetch: ', error);
    }
    this.loading = false;
  }

  protected updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changedProperties.has('fetchedConfig')) {
      this.configuredInputWidgets = this.fetchedConfig.map(widgetRegistrationEntry => {
        return widgetRegistrationEntry.inputAssessmentWidget;
      });
    }
  }

  async fetchExistingWidgetConfigBlock() {
    if (!this._sensemakerStore.value || !this.resourceDef) return;
    try {
      this.fetchedConfig = await this._sensemakerStore.value.getAssessmentWidgetTrayConfig(
        this.resourceDef?.resource_def_eh,
      );
    } catch (error) {
      console.error(error);
    }
  }

  async partitionDimensionEntries() {
    try {
      const input: any = [];
      const output: any = [];
      this._unpartitionedDimensionEntries!.forEach(dimension => {
        if (dimension.computed) {
          output.push(dimension);
          return;
        }
        input.push(dimension);
      });
      this._inputDimensionEntries = input;
      this._outputDimensionEntries = output;
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRegisteredWidgets() {
    try {
      this._registeredWidgets = await this._sensemakerStore.value!.getRegisteredWidgets();
      console.log('this._registeredWidgets  :>> ', this._registeredWidgets);
    } catch (error) {
      console.log('Error fetching widget registrations: ', error);
    }
  }

  render(): TemplateResult {
    return html`
      <main>
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

        <div class="container">
          <div class="widget-block-config">
            <assessment-widget-tray
              .editable=${true}
              .editing=${this.editingConfig}
              @add-widget=${() => {
                this.editingConfig = true;
              }}
            >
              <div slot="widgets">
              ${
                this?.configuredInputWidgets
                  ? this.configuredInputWidgets.map(inputWidgetConfig => {
                      // console.log('inputWidgetConfig :>> ', inputWidgetConfig);
                      const fakeDelegate = new FakeInputAssessmentWidgetDelegate();
                      console.log('fakeDelegate :>> ', fakeDelegate);
                      console.log('this.configuredInputWidgets :>> ', this.configuredInputWidgets);
                      console.log('this.fetchedConfig :>> ', this.fetchedConfig);

                      console.log('this._registeredWidgets :>> ', this._registeredWidgets);
                      // return html`<assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>`
                      // <assessment-widget .icon=${""} .assessmentValue=${0}></assessment-widget>
                      debugger;
                      const widgetEh = encodeHashToBase64(inputWidgetConfig.widgetEh);
                      // const component = this.appletRenderers.assessmentWidgets[]
                      return html`
                        <input-assessment-renderer
                          .component=${NHAssessmentContainer}
                          .nhDelegate=${fakeDelegate}
                        ></input-assessment-renderer>
                      `;
                    })
                  : html`
                      <assessment-widget .icon=${''} .assessmentValue=${0}></assessment-widget>
                    ` // Effectively just one blank space
              }
                <assessment-widget .icon=${''} .assessmentValue=${0}></assessment-widget>
                
                </div>
            </assessment-widget-tray>
            <nh-button
              id="set-widget-config"
              .variant=${'primary'}
              .loading=${(() => this.loading)()}
              .disabled=${(() => this.fetchedConfig && this.fetchedConfig.length == 0)()}
              .size=${'md'}
              @click=${async () => {
                // TODO: setAssessmentWidgetBlock
                // this._formAction = 'update';
                // await this.requestUpdate();
                // this._form?.handleSubmit()
              }}
            >
              ${
                typeof this?.fetchedConfig == 'object' && this?.fetchedConfig?.length > 0
                  ? 'Update'
                  : 'Create'
              }
            </nh-button>
          </div>

          <sl-details
            class="${classMap({
              editing: this.editingConfig,
            })}"
            .open=${this.editingConfig}
            @sl-hide=${(_e: Event) => {
              this.editingConfig = false;
            }}
          >
            <div>
              <h2>Add Assessment Control</h2>
              ${this.renderMainForm()}
            </div>
            <nh-button-group
              .direction=${'horizontal'}
              class="action-buttons"input
            >
              <span slot="buttons">
                <nh-button
                  id="close-widget-config"
                  .variant=${'warning'}
                  .size=${'md'}
                  @click=${() => {
                    this.editingConfig = false;
                    this._form?.resetForm();
                  }}
                >
                  Cancel
                </nh-button>
                <nh-button
                  type="submit"
                  @click=${async () => {
                    // this._formAction = 'create';
                    await this.requestUpdate();
                    await this._form?.handleSubmit();
                    this._form?.resetForm();
                  }}
                  id="add-widget-config"
                  .variant=${'success'}
                  .size=${'md'}
                >
                  Add
                </nh-button>
              </span>
            </nh-button-group>
          </div>
        </sl-details>
      </div>
    </main>`;
  }

  async createEntries(model: any) {
    const resource_def_eh = this.resourceDef?.resource_def_eh;

    const { assessment_widget, input_dimension, output_dimension } = model;

    const selectedWidgetDetails = Object.entries(this._registeredWidgets || {}).find(
      ([_widgetEh, widget]) => widget.name == assessment_widget,
    );
    const selectedWidgetEh = selectedWidgetDetails?.[0];
    if (!selectedWidgetEh) throw Error('Could not get an entry hash for your selected widget.');
    console.log('this._registeredWidgets :>> ', this._registeredWidgets);
    debugger;
    const inputDimensionBinding = {
      appletId: this._appletInstanceInfo?.appletId as any,
      componentName: '',
      dimensionEh: decodeHashFromBase64(input_dimension),
    } as AssessmentWidgetConfig;
    const outputDimensionBinding = {
      appletId: this._appletInstanceInfo?.appletId as any,
      componentName: '',
      dimensionEh: decodeHashFromBase64(output_dimension),
    } as AssessmentWidgetConfig;

    const widgetConfigs = [
      ...((this?.fetchedConfig as any) || []),
      {
        resourceDefEh: resource_def_eh,
        inputAssessmentWidget: inputDimensionBinding,
        outputAssessmentWidget: outputDimensionBinding,
      },
    ];
    let configEh;
    try {
      configEh = await (
        this._sensemakerStore?.value as SensemakerStore
      ).setAssessmentWidgetTrayConfig(resource_def_eh, widgetConfigs);
    } catch (error) {
      // TODO: after nh-form integration, return a Promise.resolve here
      console.log('Error setting assessment widget config: ', error);
    }
    if (!configEh) return;

    await this.updateComplete;
    this.dispatchEvent(
      new CustomEvent('assessment-widget-config-created', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderMainForm(): TemplateResult {
    const rangeEntries = this._rangeEntries as any;

    return html`
      <nh-form
        @change=${async e => {
          this.selectWidgetInputValue = this._form._model.assessment_widget;
          e.currentTarget.requestUpdate();
          await e.currentTarget.updateComplete;
        }}
        .config=${{
          submitBtnRef: (() => this.submitBtn)(),
          rows: [1, 1, 1],
          fields: [
            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '1. Select an assessment widget for this resource: ',
                selectOptions: (() => {
                  return (
                    Object.values(this?._registeredWidgets as any)?.map(widget => ({
                      label: (widget as any).name,
                      value: (widget as any).name,
                      imageB64: (widget as any).name == 'Heart' ? heart : thumb,
                    })) || []
                  );
                })(),
                name: 'assessment_widget',
                id: 'assessment-widget',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],

            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '2. Select the input dimension: ',
                selectOptions: (() =>
                  rangeEntries && rangeEntries.length
                    ? this?._inputDimensionEntries
                        ?.filter(dimension => {
                          const selectedWidgetRangeKind = Object.values(
                            this._registeredWidgets,
                          ).find(widget => widget.name == this.selectWidgetInputValue)?.rangeKind;
                          if (this.selectWidgetInputValue == '' || !selectedWidgetRangeKind) return false;

                          const dimensionRange = rangeEntries.find(range =>
                            compareUint8Arrays(range.range_eh, dimension.range_eh),
                          );

                          return rangeKindEqual(
                            selectedWidgetRangeKind,
                            dimensionRange.kind as RangeKind,
                          );
                        })
                        .map(dimension => {
                          return {
                            label: dimension.name,
                            value: encodeHashToBase64(dimension.dimension_eh),
                          };
                        })
                    : [])(),
                name: 'input_dimension',
                id: 'input-dimension',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],

            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '3. Select the output dimension: ',
                selectOptions: (() =>
                  this?._outputDimensionEntries?.map(dimension => ({
                    label: dimension.name,
                    value: encodeHashToBase64(dimension.dimension_eh),
                  })) || [])(),
                name: 'output_dimension',
                id: 'output-dimension',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],
          ],
          submitOverride: model => this.createEntries(model),
          progressiveValidation: true,
          schema: object({
            assessment_widget: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select a widget'),
            input_dimension: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select an input dimension'),
            output_dimension: string()
              .min(1, 'Must be at least 1 characters')
              .required('Select an output dimension'),
          }),
        }}
      >
      </nh-form>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-form': NHForm,
    'nh-dialog': NHDialog,
    'nh-page-header-card': NHPageHeaderCard,
    'nh-tooltip': NHTooltip,
    'sl-details': SlDetails,
    'sl-icon': SlIcon,
    'assessment-widget-tray': NHResourceAssessmentTray,
    'input-assessment-renderer': InputAssessmentRenderer,
    'assessment-widget': NHAssessmentContainer,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  static get styles() {
    return css`
      /* Layout */
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      main {
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 1fr 5fr;
        grid-template-rows: 4rem minmax(44rem, auto) 100%;
        padding: calc(1px * var(--nh-spacing-xl));
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      .container {
        padding: calc(1px * var(--nh-spacing-lg)) 0;
        grid-column: 1 / -1;
        display: grid;
        align-items: flex-start;
        justify-items: center;
        box-sizing: border-box;
        position: relative;
      }
      
      /* Typo */
      h2 {
        text-align: center;
        margin: 0 auto;
        width: 18rem;
      }

      /* Top of the page display for current widget config with create/update actions */
      .widget-block-config {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        width: 100%;
      }

      /* Slide up accordion for main form container, uses sl-details */

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
        min-height: 28rem;
        padding: calc(1px * var(--nh-spacing-xl));
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

      /* Form actions */
      .action-buttons {
        position: absolute;
        right: calc(1px * var(--nh-spacing-xl));
        bottom: calc(1px * var(--nh-spacing-xs));
      }
  
      /* Form layout */
      nh-form {
        display: flex;
        min-width: initial;
        min-height: 30rem;
      }

      @media (min-width: 1350px) {
        form {
          flex-wrap: nowrap;
          padding-bottom: 0;
          margin-bottom: 0;
        }
        :host {
          overflow: hidden;
        }
      }

    `;
  }

  // COPIED FROM dimension-list, this will need lifting up into the layout component
  // TODO: replace fetches below with new SensemakerStore method calls
  async fetchDimension(entryHash: EntryHash): Promise<CallZomeResponse> {
    try {
      //@ts-ignore
      const appInfo: AppInfo = await this._sensemakerStore.value.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;

      //@ts-ignore
      return this._sensemakerStore.value.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'get_dimension',
        payload: entryHash,
      });
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRange(entryHash: EntryHash): Promise<CallZomeResponse> {
    try {
      //@ts-ignore
      const appInfo: AppInfo = await this._sensemakerStore.value.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;

      //@ts-ignore
      return this._sensemakerStore.value.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'get_range',
        payload: entryHash,
      });
    } catch (error) {
      console.log('Error fetching range details: ', error);
    }
  }

  async fetchDimensionEntriesFromHashes(dimensionEhs: EntryHash[]): Promise<Dimension[]> {
    const response = await Promise.all(dimensionEhs.map(eH => this.fetchDimension(eH)));
    return response.map(payload => {
      try {
        //@ts-ignore
        return decode(payload.entry.Present.entry) as Dimension;
      } catch (error) {
        console.log('Error decoding dimension payload: ', error);
      }
    }) as Dimension[];
  }

  async fetchRangeEntries() {
    await this.fetchRangeEntriesFromHashes(
      this._unpartitionedDimensionEntries.map((dimension: Dimension) => dimension.range_eh),
    );
  }

  async fetchDimensionEntries() {
    try {
      //@ts-ignore
      const appInfo: AppInfo = await this._sensemakerStore.value.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;

      //@ts-ignore
      const response = await this._sensemakerStore.value.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'get_dimensions',
        payload: null,
      });
      this._unpartitionedDimensionEntries = response.map(payload => {
        try {
          const entryHash = payload.signed_action.hashed.content.entry_hash;

          //@ts-ignore
          return {
            ...(decode(payload.entry.Present.entry) as Dimension & { dimension_eh: EntryHash }),
            dimension_eh: entryHash,
          };
        } catch (error) {
          console.log('Error decoding dimension payload: ', error);
        }
      }) as Array<Dimension & { dimension_eh: EntryHash }>;
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
    const response = await Promise.all(rangeEhs.map(eH => this.fetchRange(eH)));
    this._rangeEntries = response.map((payload, index) => {
      try {
        //@ts-ignore
        return { ...(decode(payload.entry.Present.entry) as Range), range_eh: rangeEhs[index] };
      } catch (error) {
        console.log('Error decoding range payload: ', error);
      }
    }) as Array<Range & { range_eh: EntryHash }>;
  }
}
