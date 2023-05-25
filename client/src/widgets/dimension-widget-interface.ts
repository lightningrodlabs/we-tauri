import { TemplateResult } from 'lit';
import { Assessment, CreateAssessmentInput } from '../assessment';
import { RangeValue } from '../range';
import { EntryHash } from '@holochain/client';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { LitElement } from 'lit';
import { SensemakerStore } from '../sensemakerStore';

interface IDimensionWidget {
    render(): TemplateResult
}

type IAssessDimensionWidget = IDimensionWidget & {
    resourceEh: EntryHash
    resourceDefEh: EntryHash
    dimensionEh: EntryHash
    methodEh: EntryHash
    isAssessedByMe: boolean
    assessResource(value: RangeValue): Promise<void>
}

type IDisplayDimensionWidget = IDimensionWidget & {
    assessment: Assessment | null;
}

export abstract class AssessDimensionWidget extends ScopedElementsMixin(LitElement) implements IAssessDimensionWidget {
    abstract sensemakerStore: SensemakerStore
    abstract resourceEh: EntryHash
    abstract resourceDefEh: EntryHash
    abstract dimensionEh: EntryHash
    abstract methodEh: EntryHash
    abstract isAssessedByMe: boolean
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