import { DnaHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { NHButton, NHCard, NHComponentShoelace } from "@neighbourhoods/design-system-components";
import { html, css, CSSResult } from "lit";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { SlInput } from "@scoped-elements/shoelace";
import { object, string, boolean } from 'yup';
import { ConfigDimension, Range } from "@neighbourhoods/client";
import { query } from "lit/decorators.js";

export default class CreateDimension extends NHComponentShoelace {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _dimensionSchema = object({
    name: string().min(1, "Must be at least 1 characters").required(),
    computed: boolean().required(),
    range: object<Range>().required()
  });

  _dimension: Partial<ConfigDimension> = { name: "", computed: false, range: undefined };

  @query("nh-button")
  submitBtn!: NHButton;

  onSubmit() {
    this._dimensionSchema.validate(this._dimension)
      .then(async valid => {
        if(!valid) throw new Error("Dimension input data invalid");
        this.submitBtn.loading = true; this.submitBtn.requestUpdate("loading");

        // await this.createPost()
      })
      .catch(this.handleValidationError.bind(this))

  }

  handleValidationError(e) {
    console.log('error :>> ', e);
  }

  onChangeValue(e: CustomEvent) {
    const inputControl = (e.currentTarget as any);
    switch (inputControl.name) {
      // case 'nickname':
      //   break;
      default:
          this._dimension[inputControl.name] = inputControl.value; 
        break;
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
      
      sl-input::part(form-control-label) {
        --sl-input-label-color: red;
      }

      label.error {
        display: none;
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