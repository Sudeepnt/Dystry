"use client";

import { BoxSectionPage, EditableBox } from "@/components/box-section-page";

const defaultBoxes: EditableBox[] = [
  { id: "understanding-business", heading: "Understanding business", content: "" },
  { id: "business-model", heading: "Business model", content: "" },
  { id: "type-of-product", heading: "Type of Product", content: "" },
  { id: "industry", heading: "Industry", content: "" },
  { id: "target-customers", heading: "Target customers", content: "" },
  { id: "positioning", heading: "Positioning", content: "" },
];

let cachedAssessmentBoxes: EditableBox[] | null = null;
let assessmentBoxesPromise: Promise<EditableBox[]> | null = null;

export default function AssessmentPage() {
  return (
    <BoxSectionPage
      eyebrow="Assessment"
      title="Business Assessment"
      tableName="assessment_boxes"
      defaultBoxes={defaultBoxes}
      cachedBoxes={cachedAssessmentBoxes}
      boxesPromise={assessmentBoxesPromise}
      setCachedBoxes={(boxes) => {
        cachedAssessmentBoxes = boxes;
      }}
      setBoxesPromise={(promise) => {
        assessmentBoxesPromise = promise;
      }}
    />
  );
}
