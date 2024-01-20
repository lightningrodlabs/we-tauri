import { EntryHash } from '@holochain/client';
import { RangeKind, RangeValue } from "./range";
import { Assessment } from './assessment';
import {
  CallbackFn,
  NHDelegateReceiverConstructor,
  UnsubscribeFn
} from "./delegate"

/**
 * The minimal interface needed for an assessment widget.
 *
 * We can create objects that conform to this interface and provide a limited set
 * of functions which can be used to act on assessments instead of passing in the
 * AppAgentClient which would give the assessment controls complete access to all
 * the sensemaker data.
 */
export interface InputAssessmentWidgetDelegate {
  getLatestAssessmentForUser(): Promise<Assessment | undefined> // get the latest assessment value the user created (or none if never assessed or invalidated)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current assessment changes
  createAssessment(value: RangeValue): Promise<Assessment> // create an assessment
  invalidateAssessment(): void // invalidate assessment [ignore for now, we only support creating new assessments]
}

/**
 * The minimal interface needed to render computed assessments
 *
 * This allows passing in a delegate that allows fetching and subscribing to
 * assessment changes without exposing the sensemaker store AppAgentClient.
 */
export interface OutputAssessmentWidgetDelegate {
  getLatestAssessment(): Promise<Assessment | undefined> // get the latest computed assessment value (regardless of user, for computed dimensions)
  subscribe(_:CallbackFn): UnsubscribeFn // subscribe to when the current computed dimension changes
}

/**
 * Can either be 'input' or 'output'
 */
export type AssessmentWidgetKind = 'input' | 'output';

/**
 * Defines an Assessment Widget in an Applet config
 */
export type AssessmentWidgetRenderer = {
  name: string,         // Likely appended to the App name in the dashboard configuration screen
  rangeKind: RangeKind,         // Output components must support a range of [-INF, INF] unless it is used with an AVG.
  component: NHDelegateReceiverConstructor<InputAssessmentWidgetDelegate> | NHDelegateReceiverConstructor<OutputAssessmentWidgetDelegate>, // Intersection of HTML Element and the delegate interface for
  kind: AssessmentWidgetKind
}

/**
 * Defines the different assessment control renderers by name
 */
export type AssessmentWidgetRenderers = Record<string, AssessmentWidgetRenderer>

/**
 * Defines the shape of the data sent to the sensemaker to register a an assessment control
 */
export interface AssessmentWidgetRegistrationInput {
  appletId: string, // Applet id
  widgetKey: string,  // keyof an AssessmentWidgetConfigDict
  name: string,
  rangeKind: RangeKind,
  kind: AssessmentWidgetKind
}

/**
 * Shape of object used to update the assessment control registration
 */
export type AssessmentWidgetRegistrationUpdateInput = {
  assessmentRegistrationEh: EntryHash,
  assessmentRegistrationUpdate: AssessmentWidgetRegistrationInput
}

/**
 * Maps dimensions to assessment controls
 */
export type AssessmentWidgetConfig = {
  dimensionEh: EntryHash,
  /**
   * This is specifically for when components are separated out into their own
   * DHT entry (or sequence of DHT entries to allow extra large codebases to
   * be stored).
   */
  widgetEh: EntryHash
} | {
  dimensionEh: EntryHash,
  /**
   * This is whatever the id for the Applet is.
   */
  appletId: string,
  /**
   * This is the name of the component as exposed by the applet interface
   */
  componentName: string
}

/**
 * Used to configure the assessment tray,
 */
export interface AssessmentWidgetBlockConfig {
  /**
   * This is the widget that allows making an assessment and displaying the
   * user's chosen selection if the user can select one of many options.
   */
  inputAssessmentWidget: AssessmentWidgetConfig,
  /**
   * This is the widget that displays the computed result, for the case where
   * output and input and separate, as in the Todo applet.
   */
  outputAssessmentWidget: AssessmentWidgetConfig
}

/**
 * This is currently associated with each resource type.
 * In the future, it may be matched by [resource def, context].
 */
export type AssessmentTrayConfig = AssessmentWidgetBlockConfig[]
