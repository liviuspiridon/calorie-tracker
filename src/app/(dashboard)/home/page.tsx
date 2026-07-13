import type { Metadata } from "next";
import { House } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Health-adjacent signals from your Home Assistant sensors."
      />
      <EmptyState
        icon={House}
        title="Home Assistant isn't connected yet"
        description="The integration contract lives in src/features/home-assistant. Implement HomeAssistantClient and this page comes alive."
      />
    </div>
  );
}
