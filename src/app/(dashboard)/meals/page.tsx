import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { MealLogger } from "@/features/meal-logging/components/meal-logger";

export const metadata: Metadata = { title: "Meals" };

export default function MealsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Meals" description="Keep a lightweight log of what you eat." />
      <MealLogger />
    </div>
  );
}
