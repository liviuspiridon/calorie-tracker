import type { Metadata } from "next";

import { BodyCompositionPage } from "@/components/body-composition/body-composition-page";

export const metadata: Metadata = { title: "Body Composition" };

export default function Page() {
  return <BodyCompositionPage />;
}
