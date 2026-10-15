import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { NumberTicker } from "../components/ui/number-ticker";
import { ArrowRight01Icon, Refresh01Icon, Add01Icon, Grid2X2Icon, Activity01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { API_ORIGIN, api } from "../lib/api";
import type { AceIdCheckout, AceIdPlanCatalog, ActivityEvent, Application, DiscoveryStatus, Entitlements, OperationsAnalytics, Quota } from "../types";

type Props = { applications: Application[]; quota: Quota | null; entitlements: Entitlements | null; signedIn: boolean; showTips: boolean; onApplications: () => void; onActivity: () => void; onSettings: () => void; onCreate: () => void };
function formatTime(value?: string) { if (!value) return "Time unavailable"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString(); }
function formatLabel(value: string) { return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").replace(/^./, (match) => match.toUpperCase()); }
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (typeof value === "string" || typeof value === "number") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function Overview({ applications, quota, entitlements, signedIn, showTips, onApplications, onActivity, onSettings, onCreate }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [operations, setOperations] = useState<OperationsAnalytics | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryStatus | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [planCatalog, setPlanCatalog] = useState<AceIdPlanCatalog | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<AceIdCheckout | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const remaining = quota?.remaining, limit = quota?.limit;
  const usage = typeof remaining === "number" && typeof limit === "number" && limit > 0 ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : null;
  const refresh = useCallback(async () => {
    if (!signedIn) { setEvents([]); setOperations(null); setDiscovery(null); setApiHealthy(null); setPlanCatalog(null); return; }
    setRefreshing(true);
    const results = await Promise.allSettled([api.activity.list(6), api.analytics.operations(30), api.integration.discovery(), api.health.get(), api.plans.list()]);
    if (results[0].status === "fulfilled") setEvents(results[0].value.events || []);
    if (results[1].status === "fulfilled") setOperations(results[1].value);
    if (results[2].status === "fulfilled") setDiscovery(results[2].value);
    if (results[3].status === "fulfilled") setApiHealthy(Boolean(results[3].value.ok));
    if (results[4].status === "fulfilled") setPlanCatalog(results[4].value);
    setRefreshing(false);
  }, [signedIn]);
  useEffect(() => { void refresh(); }, [refresh]);
  const uptime = operations?.uptime;
  const apiStatus = apiHealthy === null ? "Unknown" : apiHealthy ? "Healthy" : "Degraded";
  const identityStatus = discovery?.status || "Unknown";
  const catalogPlans = Array.isArray(planCatalog?.plans) ? planCatalog.plans : [];
  const paymentsConfigured = Boolean(planCatalog?.payments?.razorpayConfigured);
  const requestCheckout = async (planId: string) => {
    setCheckout(null); setCheckoutError(null); setCheckoutPlan(planId);
    try {
      const result = await api.subscription.checkout(planId);
      const parsed = new URL(result.shortUrl);
      if (parsed.protocol !== "https:") throw new Error("Ace ID returned an invalid checkout URL.");
      setCheckout(result);
    } catch (error) { setCheckoutError(error instanceof Error ? error.message : "Checkout could not be started."); }
    finally { setCheckoutPlan(null); }
  };
  const entitlementFields = entitlements ? Object.entries(entitlements).filter(([key]) =>
    !["plan", "name", "status", "applications", "mau", "usernameChangeCooldownDays", "usage", "limits", "features", "offers", "accessories", "subscription", "manageUrl", "verified", "source"].includes(key)
  ) : [];
  return <div className="neo-page">
    <section className="neo-hero"><div><span className="neo-kicker">AIDC / CONSOLE</span><h2>Manage identity apps.</h2><p>Applications, usage, provider health, and recent events.</p></div><div className="neo-heading-actions"><button className="neo-button neo-button-secondary" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "Refreshingâ¦" : <><HugeiconsIcon icon={Refresh01Icon} size={16} /> Refresh data</>}</button><button className="neo-button neo-button-primary" onClick={signedIn ? onCreate : () => window.location.assign(`${API_ORIGIN}/auth/login`)}>{signedIn ? <><HugeiconsIcon icon={Add01Icon} size={16} /> Create application</> : "Sign in"}</button></div></section>
    <section className="neo-bento neo-overview-grid" aria-label="Console overview">
      <article className="neo-panel neo-panel-large neo-bento-applications"><span className="neo-label">Applications</span><strong className="neo-metric">{signedIn ? <NumberTicker value={applications.length} /> : "—"}</strong><p>{signedIn ? "Applications linked to your Ace ID." : "Sign in to load your workspace."}</p><button className="neo-button neo-button-secondary" onClick={onApplications}>Manage applications</button></article>
      <article className="neo-panel neo-bento-quota"><span className="neo-label">Available quota</span><strong className="neo-metric">{signedIn && typeof remaining === "number" ? <NumberTicker value={remaining} /> : "—"}</strong><p>{typeof limit === "number" ? `${quota?.count ?? applications.length} of ${limit} applications used` : "Entitlement data unavailable"}</p>{usage !== null && <div className="neo-progress" role="progressbar" aria-label="Application quota used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usage)}><span style={{ width: `${usage}%` }} /></div>}</article>
      <article className="neo-panel neo-bento-plan"><span className="neo-label">Current plan</span><strong className="neo-plan">{signedIn ? quota?.name || entitlements?.name || "Unknown" : "â"}</strong><p>{quota?.status || (signedIn ? "Entitlement status unavailable" : "Not signed in")}</p><span className="neo-status-pill">{entitlements?.verified ? "Verified entitlement" : "Server checked"}</span></article>
      <article className="neo-panel neo-panel-wide neo-bento-health"><span className="neo-label">Operational health</span><div className="neo-health-grid"><div><span>Console API</span><strong className={apiHealthy ? "is-healthy" : apiHealthy === false ? "is-degraded" : ""}>{apiStatus}</strong></div><div><span>Ace ID discovery</span><strong className={identityStatus === "ready" ? "is-healthy" : identityStatus === "failed" ? "is-degraded" : ""}>{identityStatus}</strong></div><div><span>Active sessions</span><strong>{operations?.sessions.active ?? "â"}</strong></div><div><span>Operational apps</span><strong>{uptime ? `${uptime.operational}/${uptime.total}` : "â"}</strong></div></div><div className="neo-heading-actions"><button className="neo-button neo-button-secondary" onClick={onActivity}>View activity</button><button className="neo-button neo-button-secondary" onClick={onSettings}>Diagnostics & settings</button></div></article>
      <article className="neo-panel neo-panel-large neo-bento-activity"><span className="neo-label">Recent activity</span><div className="neo-overview-events">{events.length ? events.map((event) => <div className="neo-overview-event" key={event.id}><span className={`neo-event-dot ${event.success ? "is-success" : "is-failed"}`} aria-hidden="true"/><div><strong>{event.event_type.replace(/[._]/g, " ")}</strong><small>{event.application_name || "Application"} Â· {formatTime(event.created_at)}</small></div></div>) : <p>{signedIn ? "No recent events were returned by the API." : "Sign in to view recent events."}</p>}</div><button className="neo-button neo-button-secondary" onClick={onActivity}>Open event stream <HugeiconsIcon icon={ArrowRight01Icon} size={15} /></button></article>
      <article className="neo-panel neo-panel-wide neo-bento-shortcuts"><span className="neo-label">Shortcuts</span><div className="neo-shortcut-grid"><button onClick={onCreate} disabled={!signedIn}><HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" /><strong>New application</strong><small>Register a client</small></button><button onClick={onApplications}><HugeiconsIcon icon={Grid2X2Icon} size={18} aria-hidden="true" /><strong>Applications</strong><small>Redirects, scopes, and credentials</small></button><button onClick={onActivity}><HugeiconsIcon icon={Activity01Icon} size={18} aria-hidden="true" /><strong>Activity & analytics</strong><small>Events, logins, uptime</small></button><button onClick={onSettings}><HugeiconsIcon icon={Settings01Icon} size={18} aria-hidden="true" /><strong>Settings</strong><small>Theme and diagnostics</small></button></div></article>
    </section>

    {signedIn && entitlements && <section className="neo-entitlements neo-panel" aria-labelledby="neo-entitlements-title">
      <div className="neo-section-heading neo-entitlements-heading">
        <div><span className="neo-kicker">ACE ID PLAN</span><h3 id="neo-entitlements-title">Ace ID entitlements</h3><p>Subscription limits and features reported by Ace ID. Quota-sensitive actions stay blocked if the provider is unavailable.</p></div>
        <span className="neo-status-pill">{entitlements.verified ? "Verified provider response" : "Unverified"}</span>
      </div>
      <div className="neo-entitlement-metrics">
        <div><span>Plan</span><strong>{entitlements.name || entitlements.plan || "Unknown"}</strong></div>
        <div><span>Status</span><strong>{entitlements.status || "Unknown"}</strong></div>
        <div><span>Application allowance</span><strong>{formatValue(entitlements.applications)}</strong></div>
        <div><span>Monthly active users</span><strong>{formatValue(entitlements.mau)}</strong></div>
        <div><span>Applications used</span><strong>{formatValue(entitlements.usage?.applications)}</strong></div>
        <div><span>Applications remaining</span><strong>{formatValue(entitlements.usage?.applicationsRemaining)}</strong></div>
        <div><span>Username change cooldown</span><strong>{entitlements.usernameChangeCooldownDays === null || entitlements.usernameChangeCooldownDays === undefined ? "Not provided" : `${entitlements.usernameChangeCooldownDays} days`}</strong></div>
        <div><span>Entitlement source</span><strong>{entitlements.source || "Unknown"}</strong></div>
      </div>
      {entitlements.features && <section className="neo-entitlement-section" aria-label="Feature entitlements"><h4>Feature flags</h4><div className="neo-entitlement-chip-grid">
        {Object.entries(entitlements.features).map(([key, value]) => <div className="neo-entitlement-chip" key={key}><span>{formatLabel(key)}</span><strong>{formatValue(value)}</strong></div>)}
        {!Object.keys(entitlements.features).length && <p>No feature flags were returned by Ace ID.</p>}
      </div></section>}
      {entitlements.subscription && <section className="neo-entitlement-section" aria-label="Subscription details"><h4>Subscription details</h4><dl className="neo-entitlement-fields">
        {Object.entries(entitlements.subscription).map(([key, value]) => <div key={key}><dt>{formatLabel(key)}</dt><dd>{formatValue(value)}</dd></div>)}
      </dl></section>}
      {(entitlements.offers || []).length > 0 && <section className="neo-entitlement-section" aria-label="Available subscription offers"><h4>Offers</h4><div className="neo-entitlement-items">
        {(entitlements.offers || []).map((item, index) => <article key={String(item.id ?? index)}><strong>{typeof item.name === "string" ? item.name : `Offer ${index + 1}`}</strong><dl className="neo-entitlement-fields">{Object.entries(item).map(([key, value]) => <div key={key}><dt>{formatLabel(key)}</dt><dd>{formatValue(value)}</dd></div>)}</dl></article>)}
      </div></section>}
      {(entitlements.accessories || []).length > 0 && <section className="neo-entitlement-section" aria-label="Available subscription accessories"><h4>Accessories</h4><div className="neo-entitlement-items">
        {(entitlements.accessories || []).map((item, index) => <article key={String(item.id ?? index)}><strong>{typeof item.name === "string" ? item.name : `Accessory ${index + 1}`}</strong><dl className="neo-entitlement-fields">{Object.entries(item).map(([key, value]) => <div key={key}><dt>{formatLabel(key)}</dt><dd>{formatValue(value)}</dd></div>)}</dl></article>)}
      </div></section>}
      {entitlementFields.length > 0 && <section className="neo-entitlement-section" aria-label="Additional Ace ID entitlement data"><h4>Additional provider fields</h4><dl className="neo-entitlement-fields">{entitlementFields.map(([key, value]) => <div key={key}><dt>{formatLabel(key)}</dt><dd>{formatValue(value)}</dd></div>)}</dl></section>}
      {discovery?.issuer && <p className="neo-entitlement-manage"><a href={`${discovery.issuer.replace(/\/$/, "")}/subscription.html`} target="_blank" rel="noopener noreferrer">Manage subscription in Ace ID â</a></p>}
    </section>}
    {signedIn && <section className="neo-panel neo-plan-catalog" aria-labelledby="neo-plan-catalog-title">
      <div className="neo-section-heading"><div><span className="neo-kicker">PLANS</span><h3 id="neo-plan-catalog-title">Subscription plans</h3><p>Pricing and usage limits are supplied by Ace ID.</p></div></div>
      {catalogPlans.length > 0 ? <div className="neo-plan-grid">{catalogPlans.map((plan) => {
        const isCurrent = String(plan.id).toLowerCase() === String(entitlements?.plan || "").toLowerCase();
        const isPaid = ["core", "apex"].includes(String(plan.id).toLowerCase());
        return <article className={`neo-plan-card ${isCurrent ? "is-current" : ""}`} key={plan.id}>
          <span className="neo-label">{isCurrent ? "Current plan" : isPaid ? "Upgrade" : "Available plan"}</span>
          <h4>{plan.name}</h4><strong className="neo-plan-price">{Number(plan.priceInrMonthly) === 0 ? "Free" : `â¹${Number(plan.priceInrMonthly).toLocaleString("en-IN")}/month`}</strong>
          <dl><div><dt>Applications</dt><dd>{formatValue(plan.applications)}</dd></div><div><dt>Monthly active users</dt><dd>{Number(plan.mau).toLocaleString("en-IN")}</dd></div><div><dt>Username cooldown</dt><dd>{formatValue(plan.usernameChangeCooldownDays)} {plan.usernameChangeCooldownDays === undefined ? "" : "days"}</dd></div></dl>
          {isPaid && !isCurrent && <button className="neo-button neo-button-primary" disabled={!paymentsConfigured || checkoutPlan !== null} onClick={() => void requestCheckout(String(plan.id))}>{checkoutPlan === plan.id ? "Creating checkoutâ¦" : paymentsConfigured ? `Choose ${plan.name}` : "Payments unavailable"}</button>}
        </article>;
      })}</div> : <p>{planCatalog ? "Ace ID returned no available plans." : "Plan catalog unavailable. Refresh after Ace ID connectivity is restored."}</p>}
      {checkoutError && <p className="neo-form-error" role="alert">{checkoutError}</p>}
      {checkout && <p className="neo-save-status" role="status">Checkout created for {checkout.plan}. <a href={checkout.shortUrl} target="_blank" rel="noopener noreferrer">Continue to secure payment â</a></p>}
    </section>}
    {showTips && <aside className="neo-tip" role="note"><strong>Security tip</strong><span>Use exact HTTPS redirect URIs in production, keep origins aligned with the deployed application, and rotate client secrets immediately after exposure.</span><button className="neo-button neo-button-secondary" onClick={onApplications}>Review applications</button></aside>}
  </div>;
}
