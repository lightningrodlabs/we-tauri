import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryHash } from '@holochain/client';
import { Checkbox } from '@scoped-elements/material-web'
import { AssessDimensionWidget, Assessment, RangeValue, SensemakerStore, sensemakerStoreContext } from '@neighbourhoods/client';
import { consume } from '@lit/context';

@customElement('thumbs-up-dimension-assessment')
export class ThumbsUpDimenionAssessment extends AssessDimensionWidget {
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

    render() {
        return html`
        <div class="heat-scale">
            <div @click=${() => this.assessResource({ Float: 1 })}>👍</div>
            <div @click=${() => this.assessResource({ Float: -1 })}>👎</div>
        </div>
        `
    }

    static get elementDefinitions() {
        return {
            'mwc-checkbox': Checkbox,
        }
    }
    static styles = css`
        .heat-scale {
            display: flex;
            flex-direction: row;
        }
    `
}
