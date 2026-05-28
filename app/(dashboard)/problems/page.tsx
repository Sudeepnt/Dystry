"use client";

import { BoxSectionPage, EditableBox } from "@/components/box-section-page";

const defaultBoxes: EditableBox[] = [
  { id: "problem-1", heading: "Problem 1", content: "" },
];

let cachedProblemBoxes: EditableBox[] | null = null;
let problemBoxesPromise: Promise<EditableBox[]> | null = null;

export default function ProblemsPage() {
  return (
    <BoxSectionPage
      eyebrow="Problems"
      title="Problems"
      tableName="problems_boxes"
      defaultBoxes={defaultBoxes}
      cachedBoxes={cachedProblemBoxes}
      boxesPromise={problemBoxesPromise}
      setCachedBoxes={(boxes) => {
        cachedProblemBoxes = boxes;
      }}
      setBoxesPromise={(promise) => {
        problemBoxesPromise = promise;
      }}
    />
  );
}
