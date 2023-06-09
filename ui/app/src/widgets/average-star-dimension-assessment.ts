import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryHash } from '@holochain/client';
import { AssessDimensionWidget, Assessment, RangeValue, RangeValueFloat, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { contextProvided } from '@lit-labs/context';

@customElement('average-star-dimension')
export class AverageStarDimension extends AssessDimensionWidget {
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
    latestAssessment!: Assessment | null;

    @state()
    rating = 0;
   
    async firstUpdated() {
        if(this.latestAssessment) {
            this.rating = (this.latestAssessment.value as RangeValueFloat).Float;
        }
    }
    render() {
        
        return html`
                    <div class="star-rating">
                        <input 
                            type="checkbox" 
                            name="myCheckbox" 
                            value="important" 
                            ?checked=${this.rating > 0}
                            ?disabled=${this.latestAssessment} 
                            @click=${() => {
                                if(!this.latestAssessment) {
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
                            ?disabled=${this.latestAssessment} 
                            @click=${() => {
                                if(!this.latestAssessment) {
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
                            ?disabled=${this.latestAssessment} 
                            @click=${() => {
                                if(!this.latestAssessment) {
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
                            ?disabled=${this.latestAssessment} 
                            @click=${() => {
                                if(!this.latestAssessment) {
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
                            ?disabled=${this.latestAssessment} 
                            @click=${() => {
                                if(!this.latestAssessment) {
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
