import { html, css, TemplateResult, PropertyValueMap } from 'lit';
import { consume } from '@lit/context';
import { StoreSubscriber } from 'lit-svelte-stores';

import { object, string } from 'yup';
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
import { compareUint8Arrays } from '@neighbourhoods/app-loader';

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
import { SlDetails, SlSpinner } from '@scoped-elements/shoelace';
import { classMap } from 'lit/directives/class-map.js';
import {
  AssessmentWidgetBlockConfig,
  AssessmentWidgetConfig,
  AssessmentWidgetRegistrationInput,
  AssessmentWidgetRenderer,
  AssessmentWidgetRenderers,
  Dimension,
  Method,
  NeighbourhoodAppletRenderers,
  ResourceDef,
  SensemakerStore,
} from '@neighbourhoods/client';
import { decode } from '@msgpack/msgpack';
import {repeat} from 'lit/directives/repeat.js';
import { InputAssessmentRenderer } from '@neighbourhoods/app-loader';
import { get } from 'svelte/store';
import { Applet, AppletInstanceInfo } from '../../types';
import { FakeInputAssessmentWidgetDelegate } from '@neighbourhoods/app-loader';
import { dimensionIncludesControlRange } from '../../utils';

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
  resourceDef!: ResourceDef & {resource_def_eh: EntryHash };

  appletRenderers!: NeighbourhoodAppletRenderers;
  currentApplet!: Applet;
  
  @query('nh-form') private _form;
  @query("nh-button[type='submit']") private submitBtn;
  
  @state() loading: boolean = false;
  @state() editingConfig: boolean = false;
  @state() placeHolderWidget!: () => TemplateResult;
  @state() configuredWidgetsPersisted: boolean = true; // Is the in memory representation the same as on DHT?
  
  @state() selectedWidgetKey: string | undefined; // nh-form select options for the 2nd/3rd selects are configured dynamically when this state change triggers a re-render
  @state() selectedInputDimensionEh: EntryHash | undefined; // used to filter for the 3rd select
  
  @state() _workingWidgetControls!: AssessmentWidgetBlockConfig[];
  @state() _workingWidgetControlRendererCache: Record<string, any> = new Map();

  // AssessmentWidgetBlockConfig (group) and AssessmentWidgetRegistrationInputs (individual)
  @state() private _fetchedConfig!: AssessmentWidgetBlockConfig[];
  @state() private _registeredWidgets: Record<EntryHashB64, AssessmentWidgetRegistrationInput> = {};
  
  // Derived from _fetchedConfig
  @state() configuredInputWidgets!: AssessmentWidgetBlockConfig[];
  
  @state() private _appletInstanceInfo!: AppletInstanceInfo | undefined;
  
  @state() private _inputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _outputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  /* Temp - need to add Store method that returns records with entry hashes*/
  @state() private _unpartitionedDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state() private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;
  @state() private _methodEntries!: any;


  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    this.loading = true;
    try {
      if (!this._sensemakerStore?.value || !this.weGroupId) return;
      await this.fetchDimensionEntries();
      await this.fetchRangeEntries();
      await this.fetchMethodEntries();
      await this.partitionDimensionEntries();
      await this.fetchRegisteredWidgets();
      await this.fetchExistingWidgetConfigBlock();

      await this.fetchCurrentAppletInstanceInfo();
      if(this._appletInstanceInfo) {
        await this.fetchCurrentAppletInstanceRenderers();
      }
      this.loading = false;
    } catch (error) {
      console.error('Could not fetch/assign applet and widget data: ', error);
      this.loading = false;
    }
  }

  private findInputDimensionsForOutputDimension(outputDimensionEh: EntryHash) {
    const methods = this._methodEntries.filter((method: Method) => compareUint8Arrays(method.output_dimension_eh, outputDimensionEh))
    
    return methods.map((method: Method) => method.input_dimension_ehs[0])
  }

  private getCombinedWorkingAndFetchedWidgets() {
    let widgets: AssessmentWidgetBlockConfig[]
    if(this._fetchedConfig && this._workingWidgetControls && this._workingWidgetControls.length > 0) {
      widgets = this._fetchedConfig.length > 0 ? [
        ...this._fetchedConfig, ...this._workingWidgetControls
      ] : this._workingWidgetControls;
    } else if(this._fetchedConfig) {
      widgets = this._fetchedConfig;
    } else {
      widgets = [];
    }
    return widgets;
  }

  renderWidgetControlPlaceholder() {
    if(typeof this.selectedWidgetKey != 'undefined' && this?._workingWidgetControlRendererCache.has(this.selectedWidgetKey) && this?.placeHolderWidget) {
      return repeat([this.selectedWidgetKey], () => +(new Date), (_, _idx) =>this?.placeHolderWidget())
    }
    return html`<sl-spinner class="icon-spinner"></sl-spinner>`
  }

  render(): TemplateResult {
    let renderableWidgets = (this.configuredInputWidgets || this.getCombinedWorkingAndFetchedWidgets())?.map((widgetRegistrationEntry: AssessmentWidgetBlockConfig) => widgetRegistrationEntry.inputAssessmentWidget as AssessmentWidgetConfig)
    console.log('renderableWidgets :>> ', renderableWidgets);
    return html`
      <main @assessment-widget-config-set=${async () => {await this.fetchRegisteredWidgets()}}>
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
              .editing=${!!this.editingConfig}
              @add-widget=${async (e: CustomEvent) => {
                this.editingConfig = true;
              }}
            >
              <div slot="widgets"><div style="display: flex; gap: 4px;">
                ${
                  this?.appletRenderers && (this._fetchedConfig && this._fetchedConfig.length > 0 || this?._workingWidgetControls)
                    ? repeat(renderableWidgets, () => +(new Date), (inputWidgetConfig, _index) => {
                        if(!this.appletRenderers) return;
                        const fakeDelegate = new FakeInputAssessmentWidgetDelegate();
                        const filteredComponentRenderers = Object.values(this.appletRenderers.assessmentWidgets as AssessmentWidgetRenderers).filter(component => component.name == (inputWidgetConfig as any).componentName);
                        const componentToBind = filteredComponentRenderers[0].component;
                        return html`
                          <input-assessment-renderer
                            .component=${componentToBind}
                            .nhDelegate=${fakeDelegate}
                          ></input-assessment-renderer>
                        `;
                      })
                    : null
                }
                ${this.loading || this.editingConfig || !this._fetchedConfig || !this.appletRenderers 
                  ? html`<div style="display: grid; place-content: center; height: 48px; min-width: 48px;">
                      ${this.renderWidgetControlPlaceholder()}
                    </div>` 
                  : html`<assessment-widget .icon=${''} .assessmentValue=${0}></assessment-widget>`}
              </div></div>
            </assessment-widget-tray>
            <nh-button
              id="set-widget-config"
              .variant=${'primary'}
              .loading=${this.loading}
              .disabled=${!this.loading && this._fetchedConfig && this.configuredWidgetsPersisted}
              .size=${'md'}
              @click=${async () => {await this.createEntries(); this.configuredWidgetsPersisted = true}}
            >Update Config</nh-button>
          </div>

          <sl-details
            class="${classMap({
              editing: !!this.editingConfig,
            })}"
            .open=${!!this.editingConfig}
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
                  .variant=${'danger'}
                  .size=${'md'}
                  @click=${() => {
                    this.editingConfig = false;
                    this._form?.resetForm();
                  }}
                >Cancel</nh-button>

                <nh-button
                  id="reset-widget-config"
                  .variant=${'warning'}
                  .size=${'md'}
                  @click=${() => {
                    this._workingWidgetControls = [];
                    this.selectedWidgetKey = undefined;
                    this._form?.resetForm();
                    this.requestUpdate()
                  }}
                >Reset</nh-button>
                
                <nh-button
                  type="submit"
                  @click=${async () => {
                    await this._form?.handleSubmit();
                    this._form?.resetForm();
                    this.editingConfig = false;
                  }}
                  id="add-widget-config"
                  .variant=${'success'}
                  .size=${'md'}
                >Add</nh-button>
              </span>
            </nh-button-group>
          </div>
        </sl-details>
      </div>
    </main>`;
  }

  async pushToInMemoryWidgetControls(model: any) {
    const { assessment_widget, input_dimension, output_dimension } = model;

    const selectedWidgetDetails = Object.entries(this._registeredWidgets || {}).find(
      ([_widgetEh, widget]) => widget.name == assessment_widget,
    );
    const selectedWidgetEh = selectedWidgetDetails?.[0];
    if (!selectedWidgetEh) throw Error('Could not get an entry hash for your selected widget.');

    const inputDimensionBinding = {
      type: "applet",
      appletId: this._appletInstanceInfo?.appletId as any, // TODO: Needs changing from string to EntryHash in the client package before correct typing here
      componentName: assessment_widget,
      dimensionEh: decodeHashFromBase64(input_dimension),
    } as AssessmentWidgetConfig;
    const outputDimensionBinding = {
      type: "applet",
      appletId: this._appletInstanceInfo?.appletId as any,
      componentName: assessment_widget,
      dimensionEh: decodeHashFromBase64(output_dimension),
    } as AssessmentWidgetConfig;
    const input = {
      inputAssessmentWidget: inputDimensionBinding,
      outputAssessmentWidget: outputDimensionBinding,
    }

    this.configuredInputWidgets = [ ...this?.getCombinedWorkingAndFetchedWidgets(), input];
    this._workingWidgetControls = [ ...(this?._workingWidgetControls || []), input];
    
    this.configuredWidgetsPersisted = false;
    this.requestUpdate();
  }

  async createEntries() {
    if(!this._workingWidgetControls || !(this._workingWidgetControls.length > 0)) throw Error('Nothing to persist, try adding another widget to the config.')
    const resource_def_eh = this.resourceDef?.resource_def_eh;

    let successful;
    try {
      successful = await (
        this._sensemakerStore?.value as SensemakerStore
      ).setAssessmentWidgetTrayConfig(resource_def_eh, this.getCombinedWorkingAndFetchedWidgets());
    } catch (error) {
      // TODO: after nh-form integration, return a Promise.resolve here
      console.log('Error setting assessment widget config: ', error);
    }
    if (!successful) return;
    console.log('successfully set the widget tray config? ', successful);
    await this.updateComplete;
    this._form.dispatchEvent(
      new CustomEvent('assessment-widget-config-set', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  handleFormChange = async e => {
    const widgets = typeof this._registeredWidgets == 'object' && Object.values(this._registeredWidgets) || []

    const selectedWidget = widgets?.find(widget => widget.name == this._form._model.assessment_widget);
    this.selectedWidgetKey = selectedWidget?.widgetKey;
    this.placeHolderWidget = this?._workingWidgetControlRendererCache.get(this.selectedWidgetKey)
    
    this.selectedInputDimensionEh = this._form._model.input_dimension;

    e.currentTarget.requestUpdate();
    await e.currentTarget.updateComplete;
  }

  private renderMainForm(): TemplateResult {
    return html`
      <nh-form
        @change=${this.handleFormChange}
        .config=${{
          submitBtnRef: (() => this.submitBtn)(),
          rows: [1, 1, 1],
          fields: [
            [
              {
                type: 'select',
                placeholder: 'Select',
                label: '1. Select an assessment widget for this resource: ',
                selectOptions: (() =>
                  this?._registeredWidgets && this?.appletRenderers
                    ? Object.values(this._registeredWidgets)!
                      .filter((widget: AssessmentWidgetRegistrationInput) => widget.kind == "input")
                      .map((widget: AssessmentWidgetRegistrationInput) => {
                          let renderBlock;
                          if(this?._workingWidgetControlRendererCache.has(widget.widgetKey)) {
                            renderBlock = this._workingWidgetControlRendererCache.get(widget.widgetKey);
                          } else {
                            const fakeDelegate = new FakeInputAssessmentWidgetDelegate();
                            const renderer: AssessmentWidgetRenderer = this.appletRenderers.assessmentWidgets![widget.widgetKey]
                            renderBlock = () => html`
                            <input-assessment-renderer
                              .component=${renderer.component}
                              .nhDelegate=${fakeDelegate}
                            ></input-assessment-renderer>`
                            this?._workingWidgetControlRendererCache.set(widget.widgetKey, renderBlock)
                          }
                          
                          return ({
                            label: widget.name,
                            value: widget.name,
                            renderBlock
                          })})
                    : []
                )(), // IIFE regenerates select options dynamically
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
                  this._rangeEntries && this._rangeEntries.length
                    ? this?._inputDimensionEntries
                        ?.filter(dimension => {
                          const selectedWidgetRangeKind = Object.values(
                            this._registeredWidgets,
                          ).find(widget => widget.widgetKey == this.selectedWidgetKey)?.rangeKind;
                          if (typeof this.selectedWidgetKey == 'undefined' || !selectedWidgetRangeKind) return false;

                          const dimensionRange = this._rangeEntries!.find(range =>
                            compareUint8Arrays(range.range_eh, dimension.range_eh),
                          ) as any;
                          return dimensionIncludesControlRange(
                            dimensionRange.kind,
                            selectedWidgetRangeKind,
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
                this._methodEntries && this?._outputDimensionEntries
                  ? this._outputDimensionEntries
                    ?.filter(dimension => {
                      if(typeof this._methodEntries !== 'undefined') {
                        const inputDimensions = this.findInputDimensionsForOutputDimension(dimension.dimension_eh);
                        return inputDimensions.map(eh => encodeHashToBase64(eh)).includes(this._form._model.input_dimension)
                      } else return false
                    })
                    .map(dimension => ({
                      label: dimension.name,
                      value: encodeHashToBase64(dimension.dimension_eh),
                    }))
                  : []).bind(this)(),
                name: 'output_dimension',
                id: 'output-dimension',
                defaultValue: '',
                size: 'large',
                required: true,
              },
            ],
          ],
          submitOverride: model => {console.log('submitted'); this.pushToInMemoryWidgetControls(model)},
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
    'sl-spinner': SlSpinner,
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

      input-assessment-renderer {
        display: flex;
        align-items: center;
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
        max-width: initial !important;
        min-height: 30rem;
      }
      
      .icon-spinner {
        font-size: 1.5rem;
        --speed: 10000ms;
        --track-width: 4px;
        --indicator-color: var(var(--nh-theme-fg-muted);
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

  async fetchExistingWidgetConfigBlock() {
    if (!this._sensemakerStore.value || !this.resourceDef) return;
    try {
      this._fetchedConfig ||= await this._sensemakerStore.value.getAssessmentWidgetTrayConfig(
        this.resourceDef?.resource_def_eh,
      );
      this.configuredWidgetsPersisted = true;
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

  async fetchCurrentAppletInstanceInfo() {
    try {
      const appletInstanceInfos = get(
        this._matrixStore?.getAppletInstanceInfosForGroup(this.weGroupId),
      );
      const applets = get(await this._matrixStore.fetchAllApplets(this.weGroupId));

      this.currentApplet = applets[0][1]; // TODO: un-hard code this once we are fed an applet Id (maybe from the nav somewhere.. once it distinguishes between applets)
      this._appletInstanceInfo = appletInstanceInfos?.find(appletInfo => {
        return appletInfo.applet.title == this.currentApplet.title;
      });
    } catch (error) {
      console.log('Error fetching applet instance info ', error);
    }
  }

  async fetchCurrentAppletInstanceRenderers() {
    try {
      this.appletRenderers = await this._matrixStore.fetchAppletInstanceRenderers(
        this._appletInstanceInfo!.appletId,
      );
    } catch (error) {
      console.log('Error fetching appleticon-spinner renderers ', error);
    }
  }

  async fetchRegisteredWidgets() {
    try {
      this._registeredWidgets = await this._sensemakerStore.value!.getRegisteredWidgets();
    } catch (error) {
      console.log('Error fetching widget registrations: ', error);
    }
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

  async fetchMethodEntries() {
    this._methodEntries = await this._sensemakerStore.value?.getMethods();
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
