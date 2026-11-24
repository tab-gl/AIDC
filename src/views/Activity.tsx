import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Selector } from "@astryxdesign/core/Selector";
import { StackItem } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { ErrorBanner, LoadingState, Metric, PageHeader, eventDetail, eventLabel } from "../ui/blocks";
import { PixelIcon } from "../ui/PixelIcon";
import { RANGES } from "../lib/ranges";
import { usePreferences } from "../lib/prefs";
import type { ActivityEvent, LoginAnalytics, OperationsAnalytics } from "../types";

const FILTERS = [{ value: "all", label: "All results" }, { value: "success", label: "Successful" }, { value: "failed", label: "Failed" }];

export function Activity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [analytics, setAnalytics] = useState<LoginAnalytics | null>(null);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const { defaultRange } = usePreferences();
  const [days, setDays] = useState<number>(defaultRange);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsUnavailable, setEventsUnavailable] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(null);
    const [a, l, o] = await Promise.allSettled([api.activity.list(100), api.analytics.logins(days), api.analytics.operations(days)]);
    if (id !== seq.current) return;
    const failed = [a.status === "rejected" && "events", l.status === "rejected" && "sign-in analytics", o.status === "rejected" && "operations analytics"].filter(Boolean);
    if (failed.length) setError(`Could not load ${failed.join(", ")}. Last successful results stay on screen where available; retry to update them.`);
    setEventsUnavailable(a.status === "rejected");
    // Only a successful response replaces a dataset; a failed refresh leaves the last good
    // values visible and explains itself in the banner above.
    if (a.status === "fulfilled") setEvents(a.value.events || []);
    if (l.status === "fulfilled") setAnalytics(l.value);
    if (o.status === "fulfilled") setOperations(o.value);
    setLoading(false);
  }, [days]);
  useEffect(() => { setAnalytics(null); setOperations(null); }, [days]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((e) => (filter === "all" || (filter === "success" ? e.success : !e.success))
      && `${e.event_type} ${e.application_name || ""} ${JSON.stringify(e.metadata || {})}`.toLowerCase().includes(needle));
  }, [events, filter, search]);

  return <VStack gap={5}>
    <PageHeader eyebrow="Observability" title="Activity" description="Real application events and login trends, scoped to applications you own."
      actions={<><Selector label="Range" variant="secondary" options={RANGES} value={String(days)} onChange={(v) => v && setDays(Number(v))} /><Button label="Refresh" isLoading={loading} onClick={() => void load()} /></>} />
    {error && <ErrorBanner title="Some activity is unavailable" message={error} onRetry={() => void load()} />}
    <Grid columns={{ minWidth: 132, max: 5, repeat: "fit" }} gap={4}>
      <Metric label="Logins" value={analytics?.total ?? "—"} hint="Successful sessions in the window." />
      <Metric label="Failed attempts" value={analytics?.failedAttempts ?? "—"} hint="Failed logins on your apps." />
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Current sessions on your apps." />
      <Metric label="Operational apps" value={operations ? `${operations.uptime.operational}/${operations.uptime.total}` : "—"} hint="Successful check in the last 15 minutes." />
      <Metric label="Events loaded" value={events.length} hint={eventsUnavailable && !events.length ? "Event stream unavailable." : "Most recent records."} />
    </Grid>
    <Card padding={4}><VStack gap={3}>
      <HStack gap={3} vAlign="end" wrap="wrap">
        <StackItem size="fill"><TextInput label="Search events" isLabelHidden type="search" startIcon={<PixelIcon name="search" size={18} />} hasClear value={search} onChange={setSearch} placeholder="Search events" /></StackItem>
        <StackItem size="static"><Selector label="Filter" variant="secondary" options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} /></StackItem>
      </HStack>
      {loading && !events.length ? <LoadingState title="Loading activity" />
        : eventsUnavailable && !events.length ? <Text color="secondary">The event stream is unavailable right now. Retry above.</Text>
        : filtered.length
        ? <VStack gap={0} aria-busy={loading || undefined} style={{ opacity: loading ? 0.72 : 1, transition: "opacity .18s ease" }}>{filtered.map((e) => {
          const detail = eventDetail(e.metadata);
          return <Item key={e.id} label={eventLabel(e.event_type)}
            description={<>{e.application_name || "Application"} · {e.success ? "Succeeded" : "Failed"}{detail && ` · ${detail}`}</>}
            startContent={<StatusDot variant={e.success ? "success" : "error"} label={e.success ? "Succeeded" : "Failed"} />} endContent={<Timestamp value={e.created_at} format="auto" />} />;
        })}</VStack>
        : <EmptyState isCompact title={search.trim() || filter !== "all" ? "No matching events" : "No activity yet"}
          description={search.trim() || filter !== "all" ? "Adjust the search or result filter to see more events." : "Activity appears here as applications emit events. No demo data is fabricated."} />}
    </VStack></Card>
  </VStack>;
}
