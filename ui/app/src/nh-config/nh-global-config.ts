import { html, css } from "lit";
import { contextProvided } from "@lit-labs/context";

import { MatrixStore } from "../matrix-store";
import { matrixContext, weGroupContext } from "../context";
import { DnaHash } from "@holochain/client";

import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import CreateMethod from "./create-method-form";
import CreateDimension from "./create-dimension-form";

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  render() {
    return html`
      <create-dimension></create-dimension>
      <create-method></create-method>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "create-dimension": CreateDimension,
    "create-method": CreateMethod,
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