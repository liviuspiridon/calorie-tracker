import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Meals" };

export default function MealsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Meals"
        description="Log meals from a photo or a note; AI fills in the nutrition."
      />
      <EmptyState
        icon={UtensilsCrossed}
        title="Meal logging isn't set up yet"
        description="The integration contract lives in src/features/meal-logging. Implement MealAnalyzer and this page comes alive."
      />
    </div>
  );
}
