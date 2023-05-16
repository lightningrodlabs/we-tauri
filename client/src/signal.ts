import { Assessment } from "./assessment";

export type SignalPayload = 
| {
    type: "NewAssessment",
    assessment: Assessment,
}