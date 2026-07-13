import { HeartPulse, House, UtensilsCrossed } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Dashboard home. Data sources aren't wired up yet, so each panel states
 * what will live there and what unlocks it — see src/features/* for the
 * integration contracts.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Today"
        description="Steps, meals, sleep, and home signals — in one place, once your sources are connected."
      />

      <section aria-labelledby="sources-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 id="sources-heading" className="text-muted-foreground text-sm font-medium">
            Data sources
          </h2>
          <Badge variant="secondary">0 of 3 connected</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Apple Health</CardTitle>
              <CardDescription>Steps, heart rate, sleep, and workouts.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={HeartPulse}
                title="Not connected"
                description="Connect Apple Health to see your activity and sleep here."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meals</CardTitle>
              <CardDescription>
                Photo-based logging with AI nutrition estimates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={UtensilsCrossed}
                title="No meals logged"
                description="Once meal logging is set up, log a meal from a photo or a short note."
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2 xl:col-span-1">
            <CardHeader>
              <CardTitle>Home</CardTitle>
              <CardDescription>
                Air quality, scale, and sleep-environment sensors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={House}
                title="Not connected"
                description="Connect Home Assistant to bring your home sensors into the picture."
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
