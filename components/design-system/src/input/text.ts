import { classMap } from 'lit/directives/class-map.js';
import { css, CSSResult, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { NHComponentShoelace } from '../ancestors/base';
import { SlInput } from '@shoelace-style/shoelace';


export default class NHTextInput extends NHComponentShoelace {
  @state()
  label?: string = "Your field";
  @state()
  placeholder?: string = "Select your option:";
  @state()
  value?: string = undefined;

  handleInputChange(e: Event) {
    this.value = (e.target as SlInput).value

    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <sl-input
        required
        slot="hoverable"
        type="text"
        label="Dimension Name"
        size="medium"
        name="name"
        .value=${this.value}
        @sl-input=${this.handleInputChange}
      ></sl-input>
      <label
        class="error"
        for="input_dimension"
        name="input_dimension"
        data-name="input_dimension"
        >⁎</label>
    `;
  }

  reset() {
    this.value = undefined;
  }

  static elementDefinitions = {
    'sl-input': SlInput,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
      }

    `,
  ];
}