import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Selector } from "@astryxdesign/core/Selector";
import { StackItem } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { RANGES } from "../lib/ranges";
import { ErrorBanner, LoadingState, Metric, PageHeader } from "../ui/blocks";
import type { LoginAnalytics, OperationsAnalytics } from "../types";

export function Analytics() {
  const [days, setDays] = useState(7);
  const [logins, setLogins] = useState<LoginAnalytics | null>(null);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(""); setLogins(null); setOperations(null);
    const [l, o] = await Promise.allSettled([api.analytics.logins(days), api.analytics.operations(days)]);
    if (id !== seq.current) return;
    setLogins(l.status === "fulfilled" ? l.value : null);
    setOperations(o.status === "fulfilled" ? o.value : null);
    if (l.status === "rejected" || o.status === "rejected") setError(l.status === "rejected" && o.status === "rejected" ? "Analytics could not be loaded. Check the API connection and retry." : `${l.status === "rejected" ? "Sign-in analytics" : "Operations analytics"} could not be loaded. Other results are available.`);
    setLoading(false);
  }, [days]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  const daily = logins?.items ?? [];
  const peak = Math.max(1, ...daily.map((i) => i.count));
  const uptime = operations?.uptime;
  const rows = Array.isArray(uptime?.applications) ? uptime.applications as Array<Record<string, unknown>> : [];

  return <VStack gap={5}>
    <PageHeader eyebrow="Insights / Operations" title="Analytics" description="Authentication trends, active sessions, and application reliability."
      actions={<><Selector label="Time range" variant="secondary" options={RANGES} value={String(days)} onChange={(v) => v && setDays(Number(v))} /><Button label="Refresh" isLoading={loading} onClick={() => void load()} /></>} />
    {error && <ErrorBanner message={error} onRetry={() => void load()} />}
    <Grid columns={{ minWidth: 200, max: 5, repeat: "fit" }} gap={4}>
      <Metric label="Successful logins" value={logins?.total ?? "—"} hint={`Completed sign-ins over ${days} days.`} />
      <Metric label="Unique users" value={logins?.uniqueUsers ?? "—"} hint="Distinct accounts in the window." />
      <Metric label="Failed attempts" value={logins?.failedAttempts ?? "—"} hint="Failed authentication events." />
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Current sessions across owned apps." />
      <Metric label="Uptime coverage" value={uptime?.average_percent == null ? "—" : `${uptime.average_percent}%`} hint={uptime ? `${uptime.operational} of ${uptime.total} applications operational` : "No uptime data available."} />
    </Grid>
    <Grid columns={{ minWidth: 340, max: 2, repeat: "fit" }} gap={4}>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Daily sign-ins</Heading>
        {loading && !logins ? <LoadingState title="Loading trends" /> : daily.length
          ? <VStack gap={2} role="group" aria-label="Daily successful sign-ins">
            {daily.map((i) => <HStack gap={3} vAlign="center" key={i.date}>
              <StackItem size="static"><Text type="supporting" color="secondary" hasTabularNumbers>{new Date(`${i.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text></StackItem>
              <StackItem size="fill"><ProgressBar value={i.count} max={peak} label={`${i.date}: ${i.count} sign-ins`} isLabelHidden /></StackItem>
              <StackItem size="static"><Text type="supporting" hasTabularNumbers>{i.count}</Text></StackItem>
            </HStack>)}
          </VStack>
          : logins ? <EmptyState isCompact title="No sign-in data yet" description="Real activity will appear here after users authenticate." /> : <Text color="secondary">Sign-in data is unavailable.</Text>}
      </VStack></Card>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Application health <Badge label={`${rows.length} tracked`} /></Heading>
        {rows.length ? rows.map((row, i) => {
          const name = String(row.name || row.application_name || row.application_id || `Application ${i + 1}`);
          const pct = typeof row.uptime_percent === "number" ? row.uptime_percent : null;
          const status = String(row.status || (pct === null ? "no data" : pct >= 99 ? "operational" : "degraded"));
          return <Item key={String(row.application_id || row.id || name)} label={name} description={status.replace(/_/g, " ")}
            startContent={<StatusDot variant={status === "operational" ? "success" : status === "degraded" ? "error" : "neutral"} label={status} />}
            endContent={<Text weight="semibold" hasTabularNumbers>{pct === null ? "—" : `${pct}%`}</Text>} />;
        }) : loading ? <LoadingState title="Loading reliability" /> : operations ? <EmptyState isCompact title="No reliability data" description="Uptime metrics appear after checks have been collected." /> : <Text color="secondary">Reliability data is unavailable.</Text>}
      </VStack></Card>
    </Grid>
  </VStack>;
}
