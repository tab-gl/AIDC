import { Suspense } from "react";
import { VStack } from "@astryxdesign/core/VStack";
import { LoadingState } from "../ui/blocks";
import { GlassSegmented } from "../ui/GlassSegmented";
import { INSIGHTS_TABS, type InsightsTab } from "../lib/navigation";
import type { Application } from "../types";
import { Analytics } from "./Analytics";
import { Activity } from "./Activity";
import { Users } from "./Users";

type Props = {
  tab: InsightsTab;
  onTab: (tab: InsightsTab) => void;
  applications: Application[];
  applicationsLoading: boolean;
  applicationsError: string | null;
};

const OPTIONS = INSIGHTS_TABS.map((t) => ({ value: t.id, label: t.label }));

/** One destination for trends, the event log and the people who consented to your apps. */
export function Insights({ tab, onTab, applications, applicationsLoading, applicationsError }: Props) {
  return <VStack gap={5}>
    <GlassSegmented label="Insights section" options={OPTIONS} value={tab} onChange={(value) => onTab(value as InsightsTab)} />
    <Suspense fallback={<LoadingState title="Loading" />}>
      <div key={tab} className="route-enter">
        {tab === "analytics" && <Analytics applications={applications} applicationsLoading={applicationsLoading} applicationsError={applicationsError} />}
        {tab === "activity" && <Activity />}
        {tab === "users" && <Users />}
      </div>
    </Suspense>
  </VStack>;
}
