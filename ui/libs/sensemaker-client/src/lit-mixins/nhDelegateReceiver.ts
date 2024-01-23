import {
  AppBlockDelegate,
  ResourceBlockDelegate,
  InputAssessmentWidgetDelegate,
  OutputAssessmentWidgetDelegate,
  Assessment
} from "../"
import { LitElement } from "lit"
import { property } from "lit/decorators.js"

class DelegateReceiverClass<D> extends LitElement {
  private _nhDelegate: D | undefined;

  @property()
  public set nhDelegate(delegate: D) {
    // console.log("Got delegate", delegate)
    // console.log("Had delegate", this._nhDelegate)
    this._nhDelegate = delegate;
    this.loadData()
  }
  public get nhDelegate() {
    return this._nhDelegate!
  }

  public loadData = async () => {}
}

export class AppBlock extends DelegateReceiverClass<AppBlockDelegate> {}

export class RenderBlock extends DelegateReceiverClass<ResourceBlockDelegate> {}

export class InputAssessmentControl extends DelegateReceiverClass<InputAssessmentWidgetDelegate> {
  @property()
  assessment: Assessment | undefined

  public loadData = async () => {
    this.assessment = await this.nhDelegate.getLatestAssessmentForUser();
    this.nhDelegate.subscribe((assessment) => {
      this.assessment = assessment
    })
  }
}

export class OutputAssessmentControl extends DelegateReceiverClass<OutputAssessmentWidgetDelegate> {
  @property()
  assessment: Assessment | undefined

  public loadData = async () => {
    this.assessment = await this.nhDelegate.getLatestAssessment()
    this.nhDelegate.subscribe((assessment) => {
      this.assessment = assessment
    })
  }
}
