import { contextProvided } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css, unsafeCSS } from "lit";
import { sensemakerStoreContext } from "../sensemakerStore";
import { SensemakerStore } from "../sensemakerStore";
import { getLatestAssessment } from "../utils";
import { EntryHash, encodeHashToBase64, decodeHashFromBase64 } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { get } from "svelte/store";
import { dedupeMixin } from "@open-wc/dedupe-mixin";

export class SensemakeResource extends dedupeMixin(ScopedElementsMixin)(LitElement) {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    @state()
    public  sensemakerStore!: SensemakerStore

    @property()
    resourceEh!: EntryHash

    @property()
    resourceDefEh!: EntryHash

    resourceAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    activeMethod = new StoreSubscriber(this, () => this.sensemakerStore.activeMethod());

    render() {
        const activeMethodEh = this.activeMethod.value[encodeHashToBase64(this.resourceDefEh)]
        const { inputDimensionEh, outputDimensionEh } = get(this.sensemakerStore.methodDimensionMapping())[activeMethodEh];
        const assessDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(inputDimensionEh)].assess
        const displayDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(inputDimensionEh)].display
        const assessDimensionWidget = new assessDimensionWidgetType();
        const displayDimensionWidget = new displayDimensionWidgetType();
        assessDimensionWidget.resourceEh = this.resourceEh;
        assessDimensionWidget.resourceDefEh = this.resourceDefEh
        assessDimensionWidget.dimensionEh = inputDimensionEh;
        assessDimensionWidget.methodEh = decodeHashFromBase64(activeMethodEh);
        assessDimensionWidget.sensemakerStore = this.sensemakerStore;

        const latestAssessment = get(this.sensemakerStore.myLatestAssessmentAlongDimension(encodeHashToBase64(this.resourceEh), encodeHashToBase64(inputDimensionEh)))
        assessDimensionWidget.latestAssessment = latestAssessment;

        displayDimensionWidget.assessment = getLatestAssessment(
            this.resourceAssessments.value[encodeHashToBase64(this.resourceEh)] ? this.resourceAssessments.value[encodeHashToBase64(this.resourceEh)] : [], 
            encodeHashToBase64(outputDimensionEh)
        );
        return html`
            <style>
                ${unsafeCSS(assessDimensionWidgetType.styles![1])}
                ${unsafeCSS(displayDimensionWidgetType.styles![1])}
            </style>
            <div class="sensemake-resource">
                <slot></slot>
                ${displayDimensionWidget.render()}
                ${assessDimensionWidget.render()}
            </div>
        `
    }
    static get styles() {
        return [
            css`
            .sensemake-resource {
                display: flex;
                flex-direction: row;
            }
        `]};
    static get scopedElements() {
        return {
        }
    }
}