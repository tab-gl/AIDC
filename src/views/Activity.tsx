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
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { ErrorBanner, LoadingState, Metric, PageHeader, eventDetail, eventLabel } from "../ui/blocks";
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
    setLoading(true); setError(null); setAnalytics(null); setOperations(null);
    const [a, l, o] = await Promise.allSettled([api.activity.list(100), api.analytics.logins(days), api.analytics.operations(days)]);
    if (id !== seq.current) return;
    const failed = [a.status === "rejected" && "events", l.status === "rejected" && "sign-in analytics", o.status === "rejected" && "operations analytics"].filter(Boolean);
    if (failed.length) setError(`Could not load ${failed.join(", ")}. Please retry.`);
    setEventsUnavailable(a.status === "rejected");
    setEvents(a.status === "fulfilled" ? a.value.events || [] : []);
    setAnalytics(l.status === "fulfilled" ? l.value : null);
    setOperations(o.status === "fulfilled" ? o.value : null);
    setLoading(false);
  }, [days]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((e) => (filter === "all" || (filter === "success" ? e.success : !e.success))
      && `${e.event_type} ${e.application_name || ""} ${JSON.stringify(e.metadata || {})}`.toLowerCase().includes(needle));
  }, [events, filter, search]);

  return <VStack gap={5}>
    <PageHeader eyebrow="Observability" title="Activity" description="Real application events and login trends, scoped to applications you own."
      actions={<><Selector label="Range" variant="secondary" options={RANGES} value={String(days)} onChange={(v) => v && setDays(Number(v))} /><Button label="Refresh" isLoading={loading} onClick={() => void load()} /></>} />
    {error && <ErrorBanner message={error} onRetry={() => void load()} />}
    <Grid columns={{ minWidth: 190, max: 5, repeat: "fit" }} gap={4}>
      <Metric label="Logins" value={analytics?.total ?? "—"} hint="Successful sessions in the window." />
      <Metric label="Failed attempts" value={analytics?.failedAttempts ?? "—"} hint="Failed logins on your apps." />
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Current sessions on your apps." />
      <Metric label="Operational apps" value={operations ? `${operations.uptime.operational}/${operations.uptime.total}` : "—"} hint="Successful check in the last 15 minutes." />
      <Metric label="Events loaded" value={loading || eventsUnavailable ? "—" : events.length} hint="Most recent records." />
    </Grid>
    <Card padding={4}><VStack gap={3}>
      <HStack gap={3} vAlign="end" wrap="wrap">
        <StackItem size="fill"><TextInput label="Search events" isLabelHidden type="search" startIcon="search" hasClear value={search} onChange={setSearch} placeholder="Search events" /></StackItem>
        <StackItem size="static"><Selector label="Filter" variant="secondary" options={FILTERS} value={filter} onChange={(v) => v && setFilter(v)} /></StackItem>
      </HStack>
      {loading ? <LoadingState title="Loading activity" /> : eventsUnavailable ? null : filtered.length
        ? <VStack gap={0}>{filtered.map((e) => <Item key={e.id} label={eventLabel(e.event_type)}
          description={<>{e.application_name || "Application"} · {e.success ? "Succeeded" : "Failed"}{eventDetail(e.metadata) && ` · ${eventDetail(e.metadata)}`}</>}
          startContent={<StatusDot variant={e.success ? "success" : "error"} label={e.success ? "Succeeded" : "Failed"} />} endContent={<Timestamp value={e.created_at} format="auto" />} />)}</VStack>
        : <EmptyState isCompact title="No matching events" description="Activity appears when applications emit events. No demo data is fabricated." />}
    </VStack></Card>
  </VStack>;
}
