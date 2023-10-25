import { AppInfo, DnaHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { NHButton, NHCard, NHComponentShoelace } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult } from "lit";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { SlInput, SlRange } from "@scoped-elements/shoelace";
import { object, string, boolean, number } from 'yup';
import { ConfigDimension, Range, RangeKind, SensemakerStore } from "@neighbourhoods/client";
import { property, query, state } from "lit/decorators.js";
import { decode } from "@msgpack/msgpack";

const MIN_RANGE = -1000000;
const MAX_RANGE = 1000000;

export default class CreateDimension extends NHComponentShoelace {
  @property()
  sensemakerStore!: SensemakerStore;
  
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _dimensionSchema = object({
    name: string().min(1, "Must be at least 1 characters").required(),
    computed: boolean().required(),
    range: object<Range>().required()
  });
  
  _minRangeBoundary : number = 0;
  _dimensionRangeSchema = () => object({
    min: number().min(MIN_RANGE, "Must be at least " + MIN_RANGE).required(),
    max: number().min(this._minRangeBoundary + 1, "Must be > " + this._minRangeBoundary).max(MAX_RANGE, "Must be at most " + MAX_RANGE),
  });


  @state()
  _dimensionRange: Range = { name: "", kind: { Integer: {
    min: 0,
    max: 1,
  }} as RangeKind };
  @state()
  _dimension: Partial<ConfigDimension> = { name: "", computed: false, range: this._dimensionRange };

  @query("nh-button")
  submitBtn!: NHButton;

  resetInputErrorLabels(inputs: NodeListOf<any>) {
    inputs.forEach(input => {
      input.helpText = "";
      input.nextElementSibling.style.opacity = 0;
      input.nextElementSibling.style.visibility = 'hidden';
    });
  }

  validateIfUntouched(inputs: NodeListOf<any>) {
    let existsUntouched = false;
    inputs.forEach(input => {
      if(input.dataset.touched !== "1") {
        this.handleValidationError.call(this, { path: input.name, err: 'untouched'})
        existsUntouched = true;
      }
    });
    return existsUntouched
  }

  onSubmit() {
    const inputs = this.renderRoot.querySelectorAll("sl-input, sl-range");
    this.resetInputErrorLabels(inputs);
    const fieldsUntouched = this.validateIfUntouched(inputs);
    if(fieldsUntouched) return;

    this._dimensionRangeSchema().validate(this._dimensionRange.kind['Integer'])
      .catch((e) => {this.handleValidationError.call(this, e)})
      .then(async validRange => {
        if(validRange) {
          this._dimensionSchema.validate(this._dimension)
          .then(async _ => {
            this.submitBtn.loading = true; this.submitBtn.requestUpdate("loading");
            const range = await this.createRange()
            await this.createDimension()
          })
          .catch(this.handleValidationError.bind(this))
        }
      })

  }

  fetchValidationErrorText({ path, err }: any) {
    if(err && err == 'untouched') return path + " is required";
    // TODO handle touched but invalid messages
  }

  handleValidationError(err: any) {
    console.log("Error validating profile for field: ", err.path);

    const errorDOM = this.renderRoot.querySelectorAll("label[name=" + err.path + "]")
    if(errorDOM.length == 0) return;
    errorDOM.forEach((errorLabel: any) => {
      errorLabel.style.visibility = 'visible';
      errorLabel.style.opacity = '1';
      
      const slInput : any = errorLabel.previousElementSibling;
      slInput.helpText = this.fetchValidationErrorText(err);
      // slInput.reportValidity()
    })
  }


  onChangeValue(e: CustomEvent) {
    const inputControl = (e.currentTarget as any);
    if(!inputControl.dataset.touched) inputControl.dataset.touched = "1";
    switch (inputControl.name) {
      case 'min':
        this._minRangeBoundary = inputControl.value;
        this._dimensionRange.kind['Integer'].min = inputControl.value;
        break;
      case 'max':
        this._dimensionRange.kind['Integer'].max = inputControl.value;
        break;
      case 'dimension-name':
        this._dimension['name'] = inputControl.value; 
        this._dimensionRange['name'] = inputControl.value + '-range'; 
        break;
      default:
        this._dimension[inputControl.name] = inputControl.value; 
        break;
    }
  }
  
  async createRange() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      console.log('{ ...this._dimension, range: { ...this._dimensionRange, kind: JSON.stringify(this._dimensionRange.kind)}} :>> ', { ...this._dimension, range: { ...this._dimensionRange, kind: JSON.stringify(this._dimensionRange.kind)}});
      const response = await this.sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'create_range',
        payload: {
          "name": "10-scale",
          "kind": `{
            "Integer": { "min": 0, "max": 10 }
          }`,
        },
      });
      console.log('response :>> ', decode(response));
    } catch (error) {
      console.log('Error creating new range for dimension: ', error);
    }
  }
  
  async createDimension() {
    try {
      const appInfo: AppInfo = await this.sensemakerStore.client.appInfo();
      const cell_id = (appInfo.cell_info['sensemaker'][1] as any).cloned.cell_id;
      await this.sensemakerStore.client.callZome({
        cell_id,
        zome_name: 'sensemaker',
        fn_name: 'create_dimension',
        payload: null,
      });
    } catch (error) {
      console.log('Error creating new dimension: ', error);
    }
  }

  render() {
    return html`
      <nh-card .theme=${"dark"} .title=${"Create a Dimension"} .textSize=${"md"}>
        <form>
          <fieldset>
            <div class="field">
              <sl-input label="Dimension Name" size="medium" type="text" name="dimension-name" placeholder=${"Enter a dimension name"} required  value=${this._dimension.name} @sl-input=${(e: CustomEvent) => this.onChangeValue(e)}></sl-input>
              <label class="error" for="dimension-name" name="dimension-name">⁎</label>
            </div>
          </fieldset>
          <fieldset>
            <div class="field">
              <sl-range label="Range Minimum" name="min" value=${this._dimensionRange.kind['Integer'].min} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-range>
              <label class="error" for="min" name="min">⁎</label>
            </div>
          </fieldset>
          <fieldset>
            <div class="field">
              <sl-range label="Range Maximum" name="max" value=${this._dimensionRange.kind['Integer'].max} @sl-change=${(e: CustomEvent) => this.onChangeValue(e)}></sl-range>
              <label class="error" for="max" name="max">⁎</label>
            </div>
          </fieldset>
        </form>

        <div slot="footer">
        <nh-button
          .size=${"auto"}
          .variant=${"primary"}
          @click=${() => this.onSubmit()}
          .disabled=${false}
          .loading=${false}
        >Create Dimension</nh-button>
        </div>
      </nh-card>  
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    "sl-input": SlInput,
    "sl-range": SlRange,
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css`
      :host {
        display: grid;
        flex: 1;
        place-content: center;
        color: var(--nh-theme-fg-default); 
      }

      /* Layout */
      fieldset, .field, .field-row {
        display: flex;
      }

      form, fieldset {
        padding: 0;
      }

      legend {
        visibility: hidden;
        opacity: 0;
        height: 0;
      }

      fieldset {
        border: none;
        flex-direction: column;
      }

      .field-row {
        justify-content: space-between;
        align-items: center;
      }
      
      sl-input::part(form-control) {
        display: grid;
        grid: auto / var(--label-width) 1fr;
        gap: var(--sl-spacing-3x-small) var(--gap-width);
        align-items: center;
      }

      :host *::part(form-control-label) {
        color: red;
      }

      label.error {
        visibility: hidden;
        opacity: 0;
        align-items: center;
        padding: 0 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default); 
      }
    `
    ]
  }
}