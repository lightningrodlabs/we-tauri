import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryHash } from '@holochain/client';
import { AssessDimensionWidget, Assessment, RangeValue, RangeValueFloat, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { consume } from '@lit/context';

@customElement('average-star-dimension')
export class StarDimensionAssessment extends AssessDimensionWidget {
    @consume({ context: sensemakerStoreContext, subscribe: true })
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
        console.log("the latest assessment for the star rating", this.latestAssessment)
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
                            ?checked=${this.rating > 0 ? true : false}
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
                            ?checked=${this.rating > 1 ? true : false}
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
                            ?checked=${this.rating > 2 ? true : false}
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
                            ?checked=${this.rating > 3 ? true : false}
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
                            ?checked=${this.rating > 4 ? true : false}
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

    static get elementDefinitions() {
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
