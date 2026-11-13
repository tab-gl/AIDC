import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { NumberTicker } from "../components/ui/number-ticker";
import { ArrowRight01Icon, Refresh01Icon, Add01Icon, Grid2X2Icon, Activity01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { API_ORIGIN, api } from "../lib/api";
import type { ActivityEvent, Application, DiscoveryStatus, OperationsAnalytics, Quota } from "../types";

type Props = { applications: Application[]; quota: Quota | null; signedIn: boolean; showTips: boolean; onApplications: () => void; onActivity: () => void; onSettings: () => void; onCreate: () => void };
function formatTime(value?: string) { if (!value) return "Time unavailable"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString(); }

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
    const results = await Promise.allSettled([api.activity.list(6), api.analytics.operations(30), api.integration.discovery(), api.health.get()]);
    if (results[0].status === "fulfilled") setEvents(results[0].value.events || []);
    if (results[1].status === "fulfilled") setOperations(results[1].value);
    if (results[2].status === "fulfilled") setDiscovery(results[2].value);
    if (results[3].status === "fulfilled") setApiHealthy(Boolean(results[3].value.ok));
    setRefreshing(false);
  }, [signedIn]);
  useEffect(() => { void refresh(); }, [refresh]);
  const uptime = operations?.uptime;
  const apiStatus = apiHealthy === null ? "Unknown" : apiHealthy ? "Healthy" : "Degraded";
  const identityStatus = discovery?.status || "Unknown";
  return <div className="neo-page">
    <section className="neo-hero"><div><span className="neo-kicker">AIDC / CONSOLE</span><h2>Manage identity apps.</h2><p>Applications, usage, provider health, and recent events.</p></div><div className="neo-heading-actions"><button className="neo-button neo-button-secondary" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshingâ¦" : <><HugeiconsIcon icon={Refresh01Icon} size={16} /> Refresh data</>}</button><button className="neo-button neo-button-primary" onClick={signedIn ? onCreate : () => window.location.assign(`${API_ORIGIN}/auth/login`)}>{signedIn ? <><HugeiconsIcon icon={Add01Icon} size={16} /> Create application</> : "Sign in"}</button></div></section>
    <section className="neo-bento neo-overview-grid" aria-label="Console overview">
      <article className="neo-panel neo-panel-large neo-bento-applications"><span className="neo-label">Applications</span><strong className="neo-metric">{signedIn ? <NumberTicker value={applications.length} /> : "—"}</strong><p>{signedIn ? "Applications linked to your Ace ID." : "Sign in to load your workspace."}</p><button className="neo-button neo-button-secondary" onClick={onApplications}>Manage applications</button></article>
      <article className="neo-panel neo-bento-quota"><span className="neo-label">Available quota</span><strong className="neo-metric">{signedIn && typeof remaining === "number" ? <NumberTicker value={remaining} /> : "—"}</strong><p>{typeof limit === "number" ? `${quota?.count ?? applications.length} of ${limit} applications used` : "Quota unavailable"}</p>{usage !== null && <div className="neo-progress" role="progressbar" aria-label="Application quota used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage)}><span style={{ width: `${usage}%` }} /></div>}</article>
      <article className="neo-panel neo-panel-wide neo-bento-health"><span className="neo-label">Operational health</span><div className="neo-health-grid"><div><span>Console API</span><strong className={apiHealthy ? "is-healthy" : apiHealthy === false ? "is-degraded" : ""}>{apiStatus}</strong></div><div><span>Ace ID discovery</span><strong className={identityStatus === "ready" ? "is-healthy" : identityStatus === "failed" ? "is-degraded" : ""}>{identityStatus}</strong></div><div><span>Active sessions</span><strong>{operations?.sessions.active ?? "â"}</strong></div><div><span>Operational apps</span><strong>{uptime ? `${uptime.operational}/${uptime.total}` : "â"}</strong></div></div><div className="neo-heading-actions"><button className="neo-button neo-button-secondary" onClick={onActivity}>View activity</button><button className="neo-button neo-button-secondary" onClick={onSettings}>Diagnostics & settings</button></div></article>
      <article className="neo-panel neo-panel-large neo-bento-activity"><span className="neo-label">Recent activity</span><div className="neo-overview-events">{events.length ? events.map((event) => <div className="neo-overview-event" key={event.id}><span className={`neo-event-dot ${event.success ? "is-success" : "is-failed"}`} aria-hidden="true"/><div><strong>{event.event_type.replace(/[._]/g, " ")}</strong><small>{event.application_name || "Application"} Â· {formatTime(event.created_at)}</small></div></div>) : <p>{signedIn ? "No recent events were returned by the API." : "Sign in to view recent events."}</p>}</div><button className="neo-button neo-button-secondary" onClick={onActivity}>Open event stream <HugeiconsIcon icon={ArrowRight01Icon} size={15} /></button></article>
      <article className="neo-panel neo-panel-wide neo-bento-shortcuts"><span className="neo-label">Shortcuts</span><div className="neo-shortcut-grid"><button onClick={onCreate} disabled={!signedIn}><HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" /><strong>New application</strong><small>Register a client</small></button><button onClick={onApplications}><HugeiconsIcon icon={Grid2X2Icon} size={18} aria-hidden="true" /><strong>Applications</strong><small>Redirects, scopes, and credentials</small></button><button onClick={onActivity}><HugeiconsIcon icon={Activity01Icon} size={18} aria-hidden="true" /><strong>Activity & analytics</strong><small>Events, logins, uptime</small></button><button onClick={onSettings}><HugeiconsIcon icon={Settings01Icon} size={18} aria-hidden="true" /><strong>Settings</strong><small>Theme and diagnostics</small></button></div></article>
    </section>

    {showTips && <aside className="neo-tip" role="note"><strong>Security tip</strong><span>Use exact HTTPS redirect URIs in production, keep origins aligned with the deployed application, and rotate client secrets immediately after exposure.</span><button className="neo-button neo-button-secondary" onClick={onApplications}>Review applications</button></aside>}
  </div>;
}
