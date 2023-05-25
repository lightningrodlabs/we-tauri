import { contextProvided } from "@lit-labs/context";
import { property, state } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { sensemakerStoreContext } from "../sensemakerStore";
import { SensemakerStore } from "../sensemakerStore";
import { getLatestAssessment } from "../utils";
import { EntryHash, encodeHashToBase64 } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { get } from "svelte/store";

export class SensemakeResource extends ScopedElementsMixin(LitElement) {
    @contextProvided({ context: sensemakerStoreContext, subscribe: true })
    @state()
    public  sensemakerStore!: SensemakerStore

    @property()
    resourceEh!: EntryHash

    @property()
    resourceDefEh!: EntryHash

    listTasksAssessments = new StoreSubscriber(this, () => this.sensemakerStore.resourceAssessments());
    appletUIConfig = new StoreSubscriber(this, () => this.sensemakerStore.appletUIConfig())

    render() {
        const { create_assessment_dimension, display_objective_dimension, method_for_created_assessment } = this.appletUIConfig.value[encodeHashToBase64(this.resourceDefEh)]
        const assessDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(create_assessment_dimension)].assess
        const displayDimensionWidgetType = (get(this.sensemakerStore.widgetRegistry()))[encodeHashToBase64(create_assessment_dimension)].display
        const assessDimensionWidget = new assessDimensionWidgetType();
        const displayDimensionWidget = new displayDimensionWidgetType();
        assessDimensionWidget.resourceEh = this.resourceEh;
        assessDimensionWidget.resourceDefEh = this.resourceDefEh
        assessDimensionWidget.dimensionEh = create_assessment_dimension;
        assessDimensionWidget.methodEh = method_for_created_assessment;
        assessDimensionWidget.sensemakerStore = this.sensemakerStore;

        const byMe = get(this.sensemakerStore.isAssessedByMeAlongDimension(encodeHashToBase64(this.resourceEh), encodeHashToBase64(create_assessment_dimension)))
        assessDimensionWidget.isAssessedByMe = byMe;

        displayDimensionWidget.assessment = getLatestAssessment(this.listTasksAssessments.value[encodeHashToBase64(this.resourceEh)] ? this.listTasksAssessments.value[encodeHashToBase64(this.resourceEh)] : [], encodeHashToBase64(display_objective_dimension));
        return html`
            <div class="sensemake-resource">
                <slot></slot>
                ${displayDimensionWidget.render()}
                ${assessDimensionWidget.render()}
            </div>
        `
    }
    static styles = css`
          .sensemake-resource {
            display: flex;
            flex-direction: row;
          }
        `;
    static get scopedElements() {
        return {
        }
    }
}