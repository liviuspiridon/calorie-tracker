import type { Metadata } from "next";

import { WeightPage } from "@/components/weight/weight-page";

export const metadata: Metadata = { title: "Weight" };

export default function Page() {
  return <WeightPage />;
}
