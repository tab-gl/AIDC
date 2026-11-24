import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StackItem } from "@astryxdesign/core/Stack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { APPLICATION_LIMIT } from "../lib/limits";
import { dayLabel } from "../lib/dates";
import { RANGES } from "../lib/ranges";
import { usePreferences } from "../lib/prefs";
import { ErrorBanner, LoadingState, Metric, PageHeader } from "../ui/blocks";
import { GlassSegmented } from "../ui/GlassSegmented";
import type { Application, LoginAnalytics, OperationsAnalytics } from "../types";

type Props = { applications: Application[]; applicationsLoading: boolean; applicationsError: string | null };

export function Analytics({ applications, applicationsLoading, applicationsError }: Props) {
  const { defaultRange } = usePreferences();
  const [days, setDays] = useState<number>(defaultRange);
  const [logins, setLogins] = useState<LoginAnalytics | null>(null);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError("");
    const [l, o] = await Promise.allSettled([api.analytics.logins(days), api.analytics.operations(days)]);
    if (id !== seq.current) return;
    // Keep the last good series on a failed refresh; the banner names what is stale.
    if (l.status === "fulfilled") setLogins(l.value);
    if (o.status === "fulfilled") setOperations(o.value);
    if (l.status === "rejected" || o.status === "rejected") setError(l.status === "rejected" && o.status === "rejected" ? "Analytics could not be loaded. Check the API connection and retry." : `${l.status === "rejected" ? "Sign-in analytics" : "Operations analytics"} could not be loaded. The other series is still shown.`);
    setLoading(false);
  }, [days]);
  // Results are tied to the selected window, so drop them when the window changes; the
  // next load replaces the cards as soon as it settles.
  useEffect(() => { setLogins(null); setOperations(null); }, [days]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  // Newest last, so the bars read top-to-bottom as a timeline even if the API changes order.
  const daily = [...(logins?.items ?? [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const hasData = Boolean(logins || operations);
  const peak = Math.max(1, ...daily.map((i) => i.count));
  const uptime = operations?.uptime;
  const rows = Array.isArray(uptime?.applications) ? uptime.applications as Array<Record<string, unknown>> : [];
  const limit = APPLICATION_LIMIT;
  const used = applications.length;
  const countReady = !applicationsLoading && !applicationsError;
  const remaining = Math.max(limit - used, 0);
  const usage = Math.min(100, Math.max(0, (used / limit) * 100));

  return <VStack gap={5}>
    <PageHeader eyebrow="Insights" title="Analytics" description="Authentication trends, active sessions, and application reliability."
      actions={<><GlassSegmented hideLabel label="Time range" options={RANGES} value={String(days)} onChange={(v) => setDays(Number(v))} /><Button label="Refresh" isLoading={loading} onClick={() => void load()} /></>} />
    {error && <ErrorBanner title="Some analytics are unavailable" message={error} onRetry={() => void load()} />}
    <Text type="supporting" color="secondary">Showing the last {days} days.</Text>
    <div className="bento bento-5" aria-busy={loading || undefined}>
      <Metric label="Successful logins" value={logins?.total ?? "—"} hint={`Completed sign-ins over ${days} days.`} />
      <Metric label="Unique users" value={logins?.uniqueUsers ?? "—"} hint="Distinct Ace IDs in the window." />
      <Metric label="Failed attempts" value={logins?.failedAttempts ?? "—"} hint="Failed authentication events." />
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Current sessions across owned apps." />
      <Metric label="Uptime coverage" value={uptime?.average_percent == null ? "—" : `${uptime.average_percent}%`} hint={uptime ? `${uptime.operational} of ${uptime.total} applications operational` : "No uptime data available."} />
    </div>
    <Card padding={4}><VStack gap={2}>
      <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={2}>Project limit</Heading></HStack>
      {countReady ? <>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting" color="secondary">{used} of {limit} applications used</Text>
          <Text type="supporting" color="secondary" hasTabularNumbers>{remaining} remaining</Text>
        </HStack>
        <ProgressBar label="Projects used" value={usage} isLabelHidden />
      </> : <Text color="secondary">{applicationsLoading ? "Loading applications…" : "Application count is unavailable."}</Text>}
    </VStack></Card>
    <div className="bento bento-2" aria-busy={loading || undefined} style={{ opacity: loading && hasData ? 0.78 : 1, transition: "opacity .18s ease" }}>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Daily sign-ins</Heading>
        {loading && !logins ? <LoadingState title="Loading trends" /> : daily.length
          ? <VStack gap={2} role="group" aria-label="Daily successful sign-ins">
            {daily.map((i) => <HStack gap={3} vAlign="center" key={i.date}>
              <StackItem size="static"><Text type="supporting" color="secondary" hasTabularNumbers>{dayLabel(i.date)}</Text></StackItem>
              <StackItem size="fill"><ProgressBar value={i.count} max={peak} label={`${i.date}: ${i.count} sign-ins`} isLabelHidden /></StackItem>
              <StackItem size="static"><Text type="supporting" hasTabularNumbers>{i.count}</Text></StackItem>
            </HStack>)}
          </VStack>
          : logins ? <EmptyState isCompact title="No sign-in data yet" description="Real activity will appear here after users authenticate." /> : <Text color="secondary">Sign-in data is unavailable.</Text>}
      </VStack></Card>
      <Card padding={4}><VStack gap={3}>
        <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={2}>Application health</Heading><Badge label={`${rows.length} tracked`} /></HStack>
        {rows.length ? rows.map((row, i) => {
          const name = String(row.name || row.application_name || row.application_id || `Application ${i + 1}`);
          const rawPct = row.uptime_percent;
          const parsed = typeof rawPct === "number" ? rawPct : typeof rawPct === "string" && rawPct.trim() !== "" ? Number(rawPct) : NaN;
          const pct = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : null;
          const status = String(row.status || (pct === null ? "no data" : pct >= 99 ? "operational" : "degraded"));
          return <Item key={String(row.application_id || row.id || name)} label={name} description={status.replace(/_/g, " ")}
            startContent={<StatusDot variant={status === "operational" ? "success" : status === "degraded" ? "error" : "neutral"} label={status} />}
            endContent={<Text weight="semibold" hasTabularNumbers>{pct === null ? "—" : `${pct}%`}</Text>} />;
        }) : loading ? <LoadingState title="Loading reliability" /> : operations ? <EmptyState isCompact title="No reliability data" description="Uptime metrics appear after checks have been collected." /> : <Text color="secondary">Reliability data is unavailable.</Text>}
      </VStack></Card>
    </div>
  </VStack>;
}
