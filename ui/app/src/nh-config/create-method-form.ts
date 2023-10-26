import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { SensemakerStore } from "@neighbourhoods/client";
import { property } from "lit/decorators.js";
import CreateDimension from "./create-dimension-form";

export default class CreateMethod extends NHComponent {
  @property()
  sensemakerStore!: SensemakerStore;

  render() {
    return html`
      <create-dimension .dimensionType=${"output"} .sensemakerStore=${this.sensemakerStore}></create-dimension>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    'create-dimension': CreateDimension,
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