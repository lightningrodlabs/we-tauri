import { Entry, EntryHash } from "@holochain/client";
import { IAssessDimensionWidget, IDisplayDimensionWidget } from ".";

export interface AssessmentWidgetRegistrationInput {
  applet_eh: EntryHash, // Applet entry hash
  widget_key: string,  // keyof an AssessmentWidgetConfigDict
  name: string,
  range_eh: EntryHash, // The EntryHash for the created Range object (should probably just be the range object when returned from the API) - see below
  kind: AssessmentWidgetKind
}
export type AssessmentWidgetRegistration = AssessmentWidgetRegistrationInput & {
  assessment_registration_eh: EntryHash,
  range: Range
}

export type AssessmentWidgetRegistrationUpdateInput = AssessmentWidgetRegistrationInput & {
  assessment_registration_eh: EntryHash,
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
