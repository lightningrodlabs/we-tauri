import { fixture, html } from "@open-wc/testing";
import { AssessmentDict } from "../helpers/types";

export const stateful = async (component) => fixture(html`
<test-harness>${component}</test-harness>
`)


export function addedAssessment(mockAssessments: AssessmentDict, mockResourceName: keyof AssessmentDict) {
    const assessmentToAdd = {
        value: { Integer: 5 },
        dimension_eh: new Uint8Array([4, 3, 3]),
        resource_eh: new Uint8Array([4, 5, 6]),
        resource_def_eh: new Uint8Array([4, 5, 6]),
        author: new Uint8Array([21, 12, 11]),
        maybe_input_dataset: null,
        timestamp: 2343465
    };

    let mutatedAssessments = { 'abc': [...mockAssessments[mockResourceName], assessmentToAdd] } as AssessmentDict;
    return mutatedAssessments
}
export function removedAssessment(mockAssessments: AssessmentDict, mockResourceName: keyof AssessmentDict) {
    let mutatedAssessments = { 'abc': mockAssessments[mockResourceName].slice(1) } as AssessmentDict;
    return mutatedAssessments
}
