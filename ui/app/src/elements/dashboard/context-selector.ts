// import { LitElement, html, css } from 'lit';
// import { StoreSubscriber } from 'lit-svelte-stores';
// import { customElement, state } from 'lit/decorators.js';
// import { SensemakerStore, AppletConfig, sensemakerStoreContext } from '@neighbourhoods/client';
// import { NHButton } from '../components/nh/layout/button';
// import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
// import { contextProvided } from '@lit-labs/context';
// import { NHButtonGroup } from '@neighbourhoods/design-system-components';
// import { literal } from 'lit/static-html.js';

// export const cleanForUI = (propertyName: string) =>
//   propertyName.split('_').map(capitalize).join(' ');

// export const capitalize = (part: string) => part[0].toUpperCase() + part.slice(1);

// @customElement("context-selector")
// export class ContextSelector extends ScopedRegistryHost(LitElement) {
//   @contextProvided({ context: sensemakerStoreContext })
//   sensemakerStore!: SensemakerStore;

//   config: StoreSubscriber<AppletConfig> = new StoreSubscriber(this, () =>
//     this.sensemakerStore.flattenedAppletConfigs()
//   );
//   @state()
//   _selectedContext: string = "";
//   @state()
//   activeContextIndex!: number;

//   render() {
//     const contexts = Object.keys(this.config?.value?.cultural_contexts);
//     console.log('contexts.map(c => capitalize(c) :>> ', contexts.map(c => capitalize(c)))
//     if(!this.activeContextIndex){
//       this.activeContextIndex = contexts.findIndex((contextName: string) => this._selectedContext == contextName);
//       if(this.activeContextIndex == -1) {
//         this.activeContextIndex = 0;
//       }
//       this.dispatchContextSelected(contexts[this.activeContextIndex])
//     }
    
//     return html`
//         <nh-button-group
//           .direction=${"horizonal"}
//           .itemLabels=${contexts.map(c => capitalize(c))}
//           .itemComponentTag=${literal`nh-tab-button`}
//           .itemComponentProps=${{ size: "lg" }}
//           .fixedFirstItem=${true}
//           .addItemButton=${true}
//         >
        
//         </nh-button-group>
//       `
    
//   }
  
//   dispatchContextSelected(contextName: string) {
//     this.dispatchEvent(new CustomEvent('context-selected', {
//       detail: {contextName},
//       bubbles: true,
//       composed: true
//   }));
//   }
//   static get elementDefinitions() {
//     return {
//       'nh-button': NHButton,
//       'nh-button-group': NHButtonGroup,
//     };
//   }

// }
