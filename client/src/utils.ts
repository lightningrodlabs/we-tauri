import { EntryHashB64, encodeHashToBase64 } from "@holochain/client";
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