import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryHash } from '@holochain/client';
import { AssessDimensionWidget, RangeValue, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { contextProvided } from '@lit-labs/context';

@customElement('heat-dimension-assessment')
export class HeatDimensionAssessment extends AssessDimensionWidget {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    @state()
    sensemakerStore!: SensemakerStore;
    
    @property()
    resourceEh!: EntryHash

    @property()
    resourceDefEh!: EntryHash

    @property()
    dimensionEh!: EntryHash

    @property()
    methodEh!: EntryHash

    @property()
    isAssessedByMe = false;

    @state()
    rating = 0;
    
    render() {
        
        return html`
                    <div class="star-rating">
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 0}
                            ?disabled=${this.isAssessedByMe} 
                            @click=${() => {
                                if(!this.isAssessedByMe) {
                                    this.rating = 1;
                                    this.assessResource({
                                        Float: 0
                                    })
                                }
                            }}
                        >
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 1}
                            ?disabled=${this.isAssessedByMe} 
                            @click=${() => {
                                if(!this.isAssessedByMe) {
                                    this.rating = 2;
                                    this.assessResource({
                                        Float: 1
                                    })
                                }
                            }}
                        >
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 2}
                            ?disabled=${this.isAssessedByMe} 
                            @click=${() => {
                                if(!this.isAssessedByMe) {
                                    this.rating = 3;
                                    this.assessResource({
                                        Float: 2
                                    })
                                }
                            }}
                        >
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 3}
                            ?disabled=${this.isAssessedByMe} 
                            @click=${() => {
                                if(!this.isAssessedByMe) {
                                    this.rating = 4;
                                    this.assessResource({
                                        Float: 3
                                    })
                                }
                            }}
                        >
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 4}
                            ?disabled=${this.isAssessedByMe} 
                            @click=${() => {
                                if(!this.isAssessedByMe) {
                                    this.rating = 5;
                                    this.assessResource({
                                        Float: 4
                                    })
                                }
                            }}
                        >
                    </div>
                `
    }

    static get scopedElements() {
        return {
        }
    }
    static styles = css`
        .star-rating {
            display: flex;
            flex-direction: row;
        }
    `
}

