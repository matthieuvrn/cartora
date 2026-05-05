import { DEFAULT_DISPLAY_NAME } from "./RestaurantInitPolicy";

export type ActivationStepId = "named" | "firstItem" | "threeItems" | "published";

export type ActivationStep = {
  id: ActivationStepId;
  done: boolean;
};

export type ActivationChecklistInput = {
  restaurantName: string;
  totalItems: number;
  menuStatus: "DRAFT" | "PUBLISHED";
};

export type ActivationChecklist = {
  steps: ActivationStep[];
  doneCount: number;
  totalCount: number;
  allDone: boolean;
};

const STEP_ORDER: readonly ActivationStepId[] = ["named", "firstItem", "threeItems", "published"];

export class ActivationPolicy {
  static compute(input: ActivationChecklistInput): ActivationChecklist {
    const conditions: Record<ActivationStepId, boolean> = {
      named: input.restaurantName.trim() !== DEFAULT_DISPLAY_NAME,
      firstItem: input.totalItems >= 1,
      threeItems: input.totalItems >= 3,
      published: input.menuStatus === "PUBLISHED",
    };

    const steps: ActivationStep[] = STEP_ORDER.map((id) => ({ id, done: conditions[id] }));
    const doneCount = steps.filter((s) => s.done).length;
    const totalCount = steps.length;

    return {
      steps,
      doneCount,
      totalCount,
      allDone: doneCount === totalCount,
    };
  }
}
