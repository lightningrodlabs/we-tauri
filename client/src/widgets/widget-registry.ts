import { Entry, EntryHash } from "@holochain/client";
import { IAssessDimensionWidget, IDisplayDimensionWidget } from ".";

export interface AssessmentWidgetRegistrationInput {
  appletEh: EntryHash, // Applet entry hash
  widgetKey: string,  // keyof an AssessmentWidgetConfigDict
  name: string,
  rangeEh: EntryHash, // The EntryHash for the created Range object (should probably just be the range object when returned from the API) - see below
  kind: AssessmentWidgetKind
}
export type AssessmentWidgetRegistration = {
  appletEh: EntryHash, 
  widgetKey: string,
  name: string,
  range: Range
  kind: AssessmentWidgetKind
}

export type AssessmentWidgetRegistrationUpdateInput = {
  assessmentRegistrationEh: EntryHash,
  assessmentRegistrationUpdate: AssessmentWidgetRegistrationInput
}

export type AssessmentWidgetConfigDict = Record<string, AssessmentWidgetConfig>
// e.g.
// {
//   "importance": { // widget_key
//     name: "Importance Ranker",
//     range: {
//       min: 0,
//       max: 10
//     },
//     component: ImportanceWidget,
//     kind: "input"
//   }
// }

type AssessmentWidgetConfig = {
  name: string,
  range: Range,
  component: AssessmentWidget,
  kind: AssessmentWidgetKind 
}

type AssessmentWidget = IAssessDimensionWidget | IDisplayDimensionWidget;

type AssessmentWidgetKind = "input" | "output";
