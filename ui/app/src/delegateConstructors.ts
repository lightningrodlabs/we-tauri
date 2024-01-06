import {
  AppBlockDelegate,
  Assessment,
  CallbackFn,
  DimensionEh,
  InputAssessmentWidgetDelegate,
  OutputAssessmentWidgetDelegate,
  RangeValue,
  ResourceBlockDelegate,
  ResourceDefEh,
  ResourceEh,
  UnsubscribeFn
} from "@neighbourhoods/client";
import {
  AppletInstanceInfo,
  WeGroupData,
} from "./types";
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
export function createAppDelegate(appInstanceInfo: AppletInstanceInfo, weGroupData: WeGroupData): AppBlockDelegate {

  const delegate: AppBlockDelegate = {
    appAgentWebsocket: appInstanceInfo.appAgentWebsocket!,
    appInfo: appInstanceInfo.appInfo!,
    neighbourhoodInfo: weGroupData.info.info,
    sensemakerStore: weGroupData.sensemakerStore,
    profileStore: weGroupData.profilesStore
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createResourceBlockDelegate(appInstanceInfo: AppletInstanceInfo, weGroupData: WeGroupData): ResourceBlockDelegate {

  const delegate: ResourceBlockDelegate = {
    appAgentWebsocket: appInstanceInfo.appAgentWebsocket!,
    appInfo: appInstanceInfo.appInfo!,
    neighbourhoodInfo: weGroupData.info.info
  }

  return delegate;
}

/**
 * Creates an ResourceBlockDelegate to be passed into an resource block
 */
export function createOutputAssessmentWidgetDelegate(
  weGroupData: WeGroupData,
  dimensionEh: DimensionEh,
  resourceDefEh: ResourceDefEh,
  resourceEh: ResourceEh
): OutputAssessmentWidgetDelegate {
  const sensemaker = weGroupData.sensemakerStore
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined

  const delegate: OutputAssessmentWidgetDelegate = {
    /**
     * Get the latest computed assessment for the resource
     */
    async getLatestAssessment(): Promise<Assessment | undefined> {
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
  weGroupData: WeGroupData,
  dimensionEh: DimensionEh,
  resourceDefEh: ResourceDefEh,
  resourceEh: ResourceEh
): InputAssessmentWidgetDelegate {
  const sensemaker = weGroupData.sensemakerStore
  const subscribers = new SubscriberManager()

  let assessment: Assessment | undefined

  const delegate: InputAssessmentWidgetDelegate = {
    /**
     * Used to render the currently selected value for the user
     */
    async getLatestAssessmentForUser(): Promise<Assessment | undefined> {
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
      const assessmentEh =  await sensemaker.createAssessment({
        value,
        dimension_eh: dimensionEh,
        resource_eh: resourceEh,
        resource_def_eh: resourceDefEh,
        maybe_input_dataset: null
      })
      const assessmentRecord = await sensemaker.getAssessment(assessmentEh)
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
