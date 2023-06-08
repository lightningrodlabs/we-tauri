import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Assessment, DisplayDimensionWidget, RangeValueFloat } from '@neighbourhoods/client';

@customElement('average-heat-dimension-display')
export class AverageHeatDimensionDisplay extends DisplayDimensionWidget {
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


