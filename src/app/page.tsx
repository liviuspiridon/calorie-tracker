import type { Metadata } from "next";

import { TodayDashboard } from "@/components/dashboard/today-dashboard";

export const metadata: Metadata = { title: "Today" };

export default function HomePage() {
  return <TodayDashboard />;
}
