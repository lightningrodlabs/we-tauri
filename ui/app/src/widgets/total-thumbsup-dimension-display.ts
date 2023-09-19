import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DisplayDimensionWidget, RangeValueFloat } from '@neighbourhoods/client';
import { Assessment, RangeValueInteger } from '@neighbourhoods/client';

@customElement('total-thumbs-up-dimension-display')
export class TotalThumbsUpDimensionDisplay extends DisplayDimensionWidget {

    @property()
    assessment!: Assessment | null

    render() {
        const rating = this.assessment ? (this.assessment.value as RangeValueFloat).Float : 0
        let thumbDisplay
        if (rating > 0) {
            thumbDisplay = "👍"
        } else if (rating < 0) {
            thumbDisplay = "👎"
        } else {
            thumbDisplay = "🤷"
        }

        return html`
                    <div>
                        (${rating}) ${thumbDisplay}
                    </div>
                `
    }
    static get elementDefinitions() {
        return {
        }
    }
    static styles = css`
        .heat-scale {
            display: flex;
            flex-direction: row;
        }
    `
}
