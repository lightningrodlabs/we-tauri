import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { encodeHashToBase64 } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { SensemakerStore, getLatestAssessment, sensemakerStoreContext, Assessment, getMethodEhForOutputDimension } from '@neighbourhoods/client';
import { StoreSubscriber } from 'lit-svelte-stores';
import { get } from "svelte/store";

export class SensemakerDashboard extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;
  
  allAssessments = new StoreSubscriber(this, () => this._sensemakerStore.resourceAssessments());
  widgetMappingConfig = new StoreSubscriber(this, () => this._sensemakerStore.widgetMappingConfig());

  render() {
    let flatAssessments = Object.values(this.allAssessments.value).flat();
    let assessmentTable = html`
    ${flatAssessments.map((assessment) => {
      console.log('mapping asssessments for dashboard');
      const { inputDimensionMapping } = this.widgetMappingConfig.value[encodeHashToBase64(assessment.resource_def_eh)]
      console.log('input dimension mapping', inputDimensionMapping);
      // here is the issue, need to get the dimension of the subjective assessment
      console.log('widget registry from nh-launcher', get(this._sensemakerStore.widgetRegistry()))
      const assessDimensionWidgetType = get(this._sensemakerStore.widgetRegistry())[encodeHashToBase64(assessment.dimension_eh)].assess
      const displayDimensionWidgetType = get(this._sensemakerStore.widgetRegistry())[encodeHashToBase64(assessment.dimension_eh)].display
      const assessDimensionWidget = new assessDimensionWidgetType();
      const displayDimensionWidget = new displayDimensionWidgetType();
      assessDimensionWidget.resourceEh = assessment.resource_eh;
      assessDimensionWidget.resourceDefEh = assessment.resource_def_eh;
      assessDimensionWidget.dimensionEh = assessment.dimension_eh;
      assessDimensionWidget.methodEh = inputDimensionMapping[encodeHashToBase64(assessment.dimension_eh)] ? inputDimensionMapping[encodeHashToBase64(assessment.dimension_eh)][1] : getMethodEhForOutputDimension(assessment.resource_def_eh, assessment.dimension_eh, get(this._sensemakerStore.widgetMappingConfig()));
      assessDimensionWidget.sensemakerStore = this._sensemakerStore;

      const byMe = get(this._sensemakerStore.isAssessedByMeAlongDimension(encodeHashToBase64(assessment.resource_eh), encodeHashToBase64(assessment.dimension_eh)))
      assessDimensionWidget.isAssessedByMe = byMe;

      displayDimensionWidget.assessment = assessment;
      return html`
        <tr>
            <td>${displayDimensionWidget.render()}</td>
            <td>${encodeHashToBase64(assessment.dimension_eh)}</td>
            <td>${encodeHashToBase64(assessment.resource_eh)}</td>
            <td>${assessDimensionWidget.render()}</td>
            <td>${encodeHashToBase64(assessment.author)}</td>
        </tr>
    `})}
    `
    return html`
      <main>
        <div class="home-page">
            <table>
                <tr>
                    <th>Value</th>
                    <th>Dimension</th>
                    <th>Resource</th>
                    <th>Assess Resource</th>
                    <th>Author</th>
                </tr>
                ${assessmentTable}
            </table>
        </div>
      </main>
    `;
  }


  static get scopedElements() {
    return {
    };
  }

  static styles = css`
    table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
    }
    
    td, th {
        border: 1px solid #dddddd;
        text-align: left;
        padding: 8px;
    }
    
    tr:nth-child(even) {
        background-color: #dddddd;
    }
  `;
}
