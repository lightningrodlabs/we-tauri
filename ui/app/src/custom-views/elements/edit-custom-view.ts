import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, sharedStyles, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import { CustomViewsStore } from '../custom-views-store';
import { customViewsStoreContext } from '../context';
import { CustomView } from '../types';

/**
 * @element edit-custom-view
 * @fires custom-view-updated: detail will contain { previousCustomViewHash, updatedCustomViewHash }
 */
@localized()
@customElement('edit-custom-view')
export class EditCustomView extends LitElement {

  
  // REQUIRED. The current CustomView record that should be updated
  @property()
  currentRecord!: EntryRecord<CustomView>;
  
  /**
   * @internal
   */
  @consume({ context: customViewsStoreContext })
  customViewsStore!: CustomViewsStore;

  /**
   * @internal
   */
  @state()
  committing = false;
   

  firstUpdated() {
    this.shadowRoot?.querySelector('form')!.reset();
  }

  async updateCustomView(fields: any) {  
    const customView: CustomView = { 
      html: this.currentRecord.entry.html,
      js: this.currentRecord.entry.js,
      css: this.currentRecord.entry.css,
    };

    try {
      this.committing = true;
      const updateRecord = await this.customViewsStore.client.updateCustomView(
        this.currentRecord.actionHash,
        customView
      );
  
      this.dispatchEvent(new CustomEvent('custom-view-updated', {
        composed: true,
        bubbles: true,
        detail: {
          previousCustomViewHash: this.currentRecord.actionHash,
          updatedCustomViewHash: updateRecord.actionHash
        }
      }));
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error creating the custom view"));
    }
    
    this.committing = false;
  }

  render() {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Custom View")}</span>

        <form 
          style="display: flex; flex: 1; flex-direction: column;"
          ${onSubmit(fields => this.updateCustomView(fields))}
        >  


          <div style="display: flex; flex-direction: row">
            <sl-button
              @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
                bubbles: true,
                composed: true
              }))}
              style="flex: 1;"
            >${msg("Cancel")}</sl-button>
            <sl-button
              type="submit"
              variant="primary"
              style="flex: 1;"
              .loading=${this.committing}
            >${msg("Save")}</sl-button>

          </div>
        </form>
      </sl-card>`;
  }

  static styles = [sharedStyles];
}
