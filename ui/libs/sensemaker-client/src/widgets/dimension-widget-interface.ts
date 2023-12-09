import { TemplateResult } from 'lit';
import { Assessment, CreateAssessmentInput } from '../assessment';
import { RangeValue } from '../range';
import { EntryHash } from '@holochain/client';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { LitElement } from 'lit';
import { SensemakerStore } from '../sensemakerStore';
import { html } from 'lit-html';

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

interface IDimensionWidget {
    render(): TemplateResult
}

export type IAssessDimensionWidget = IDimensionWidget & {
    resourceEh: EntryHash
    resourceDefEh: EntryHash
    dimensionEh: EntryHash
    methodEh: EntryHash
    latestAssessment: Assessment | null
    assessResource(value: RangeValue): Promise<void>
}

export type IDisplayDimensionWidget = IDimensionWidget & {
    assessment: Assessment | null;
}

export abstract class AssessDimensionWidget extends ScopedElementsMixin(LitElement) implements IAssessDimensionWidget {
    abstract sensemakerStore: SensemakerStore
    abstract resourceEh: EntryHash
    abstract resourceDefEh: EntryHash
    abstract dimensionEh: EntryHash
    abstract methodEh: EntryHash
    abstract latestAssessment: Assessment | null
    abstract render(): TemplateResult
    async assessResource(value: RangeValue): Promise<void> {
        const assessment: CreateAssessmentInput = {
            value,
            dimension_eh: this.dimensionEh,
            resource_eh: this.resourceEh,
            resource_def_eh: this.resourceDefEh,
            maybe_input_dataset: null,
        }
        console.log('handle create assessment in resource wrapper')
        try {
            const assessmentEh = await this.sensemakerStore.createAssessment(assessment)
        }
        catch (e) {
            console.log('error creating assessment', e)
        }
        try {
            const objectiveAssessment = await this.sensemakerStore.runMethod({
                resource_eh: assessment.resource_eh,
                resource_def_eh: assessment.resource_def_eh,
                method_eh: this.methodEh,
            })
            console.log('method output', objectiveAssessment)
        }
        catch (e) {
            console.log('method error', e)
        }
    }
}

export abstract class DisplayDimensionWidget extends ScopedElementsMixin(LitElement) implements IDisplayDimensionWidget {
    abstract assessment: Assessment | null
    abstract render(): TemplateResult
}

export class ConcreteAssessDimensionWidget extends AssessDimensionWidget {
    sensemakerStore!: SensemakerStore
    resourceEh!: EntryHash
    resourceDefEh!: EntryHash
    dimensionEh!: EntryHash
    methodEh!: EntryHash
    latestAssessment!: Assessment | null
    render(): TemplateResult {
        return html``
    }
}

export class ConcreteDisplayDimensionWidget extends DisplayDimensionWidget {
    assessment!: Assessment | null
    render(): TemplateResult {
        return html``
    }
}
