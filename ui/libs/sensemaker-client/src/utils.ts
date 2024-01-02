import { EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import { Assessment } from "./assessment";

export type Option<Inner> = Inner | null


export function getLargestAssessment(assessments: Assessment[], dimension_eh: EntryHashB64): Option<Assessment> {
    const assessmentOnDimension = assessments.filter(assessment => encodeHashToBase64(assessment.dimension_eh) === dimension_eh);
    // return latestAssessment to the one with the greatest value
    if (assessmentOnDimension.length === 0) {
        return null;
    }
    else {
        const latestAssessment = assessmentOnDimension.reduce((prev, current) => {
            if (prev.value > current.value) {
                return prev;
            }
            else {
                return current;
            }
        }
        )
        return latestAssessment;
    }
}

export function getLatestAssessment(assessments: Assessment[], dimension_eh: EntryHashB64): Option<Assessment> {
    const assessmentOnDimension = assessments.filter(assessment => encodeHashToBase64(assessment.dimension_eh) === dimension_eh);
    // return latestAssessment to the one with the greatest value
    if (assessmentOnDimension.length === 0) {
        return null;
    }
    else {
        const latestAssessment = assessmentOnDimension.reduce((prev, current) => {
            if (prev.timestamp > current.timestamp) {
                return prev;
            }
            else {
                return current;
            }
        }
        )
        return latestAssessment;
    }
}

// export function getMethodEhForOutputDimension(resourceDefEh: EntryHash, outputDimensionEh: EntryHash, widgetMappingConfig: WidgetMappingConfig): EntryHash {
//     // map through the input dimension mappings to find one that contains the output dimension and return the method eh
//     const resourceDefEhB64 = encodeHashToBase64(resourceDefEh);
//     const inputDimensionMappings = widgetMappingConfig[resourceDefEhB64].inputDimensionMapping;
//     const inputDimensionEhs = Object.keys(inputDimensionMappings);
//     const inputDimensionEhB64 = inputDimensionEhs.find(inputDimensionEh => encodeHashToBase64(inputDimensionMappings[inputDimensionEh][0]) === encodeHashToBase64(outputDimensionEh));
//     if (inputDimensionEhB64) {
//         return inputDimensionMappings[inputDimensionEhB64][1];
//     }
//     else {
//         throw new Error("No input dimension mapping found for output dimension");
//     }
// }