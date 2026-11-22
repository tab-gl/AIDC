import { useCallback, useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Item } from "@astryxdesign/core/Item";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { api } from "../lib/api";
import { M3Progress } from "../ui/m3e";
import { Metric, PageHeader, eventLabel } from "../ui/blocks";
import type { ActivityEvent, Application, DiscoveryStatus, OperationsAnalytics, Quota } from "../types";

type Props = { applications: Application[]; quota: Quota | null; signedIn: boolean; showTips: boolean; onApplications: () => void; onActivity: () => void; onSettings: () => void; onCreate: () => void };

export function Overview({ applications, quota, signedIn, showTips, onApplications, onActivity, onSettings, onCreate }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryStatus | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const remaining = quota?.remaining, limit = quota?.limit;
  const usage = typeof remaining === "number" && typeof limit === "number" && limit > 0 ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : null;

  const refresh = useCallback(async () => {
    if (!signedIn) { setEvents([]); setOperations(null); setDiscovery(null); setApiHealthy(null); return; }
    setRefreshing(true);
    const [a, o, d, h] = await Promise.allSettled([api.activity.list(6), api.analytics.operations(30), api.integration.discovery(), api.health.get()]);
    setEvents(a.status === "fulfilled" ? a.value.events || [] : []);
    setOperations(o.status === "fulfilled" ? o.value : null);
    setDiscovery(d.status === "fulfilled" ? d.value : null);
    setApiHealthy(h.status === "fulfilled" ? Boolean(h.value.ok) : false);
    setRefreshing(false);
  }, [signedIn]);
  useEffect(() => { void refresh(); }, [refresh]);

  const uptime = operations?.uptime;
  const identityStatus = discovery?.status || "unknown";
  const health = (ok: boolean | null) => <StatusDot variant={ok === null ? "neutral" : ok ? "success" : "error"} label={ok === null ? "Unknown" : ok ? "Healthy" : "Degraded"} />;

  return <VStack gap={6}>
    <PageHeader eyebrow="AIDC / Console" title="Manage identity apps" description="Applications, usage, provider health, and recent events."
      actions={<>{signedIn && <><Button label="Refresh" onClick={() => void refresh()} isLoading={refreshing} /><Button label="New application" variant="primary" onClick={onCreate} /></>}</>} />

    <Grid columns={{ minWidth: 200 }} gap={4}>
      <Metric label="Applications" value={signedIn ? applications.length : "—"} hint={signedIn ? "Linked to your Ace ID." : "Sign in to load your workspace."} />
      <Metric label="Available quota" value={signedIn && typeof remaining === "number" ? remaining : "—"} hint={typeof limit === "number" ? `${quota?.count ?? applications.length} of ${limit} applications used` : "Quota unavailable"}>
        {usage !== null && <M3Progress value={usage} label="Application quota used" />}
      </Metric>
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Across the apps you own." />
      <Metric label="Operational apps" value={uptime ? `${uptime.operational}/${uptime.total}` : "—"} hint="Passing their latest uptime check." />
    </Grid>

    <Grid columns={{ minWidth: 320 }} gap={4}>
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Operational health</Heading>
          <Item label="Console API" description={apiHealthy === null ? "Unknown" : apiHealthy ? "Healthy" : "Degraded"} startContent={health(apiHealthy)} />
          <Item label="Ace ID discovery" description={identityStatus} startContent={health(identityStatus === "ready" ? true : identityStatus === "failed" ? false : null)} />
          <HStack gap={2}><Button label="Diagnostics & settings" onClick={onSettings} /></HStack>
        </VStack>
      </Card>
      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={2}>Recent activity</Heading>
          {events.length ? events.map((event) => <Item key={event.id} label={eventLabel(event.event_type)}
            description={<>{event.application_name || "Application"} · <Timestamp value={event.created_at} format="relative" /></>}
            startContent={<StatusDot variant={event.success ? "success" : "error"} label={event.success ? "Succeeded" : "Failed"} />} />)
            : <Text color="secondary">{signedIn ? "No recent events were returned by the API." : "Sign in to view recent events."}</Text>}
          <HStack gap={2}><Button label="Open event stream" onClick={onActivity} /><Button label="Manage applications" variant="ghost" onClick={onApplications} /></HStack>
        </VStack>
      </Card>
    </Grid>

    {showTips && <Banner status="info" title="Security tip" description="Use exact HTTPS redirect URIs in production, keep origins aligned with the deployed application, and rotate client secrets immediately after exposure."
      endContent={<Button label="Review applications" onClick={onApplications} />} />}
  </VStack>;
}
