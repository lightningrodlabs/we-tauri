import { DnaHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { NHButton, NHCard, NHComponent } from "@neighbourhoods/design-system-components";
import { html, css } from "lit";
import { matrixContext, weGroupContext } from "../context";
import { MatrixStore } from "../matrix-store";

export default class CreateDimension extends NHComponent {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  render() {
    return html`
      <nh-card .theme=${"light"} .title=${"Create a Dimension"} .textSize=${"md"}>

      </nh-card>  
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        flex: 1;
        place-content: center;
        color: var(--nh-theme-fg-default); 
      }
    `;
  }
}