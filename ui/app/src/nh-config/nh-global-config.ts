import { html, css } from "lit";
import { contextProvided } from "@lit-labs/context";

import { MatrixStore } from "../matrix-store";
import { matrixContext, weGroupContext } from "../context";
import { DnaHash } from "@holochain/client";

import { NHButton, NHComponent } from "@neighbourhoods/design-system-components";
import CreateMethod from "./create-method-form";
import CreateDimension from "./create-dimension-form";
import DimensionList from "./dimension-list";
import { StoreSubscriber } from "lit-svelte-stores";

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _sensemakerStore = new StoreSubscriber(this, () => this._matrixStore?.sensemakerStore(this.weGroupId));

  render() {
    return html`
      <create-dimension></create-dimension>
      <create-method></create-method>
      <dimension-list .sensemakerStore=${this._sensemakerStore.value}></dimension-list>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "create-dimension": CreateDimension,
    "create-method": CreateMethod,
    "dimension-list": DimensionList
  }

  static get styles() {
    return css`
      :host {
        display: grid;
        flex: 1;
        place-content: center;
        color: var(--nh-theme-fg-default); 
        grid-template-columns: 2fr 1fr;
        grid-template-rows: 1fr;
      }

      dimension-list {
        grid-column: 1/-1;
      }
    `;
  }
}