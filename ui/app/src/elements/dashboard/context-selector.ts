import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { customElement, state } from 'lit/decorators.js';
import { SensemakerStore, AppletConfig, sensemakerStoreContext } from '@neighbourhoods/client';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { contextProvided } from '@lit-labs/context';
import { NHButton, NHButtonGroup } from '@neighbourhoods/design-system-components';

@customElement("context-selector")
export class ContextSelector extends ScopedRegistryHost(LitElement) {
  @contextProvided({ context: sensemakerStoreContext })
  sensemakerStore!: SensemakerStore;

  // config: StoreSubscriber<AppletConfig> = new StoreSubscriber(this, () =>
  //   this.sensemakerStore.flattenedAppletConfigs()
  // );
  config;
  @state()
  _selectedContext: string = "";
  @state()
  activeContextIndex!: number;

  render() {
    const contexts = this.config ? Object.keys(this.config.value?.cultural_contexts) : [];
    if(!this.activeContextIndex){
      this.activeContextIndex = contexts.findIndex((contextName: string) => this._selectedContext == contextName);
      if(this.activeContextIndex == -1) {
        this.activeContextIndex = 0;
      }
      this.dispatchContextSelected(contexts[this.activeContextIndex])
    }
    
    return html`
        <nh-button-group
          .direction=${"horizonal"}
          .fixedFirstItem=${true}
          .addItemButton=${true}
        >
          <slot slot="button-fixed" name="button-fixed"></slot>
          <slot slot="buttons" name="buttons"></slot>
        </nh-button-group>
      `
    
  }
  
  dispatchContextSelected(contextName: string) {
    this.dispatchEvent(new CustomEvent('context-selected', {
      detail: {contextName},
      bubbles: true,
      composed: true
  }));
  }
  static get elementDefinitions() {
    return {
      'nh-button': NHButton,
      'nh-button-group': NHButtonGroup,
    };
  }
  static styles = css`
    :host {
      display: flex;
      flex: 9;
    }
  `
}
