import { Dimension, SensemakerStore } from "@neighbourhoods/client";
import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AssessmentTableType } from "./table";

@customElement('fetch-assessment')
export class FetchAssessment extends LitElement {

  @property({ type: String })
  resourceName: string;

  @property({ type: Object })
  resourceDefEh: object;

  @property({ type: String })
  tableType: AssessmentTableType;

  @property({ type: Object })
  selectedContext: object;

  @property({ type: Array })
  selectedDimensions: Dimension[];

  @property({ type: Array })
  assessments: AssessmentTableRecord[] = [];

  @property({ type: Object })
  tableStore: TableStore;

  @property({ type: Object })
  sensemakerStore: SensemakerStore;

  // TODO: Implement fetch and filter methods
  fetchAssessments() {  }
  filterAssessments() {  }

  updated(changedProps) {
    if (changedProps.has('resourceName') || changedProps.has('resourceDefEh')) {
      this.fetchAssessments();
    }
    if (changedProps.has('selectedContext') || changedProps.has('selectedDimensions')) {
      this.filterAssessments();
    }
  }

  render() {
    return html`
      <slot></slot>
    `;
  }
}