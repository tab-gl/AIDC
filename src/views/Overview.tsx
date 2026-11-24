import { useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { Metric, PageHeader, eventLabel } from "../ui/blocks";
import { Reveal } from "../ui/motion";
import type { ActivityEvent, Application, DiscoveryStatus, OperationsAnalytics, Quota } from "../types";

type Props = { applications: Application[]; applicationsLoading: boolean; applicationsError: string | null; quota: Quota | null; signedIn: boolean; showTips: boolean; onApplications: () => void; onActivity: () => void; onSettings: () => void; onCreate: () => void };

export function Overview({ applications, applicationsLoading, applicationsError, quota, signedIn, showTips, onApplications, onActivity, onSettings, onCreate }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryStatus | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const seq = useRef(0);
  const limit = typeof quota?.limit === "number" ? quota.limit : null;
  const used = typeof quota?.count === "number" ? quota.count : applications.length;
  const remaining = typeof quota?.remaining === "number" ? quota.remaining : limit !== null ? Math.max(limit - used, 0) : null;
  const usage = limit !== null && limit > 0 && remaining !== null ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : null;
  const plan = quota?.name || quota?.plan || null;
  const subscriptionInactive = Boolean(quota?.status && quota.status !== "active");

  const refresh = useCallback(async () => {
    const id = ++seq.current;
    if (!signedIn) { setEvents([]); setOperations(null); setDiscovery(null); setApiHealthy(null); setRefreshing(false); return; }
    setRefreshing(true);
    const [a, o, d, h] = await Promise.allSettled([api.activity.list(6), api.analytics.operations(30), api.integration.discovery(), api.health.get()]);
    if (id !== seq.current) return;
    setUnavailable([a.status === "rejected" && "activity", o.status === "rejected" && "operations", d.status === "rejected" && "discovery", h.status === "rejected" && "health"].filter((item): item is string => Boolean(item)));
    setEvents(a.status === "fulfilled" ? a.value.events || [] : []);
    setOperations(o.status === "fulfilled" ? o.value : null);
    setDiscovery(d.status === "fulfilled" ? d.value : null);
    setApiHealthy(h.status === "fulfilled" ? Boolean(h.value.ok) : false);
    setRefreshing(false);
  }, [signedIn]);
  useEffect(() => { void refresh(); return () => { seq.current += 1; }; }, [refresh]);

  const uptime = operations?.uptime;
  const identityStatus = discovery?.status || "unknown";
  const health = (ok: boolean | null) => <StatusDot variant={ok === null ? "neutral" : ok ? "success" : "error"} label={ok === null ? "Unknown" : ok ? "Healthy" : "Degraded"} />;

  return <VStack gap={6}>
    <PageHeader eyebrow="Overview" title="Manage identity apps" description="Applications, usage, provider health, and recent events."
      actions={<><Button label="Refresh" onClick={() => void refresh()} isLoading={refreshing} /><Button label="New application" variant="primary" onClick={onCreate} /></>} />
    {unavailable.length > 0 && <Banner status="warning" title="Some information is unavailable" description={`Could not load ${unavailable.join(", ")}. Try refreshing.`} endContent={<Button label="Retry" onClick={() => void refresh()} isLoading={refreshing} />} />}

    <Reveal><div className="bento bento-4">
      <Metric label="Applications" value={signedIn && !applicationsLoading && !applicationsError ? applications.length : "—"} hint={applicationsLoading ? "Loading applications…" : applicationsError ? "Application count unavailable." : signedIn ? "Linked to your Ace ID." : "Sign in to load your workspace."} />
      <Metric label="Available quota" value={signedIn && remaining !== null ? remaining : "—"}
        hint={!signedIn ? "Sign in to load your quota." : subscriptionInactive ? `${plan ? `${plan} ` : "Your "}subscription is ${quota?.status}.` : limit !== null ? `${used} of ${limit} applications used${plan ? ` · ${plan} plan` : ""}` : "Quota unavailable"}>
        {usage !== null && <ProgressBar label="Application quota used" value={usage} isLabelHidden />}
      </Metric>
      <Metric label="Active sessions" value={operations?.sessions?.active ?? "—"} hint="Across the apps you own." />
      <Metric label="Operational apps" value={uptime ? `${uptime.operational}/${uptime.total}` : "—"} hint="Passing their latest uptime check." />
    </div></Reveal>

    <Reveal delay={70}><div className="bento bento-2">
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
            : <Text color="secondary">{refreshing ? "Loading recent activity…" : unavailable.includes("activity") ? "Recent activity is unavailable." : signedIn ? "No recent events were returned by the API." : "Sign in to view recent events."}</Text>}
          <HStack gap={2}><Button label="Open event stream" onClick={onActivity} /><Button label="Manage applications" variant="ghost" onClick={onApplications} /></HStack>
        </VStack>
      </Card>
    </div></Reveal>

    {showTips && <Reveal delay={120}><Banner status="info" title="Security tip" description="Use exact HTTPS redirect URIs in production, keep origins aligned with the deployed application, and rotate client secrets immediately after exposure."
      endContent={<Button label="Review applications" onClick={onApplications} />} /></Reveal>}
  </VStack>;
}
