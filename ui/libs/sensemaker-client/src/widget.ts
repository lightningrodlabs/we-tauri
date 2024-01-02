import { EntryHash } from '@holochain/client';
import { Range } from "./range";
import {
  CallbackFn,
  NHDelegateReceiverConstructor,
  UnsubscribeFn
} from "./delegate"
import { Assessment } from './assessment';

/**
 * The minimal interface needed for an assessment widget.
 *
 * We can create objects that conform to this interface and provide a limited set
 * of functions which can be used to act on assessments instead of passing in the
 * AppAgentClient which would give the assessment controls complete access to all
 * the sensemaker data.
 */
export interface InputAssessmentWidgetDelegate {
  getLatestAssessmentForUser(): Assessment // get the latest assessment value the user created (or none if never assessed or invalidated)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current assessment changes
  createAssessment(assessment: Assessment): Assessment // create an assessment
  invalidateLastAssessment(): void // invalidate the last created assessment [ignore for now, we only support creating new assessments]
}

/**
 * The minimal interface needed to render computed assessments
 *
 * This allows passing in a delegate that allows fetching and subscribing to
 * assessment changes without exposing the sensemaker store AppAgentClient.
 */
export interface OutputAssessmentWidgetDelegate {
  getLatestAssessment(): Assessment // get the latest computed assessment value (regardless of user, for computed dimensions)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current computed dimension changes
}

export type AssessmentWidgetKind = 'input' | 'output';

/**
 * Defines an Assessment Widget
 */
export type AssessmentWidgetRenderer = {
  name: string,         // Likely appended to the App name in the dashboard configuration screen
  range: Range,         // Output components must support a range of [-INF, INF] unless it is used with an AVG.
  component?: NHDelegateReceiverConstructor<InputAssessmentWidgetDelegate> | NHDelegateReceiverConstructor<OutputAssessmentWidgetDelegate>, // Intersection of HTML Element and the delegate interface for
  kind: AssessmentWidgetKind
}

export type AssessmentWidgetRenderers = Record<string, AssessmentWidgetRenderer>

export interface AssessmentWidgetRegistrationInput {
  appletEh: EntryHash, // Applet entry hash
  widgetKey: string,  // keyof an AssessmentWidgetConfigDict
  name: string,
  range: Range,
  kind: AssessmentWidgetKind
}
export type AssessmentWidgetRegistration = AssessmentWidgetRegistrationInput;

export type AssessmentWidgetRegistrationUpdateInput = {
  assessmentRegistrationEh: EntryHash,
  assessmentRegistrationUpdate: AssessmentWidgetRegistrationInput
}

// configuration data as stored by the `widgets` zome API
export type AssessmentWidgetConfig = {
  dimensionEh: EntryHash,
  widgetEh: EntryHash // This is specifically for when components are separated out into their own DHT entry (or sequence of DHT entries to allow extra large codebases to be stored).
} | {
  dimensionEh: EntryHash,
  appletEh: EntryHash, // This is whatever the id for the Applet is
  componentName: string // This is the name of the component as exposed by the applet interface
}

// configuration data as stored by the `widgets` zome API
export interface AssessmentWidgetBlockConfig {
  // This is the widget that allows making an assessment and displaying the user's chosen selection if the user can select one of many options
  inputAssessmentWidget: AssessmentWidgetConfig,
  // This is the widget that displays the computed result, for the case where output and input and separate, as in the Todo applet.
  outputAssessmentWidget: AssessmentWidgetConfig
}
