import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Assessment, DisplayDimensionWidget, RangeValueFloat } from '@neighbourhoods/client';

@customElement('average-star-dimension-display')
export class AverageStarDimensionDisplay extends DisplayDimensionWidget {
    @property()
    assessment!: Assessment | null

    render() {
        const latestAssessmentValue = this.assessment ? (this.assessment.value as RangeValueFloat).Float : 0
        return html`
                    <div>
                        (${latestAssessmentValue})
                    </div>
                `
    }
}


