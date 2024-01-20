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
  encodeHashToBase64
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
import { AssessmentWidgetBlockConfig, AssessmentWidgetRegistrationInput, Dimension, RangeKind, SensemakerStore } from '@neighbourhoods/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { heart, thumb, clap, like_dislike, fire_range } from '../icons-temp';
import { decode } from '@msgpack/msgpack';

function rangeKindEqual(range1: RangeKind, range2: RangeKind) {
  return Object.keys(range1)[0] == Object.keys(range2)[0] // Number type
    && Object.values(range1)[0]!.min == Object.values(range2)[0]!.min
    && Object.values(range1)[0]!.max == Object.values(range2)[0]!.max
}

export default class NHAssessmentWidgetConfig extends NHComponent {
  @consume({ context: matrixContext, subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @property({attribute: false})
  @consume({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  @query('nh-form')
  private _form;
  @query('#resource-def-list')
  private _resourceDefList;
  @query("nh-button[type='submit']")
  submitBtn;
  @query("#update-widget-config")
  updateBtn;

  @state()
  editingConfig: boolean = false;
  @state()
  _formAction: "create" | "update" = "create";

  @state()
  _selectedWidget: string = '';

  @state()
  _registeredWidgets: Record<EntryHashB64, AssessmentWidgetRegistrationInput> = {};
  @state()
  inputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state()
  outputDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;

  /* Temp - need to add Store method that returns records with entry hashes*/
  @state()
  private _dimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;
  @state()
  private _rangeEntries!: Array<Range & { range_eh: EntryHash }>;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    try {
      if(!this._sensemakerStore?.value) return;
      await this.fetchDimensionEntries()
      await this.fetchRangeEntries()
      await this.assignDimensionEntries();
      await this.fetchRegisteredWidgets();
    } catch (error) {
      console.error('Could not fetch: ', error)
    }
  }

  async assignDimensionEntries() {
    try {
      const input : any = [];
      const output : any = [];
      // const dimensionEntries = await this._sensemakerStore.value?.getDimensions();
      this._dimensionEntries!.forEach(dimension => {
        if(dimension.computed) {
          output.push(dimension);
          return;
        }
        input.push(dimension);
      })
      this.inputDimensionEntries = input;
      this.outputDimensionEntries = output;
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  async fetchRegisteredWidgets() {
    try {
      this._registeredWidgets = await this._sensemakerStore.value!.getRegisteredWidgets()
      console.log('this._registeredWidgets  :>> ', this._registeredWidgets );
    } catch (error) {
      console.log('Error fetching widget registrations: ', error);
    }
  }

  render() {
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

        <resource-def-list
          id="resource-def-list"
          .sensemakerStore=${this._sensemakerStore?.value}
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
                      this._form?.resetForm()
                    }}
                  >
                    Cancel
                  </nh-button>
                  <nh-button
                    type="submit"
                    @click=${async () => {
                      this._formAction = 'create';
                      await this.requestUpdate();
                      this._form?.handleSubmit()}
                    }
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
        </main>
    `;
  }

//   <nh-button
//   id="update-widget-config"
//   .variant=${'primary'}
//   .size=${'md'}
//   @click=${async () => {
//     this._formAction = 'update';
//     await this.requestUpdate();
//     this._form?.handleSubmit()
//   }}
// >
//   Update
// </nh-button>
  async createEntries(model: any) {
    const resource_def_eh = model.input_dimension; // temp
    const { assessment_widget, input_dimension, output_dimension } = model;

    const inputDimensionBinding = {
      dimensionEh: input_dimension,
      componentName: assessment_widget
    } as any;
    const outputDimensionBinding = {
      dimensionEh: output_dimension,
      componentName: assessment_widget
    } as any;

    let input: AssessmentWidgetBlockConfig[] = [{
      inputAssessmentWidget: inputDimensionBinding,
      outputAssessmentWidget: outputDimensionBinding
    }];

    let configEh;
    try {
      configEh = await (this._sensemakerStore?.value as SensemakerStore).setAssessmentWidgetTrayConfig(resource_def_eh, input);
    } catch (error) {
      console.log('Error setting assessment widget config: ', error);
    }
    if(!configEh) return
    console.log('configEh :>> ', configEh);

    await this.updateComplete;
    this.dispatchEvent(
      new CustomEvent("assessment-widget-config-created", {
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderMainForm(): TemplateResult {
    const dimensionEntries = this._dimensionEntries as any;
    const rangeEntries = this._rangeEntries as any;

    return html`
      <nh-form @change=${async (e) => { this._selectedWidget = this._form._model.assessment_widget; e.currentTarget.requestUpdate(); await e.currentTarget.updateComplete;}}
        .config=${{
          submitBtnRef: (() => {
            return this._formAction == "create"
            ? this.submitBtn
            : this.updateBtn
          })(),
          rows: [1,1,1],
          fields: [
            [{
              type: 'select',
              selectOptions: (() => {
                return Object.values(this?._registeredWidgets as any)?.map((widget) => ({
                    label: (widget as any).name,
                    value: (widget as any).name,
                    imageB64: (widget as any).name == 'Heart' ? heart : thumb,
                  })) || []
              })(),
              name: "assessment_widget",
              id: "assessment-widget",
              defaultValue: "",
              size: "large",
              required: true,
              placeholder: 'Select',
              label: '1. Select an assessment widget for this resource: ',
            }],
            [{
            type: 'select',
            selectOptions: (() => rangeEntries && rangeEntries.length ? this?.inputDimensionEntries
              ?.filter(
                (dimension) => {
                  const selectedWidgetRangeKind = Object.values(this._registeredWidgets).find(widget => widget.name == this._selectedWidget)?.rangeKind;
                  if(this._selectedWidget == '' || !selectedWidgetRangeKind) return false;

                  const dimensionRange = rangeEntries.find(range => encodeHashToBase64(range.range_eh) == encodeHashToBase64(dimension.range_eh));

                  return rangeKindEqual(selectedWidgetRangeKind, dimensionRange.kind as RangeKind);
              }).map(dimension => {
                  return {
                  label: dimension.name,
                  value: encodeHashToBase64(dimension.dimension_eh)
                }}
            ) : [])(),
            name: "input_dimension",
            id: "input-dimension",
            defaultValue: "",
            size: "large",
            required: true,
            placeholder: 'Select',
            label: '2. Select the input dimension: ',
            }],
            [{
            type: 'select',
            selectOptions: (() => this?.outputDimensionEntries
              ?.map(
                (dimension) => ({
                  label: dimension.name,
                  value: encodeHashToBase64(dimension.dimension_eh),
                })
            ) || [])(),
            name: "output_dimension",
            id: "output-dimension",
            defaultValue: "",
            size: "large",
            required: true,
            placeholder: 'Select',
            label: '3. Select the output dimension: ',
            }]
          ],
          resetOverride() {
            console.log('reset :>>');
          },
          submitOverride: (() => {
            return this._formAction == "create"
            ? (model) => this.createEntries(model)
            : console.log('submit updated :>>')
          })(),
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
          })
        }}
        >
      </nh-form>
    `
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

      nh-form {
        display: flex;
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
        grid-template-rows: 4rem minmax(44rem, auto) 100%;
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
    `;
  }

    // COPIED FROM dimension-list, this will need lifting up into the layout component
    // TODO: replace fetches below with new SensemakerStore method calls
    async fetchDimension(entryHash: EntryHash) : Promise<CallZomeResponse> {
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

    async fetchRange(entryHash: EntryHash) : Promise<CallZomeResponse> {
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

    async fetchDimensionEntriesFromHashes(dimensionEhs: EntryHash[]) : Promise<Dimension[]> {
      const response = await Promise.all(dimensionEhs.map(eH => this.fetchDimension(eH)))
      return response.map(payload => {
        try {
          //@ts-ignore
          return decode(payload.entry.Present.entry) as Dimension
        } catch (error) {
          console.log('Error decoding dimension payload: ', error);
        }
      }) as Dimension[];
    }

    async fetchRangeEntries() {
      await this.fetchRangeEntriesFromHashes(this._dimensionEntries.map((dimension: Dimension) => dimension.range_eh));
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
        this._dimensionEntries = response.map(payload => {
          try {
            const entryHash = payload.signed_action.hashed.content.entry_hash;

          //@ts-ignore
            return { ...decode(payload.entry.Present.entry) as Dimension & { dimension_eh: EntryHash }, dimension_eh: entryHash};
          } catch (error) {
            console.log('Error decoding dimension payload: ', error);
          }
        }) as Array<Dimension & { dimension_eh: EntryHash }>;
      } catch (error) {
        console.log('Error fetching dimension details: ', error);
      }
    }

    async fetchRangeEntriesFromHashes(rangeEhs: EntryHash[]) {
      const response = await Promise.all(rangeEhs.map(eH => this.fetchRange(eH)))
      this._rangeEntries = response.map((payload, index) => {
        try {
          //@ts-ignore
          return { ...decode(payload.entry.Present.entry) as Range, range_eh: rangeEhs[index]}
        } catch (error) {
          console.log('Error decoding range payload: ', error);
        }
      }) as Array<Range & { range_eh: EntryHash }>;
    }
}
