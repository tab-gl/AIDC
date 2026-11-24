import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
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
import { dayLabel } from "../lib/dates";
import { RANGES } from "../lib/ranges";
import { usePreferences } from "../lib/prefs";
import { ErrorBanner, LoadingState, Metric, PageHeader } from "../ui/blocks";
import type { LoginAnalytics, OperationsAnalytics, Quota } from "../types";

export function Analytics() {
  const { defaultRange } = usePreferences();
  const [days, setDays] = useState<number>(defaultRange);
  const [logins, setLogins] = useState<LoginAnalytics | null>(null);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true); setError(""); setLogins(null); setOperations(null);
    const [l, o, q] = await Promise.allSettled([api.analytics.logins(days), api.analytics.operations(days), api.quota.get()]);
    if (id !== seq.current) return;
    setLogins(l.status === "fulfilled" ? l.value : null);
    setOperations(o.status === "fulfilled" ? o.value : null);
    setQuota(q.status === "fulfilled" ? q.value.quota ?? null : null);
    if (l.status === "rejected" || o.status === "rejected") setError(l.status === "rejected" && o.status === "rejected" ? "Analytics could not be loaded. Check the API connection and retry." : `${l.status === "rejected" ? "Sign-in analytics" : "Operations analytics"} could not be loaded. Other results are available.`);
    setLoading(false);
  }, [days]);
  useEffect(() => { void load(); return () => { seq.current += 1; }; }, [load]);

  const daily = logins?.items ?? [];
  const peak = Math.max(1, ...daily.map((i) => i.count));
  const uptime = operations?.uptime;
  const rows = Array.isArray(uptime?.applications) ? uptime.applications as Array<Record<string, unknown>> : [];
  // One flat application limit per Ace ID; there are no plans or subscriptions.
  const limit = typeof quota?.limit === "number" ? quota.limit : null;
  const used = typeof quota?.count === "number" ? quota.count : null;
  const remaining = typeof quota?.remaining === "number" ? quota.remaining : limit !== null && used !== null ? Math.max(limit - used, 0) : null;
  const usage = limit !== null && limit > 0 && remaining !== null ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : null;

  return <VStack gap={5}>
    <PageHeader eyebrow="Insights" title="Analytics" description="Authentication trends, active sessions, and application reliability."
      actions={<><Selector label="Time range" variant="secondary" options={RANGES} value={String(days)} onChange={(v) => v && setDays(Number(v))} /><Button label="Refresh" isLoading={loading} onClick={() => void load()} /></>} />
    {error && <ErrorBanner message={error} onRetry={() => void load()} />}
    <div className="bento bento-5">
      <Metric label="Successful logins" value={logins?.total ?? "—"} hint={`Completed sign-ins over ${days} days.`} />
      <Metric label="Unique users" value={logins?.uniqueUsers ?? "—"} hint="Distinct Ace IDs in the window." />
      <Metric label="Failed attempts" value={logins?.failedAttempts ?? "—"} hint="Failed authentication events." />
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Current sessions across owned apps." />
      <Metric label="Uptime coverage" value={uptime?.average_percent == null ? "—" : `${uptime.average_percent}%`} hint={uptime ? `${uptime.operational} of ${uptime.total} applications operational` : "No uptime data available."} />
    </div>
    <Card padding={4}><VStack gap={2}>
      <HStack gap={2} vAlign="center" wrap="wrap"><Heading level={2}>Application quota</Heading></HStack>
      {limit !== null && used !== null ? <>
        <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
          <Text type="supporting" color="secondary">{used} of {limit} applications used</Text>
          <Text type="supporting" color="secondary" hasTabularNumbers>{remaining} remaining</Text>
        </HStack>
        <ProgressBar label="Application quota used" value={usage ?? 0} isLabelHidden />
      </> : <Text color="secondary">{loading ? "Loading quota…" : "Quota is unavailable. The application limit could not be loaded."}</Text>}
    </VStack></Card>
    <div className="bento bento-2">
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
          const pct = typeof row.uptime_percent === "number" ? row.uptime_percent : null;
          const status = String(row.status || (pct === null ? "no data" : pct >= 99 ? "operational" : "degraded"));
          return <Item key={String(row.application_id || row.id || name)} label={name} description={status.replace(/_/g, " ")}
            startContent={<StatusDot variant={status === "operational" ? "success" : status === "degraded" ? "error" : "neutral"} label={status} />}
            endContent={<Text weight="semibold" hasTabularNumbers>{pct === null ? "—" : `${pct}%`}</Text>} />;
        }) : loading ? <LoadingState title="Loading reliability" /> : operations ? <EmptyState isCompact title="No reliability data" description="Uptime metrics appear after checks have been collected." /> : <Text color="secondary">Reliability data is unavailable.</Text>}
      </VStack></Card>
    </div>
  </VStack>;
}
