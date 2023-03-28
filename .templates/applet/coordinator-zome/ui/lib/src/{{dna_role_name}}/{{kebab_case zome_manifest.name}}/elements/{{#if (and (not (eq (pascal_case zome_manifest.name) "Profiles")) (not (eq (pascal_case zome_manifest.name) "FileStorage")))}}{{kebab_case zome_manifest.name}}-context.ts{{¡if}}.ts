import { css, html, LitElement } from 'lit';
import { provide } from '@lit-labs/context';
import { customElement, property } from 'lit/decorators.js';

import { {{camel_case zome_manifest.name}}StoreContext } from '../context.js';
import { {{pascal_case zome_manifest.name}}Store } from '../{{kebab_case zome_manifest.name}}-store.js';

@customElement('{{kebab_case zome_manifest.name}}-context')
export class {{pascal_case zome_manifest.name}}Context extends LitElement {
  @provide({ context: {{camel_case zome_manifest.name}}StoreContext })
  @property({ type: Object })
  store!: {{pascal_case zome_manifest.name}}Store;

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
