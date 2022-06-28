import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const appletNameAppletTs = ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `import { ContextProvider } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import {
  ${appletNameTitleCase}Store,
  ${appletName}StoreContext,
} from "@holochain-open-dev/${appletName}";
import { InstalledCell } from "@holochain/client";
import { HolochainClient } from "@holochain-open-dev/cell-client";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { LitElement, html } from "lit";

export class ${appletNameTitleCase}Applet extends ScopedElementsMixin(LitElement) {
  @property()
  client!: HolochainClient;

  @property()
  ${appletName}Store!: ${appletNameTitleCase}Store;

  @property()
  cellData!: InstalledCell;

  @state()
  loaded = false;

  async firstUpdated() {

    new ContextProvider(this, ${appletName}StoreContext, this.${appletName}Store);

    // TODO: Initialize any store that you have and create a ContextProvider for it
    //
    // eg:
    // new ContextProvider(this, ${appletName}Context, new ${appletNameTitleCase}Store(cellClient, store));

    this.loaded = true;
  }

  render() {
    if (!this.loaded)
      return html\`<div
        style="display: flex; flex: 1; flex-direction: row; align-items: center; justify-content: center"
      >
        <mwc-circular-progress></mwc-circular-progress>
      </div>\`;

    // TODO: add any elements that you have in your applet
    return html\`<span>This is my applet!</span>\`;
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      // TODO: add any elements that you have in your applet
    };
  }
}
`
});
    