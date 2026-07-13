import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Health" };

export default function HealthPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Health"
        description="Activity, heart, and sleep data from Apple Health."
      />
      <EmptyState
        icon={HeartPulse}
        title="Apple Health isn't connected yet"
        description="The integration contract lives in src/features/apple-health. Implement AppleHealthProvider and this page comes alive."
      />
    </div>
  );
}
