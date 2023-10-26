import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { SensemakerStore } from "@neighbourhoods/client";
import { property } from "lit/decorators.js";
import CreateDimension from "./create-dimension-form";
import { SlRadio, SlRadioGroup } from "@scoped-elements/shoelace";

export default class CreateMethod extends NHComponent {
  @property()
  sensemakerStore!: SensemakerStore;

  render() {
    return html`
      <create-dimension .dimensionType=${"output"} .sensemakerStore=${this.sensemakerStore}></create-dimension>
      <fieldset>
        <div class="field">
          <sl-radio-group label="Select an option" name="a" value="1">
            <sl-radio value="1">AVG</sl-radio>
            <sl-radio value="2">SUM</sl-radio>
          </sl-radio-group>
        </div>
      </fieldset>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    'create-dimension': CreateDimension,
    'sl-radio': SlRadio,
    'sl-radio-group': SlRadioGroup,
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default); 
      }
    `;
  }
}