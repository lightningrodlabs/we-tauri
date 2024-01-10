import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';
import { SensemakerStore, AppletConfig, sensemakerStoreContext, ComputeContextInput, ContextResult, NeighbourhoodApplet } from '@neighbourhoods/client';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { consume } from '@lit/context';
import { NHButton, NHButtonGroup } from '@neighbourhoods/design-system-components';
import { EntryHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { get } from '@holochain-open-dev/stores';
import { matrixContext } from '../../context';
import { MatrixStore } from '../../matrix-store';

export class ContextSelector extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext, subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;
  
  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  sensemakerStore!: SensemakerStore;

  // TODO: this is not a store to subscribe from any more. This will be obtained from the app renderer e.g.
    // config: AppletConfigInput = (await this.matrixStore.queryAppletGui([])).appletConfig;

  @state()
  selectedContext: string = "";
  
  @property()
  resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    
  async updated(_changedProperties: any) {
      if(_changedProperties.has("selectedContext") && _changedProperties.get("selectedContext") !== 'undefined') {
        if(!this.selectedContext 
          || this.selectedContext === 'none'
          || typeof this.config?.value == 'undefined'
          || typeof this.resourceAssessments?.value == 'undefined') return;

        const resourceEhs : EntryHash[] = Object.keys(this.resourceAssessments.value).flat().map(b64eh => decodeHashFromBase64(b64eh));
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
      display: grid;
      flex-basis: 100%;
    }
  `
}
