import {
  AppAgentClient,
  AppInfo,
} from "@holochain/client";
import {
  AppBlockDelegate,
  Assessment,
  CallbackFn,
  DimensionEh,
  InputAssessmentWidgetDelegate,
  NeighbourhoodInfo,
  OutputAssessmentWidgetDelegate,
  RangeValue,
  ResourceBlockDelegate,
  ResourceDefEh,
  ResourceEh,
  SensemakerStore,
  UnsubscribeFn
} from "@neighbourhoods/client";
import { EntryRecord } from "@holochain-open-dev/utils";

export class SubscriberManager extends Array<CallbackFn> {
  public subscribe(cb: CallbackFn): UnsubscribeFn {
    this.push(cb);
    return () => {
      const index = this.findIndex(value => value === cb)
      this.splice(index, 1)
    }
  }

  public dispatch(assessment: Assessment | undefined) {
    this.forEach(cb => setTimeout(() => cb(assessment), 0))
  }
}

/**
 * Creates an AppBlockDelegate to be passed into an applet block
 */
export function createAppDelegate(
  appAgentWebsocket: AppAgentClient,
  appInfo: AppInfo,
  neighbourhoodInfo: NeighbourhoodInfo,
  sensemakerStore: SensemakerStore
): AppBlockDelegate {

  const delegate: AppBlockDelegate = {
    appAgentWebsocket,
    appInfo,
    neighbourhoodInfo,
    sensemakerStore
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createResourceBlockDelegate(
  appAgentWebsocket: AppAgentClient,
  appInfo: AppInfo,
  neighbourhoodInfo: NeighbourhoodInfo
): ResourceBlockDelegate {

  const delegate: ResourceBlockDelegate = {
    appAgentWebsocket,
    appInfo,
    neighbourhoodInfo
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createOutputAssessmentWidgetDelegate(
  sensemakerStore: SensemakerStore,
  dimensionEh: DimensionEh,
  resourceEh: ResourceEh
): OutputAssessmentWidgetDelegate {
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined

  const delegate: OutputAssessmentWidgetDelegate = {
    /**
     * Get the latest computed assessment for the resource
     *
     * TODO: finish implementation
     */
    async getLatestAssessment(): Promise<Assessment | undefined> {
      const assessments = await sensemakerStore.getAssessmentsForResources({
        resource_ehs: [resourceEh],
        dimension_ehs: [dimensionEh],
      })
      return assessment
    },

    /**
     * Used to subscribe to changes in the assessment value. This delegate can
     * be used as a Svelte Readable, because of this.
     *
     * TODO: need to pipe through changes from the sensemaker store, this does need
     * to be thought out more.
     */
    subscribe(callback: CallbackFn) {
      return subscribers.subscribe(callback)
    }
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createInputAssessmentWidgetDelegate(
  sensemakerStore: SensemakerStore,
  dimensionEh: DimensionEh,
  resourceDefEh: ResourceDefEh,
  resourceEh: ResourceEh
): InputAssessmentWidgetDelegate {
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined

  const delegate: InputAssessmentWidgetDelegate = {
    /**
     * Used to render the currently selected value for the user
     *
     * TODO: finish implementation
     */
    async getLatestAssessmentForUser(): Promise<Assessment | undefined> {
      const assessments = await sensemakerStore.getAssessmentsForResources({
        resource_ehs: [resourceEh],
        dimension_ehs: [dimensionEh],
      })
      return assessment
    },

    /**
     * Used to subscribe to changes in the assessment value. This delegate can
     * be used as a Svelte Readable, because of this.
     *
     * TODO: need to pipe through changes from the sensemaker store, this does need
     * to be thought out more.
     */
    subscribe(callback: CallbackFn) {
      return subscribers.subscribe(callback)
    },

    /**
     * Create an assessment for the current user
     */
    async createAssessment(value: RangeValue): Promise<Assessment> {
      const assessmentEh =  await sensemakerStore.createAssessment({
        value,
        dimension_eh: dimensionEh,
        resource_eh: resourceEh,
        resource_def_eh: resourceDefEh,
        maybe_input_dataset: null
      })
      const assessmentRecord = await sensemakerStore.getAssessment(assessmentEh)
      const assessmentEntryRecord = new EntryRecord<Assessment>(assessmentRecord)
      assessment = assessmentEntryRecord.entry
      subscribers.dispatch(assessment)
      return assessment;
    },

    /**
     * Invalidate the last assessment
     */
    invalidateAssessment() {
      assessment = undefined
      subscribers.dispatch(assessment)
      console.error("We are still discussing implementing this feature. You last used")
    }
  }

  return delegate;
}
