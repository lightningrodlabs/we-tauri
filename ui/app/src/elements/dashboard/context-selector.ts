import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { customElement, state } from 'lit/decorators.js';
import { SensemakerStore, AppletConfig, sensemakerStoreContext, ComputeContextInput, ContextResult } from '@neighbourhoods/client';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { contextProvided } from '@lit-labs/context';
import { NHButton, NHButtonGroup } from '@neighbourhoods/design-system-components';
import { EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { get } from '@holochain-open-dev/stores';

@customElement("context-selector")
export class ContextSelector extends ScopedRegistryHost(LitElement) {
  @contextProvided({ context: sensemakerStoreContext })
  sensemakerStore!: SensemakerStore;

  config: StoreSubscriber<AppletConfig> = new StoreSubscriber(this, () =>
    this.sensemakerStore.flattenedAppletConfigs()
  );

  @state()
  selectedContext: string = "";

  private _resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    
  async updated(_changedProperties: any,) {
      // const contexts = typeof this.config?.value !== 'undefined' ? Object.keys(this.config.value?.cultural_contexts) : [];
      if(_changedProperties.has("selectedContext") && _changedProperties.get("selectedContext") !== 'undefined') {
        if(!this.selectedContext || this.selectedContext === 'none' || typeof this.config?.value == 'undefined'|| typeof this._resourceAssessments?.value == 'undefined') return;
        const resourceEhs : EntryHash[] = Object.keys(this._resourceAssessments.value).flat().map(b64eh => decodeHashFromBase64(b64eh));
        const input : ComputeContextInput = { resource_ehs: resourceEhs, context_eh: decodeHashFromBase64(this.selectedContext), can_publish_result: false};
        
        await this.sensemakerStore.computeContext(this.selectedContext, input);
        
        const results = get(this.sensemakerStore.contextResults())
        const selectedContextName = Object.entries(this.config.value.cultural_contexts).filter(([contextName, contextHash]) => encodeHashToBase64(contextHash) == this.selectedContext)[0];
        
        this.dispatchContextSelected(selectedContextName[0], results)
      }
  }
  
  render() {    
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
  
  dispatchContextSelected(contextName: string, results: any) {
    this.dispatchEvent(new CustomEvent('context-selected', {
      detail: {contextName, results},
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
