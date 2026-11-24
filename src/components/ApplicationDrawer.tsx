import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Toggle } from "../ui/Toggle";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { copyText } from "../lib/copy";
import { dayLabel } from "../lib/dates";
import { ErrorBanner, LoadingState, Metric, eventDetail, eventLabel } from "../ui/blocks";
import { ClientPresetGuide } from "./ClientPresetGuide";
import { GlassSegmented } from "../ui/GlassSegmented";
import { GlassTabs } from "../ui/GlassTabs";
import type { IconName } from "../ui/Icon";
import type { ActivityEvent, AppBranding, AppCredential, Application, RedirectUri, SessionRecord, UptimeReport } from "../types";

type Changes = Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>;
type Props = { application: Application | null; onClose: () => void; onUpdate: (id: string, changes: Changes) => Promise<void>; onDelete: (id: string) => Promise<void> };
type TabId = "overview" | "setup" | "redirects" | "scopes" | "credentials" | "branding" | "monitoring" | "events";
const TABS: { value: TabId; label: string; icon: IconName }[] = [
  { value: "overview", label: "Overview", icon: "home" },
  { value: "setup", label: "Setup", icon: "gear" },
  { value: "redirects", label: "Redirect URIs", icon: "external-link" },
  { value: "scopes", label: "Scopes", icon: "shield" },
  { value: "credentials", label: "Credentials", icon: "key" },
  { value: "branding", label: "Branding", icon: "palette" },
  { value: "monitoring", label: "Monitoring", icon: "pulse" },
  { value: "events", label: "Events", icon: "list" }
];
const SCOPE_INFO = { openid: "Required for OIDC identity", profile: "Basic profile claims", email: "Email address and verification status" } as const;
const HISTORY = [{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }];
type Confirm = { title: string; description: string; action: string; run: () => Promise<void> | void };
type Section = "redirects" | "scopes" | "credentials" | "branding" | "monitoring" | "events";
type SectionState = "idle" | "loading" | "ready" | "error";
const initialSections = (): Record<Section, SectionState> => ({ redirects: "idle", scopes: "idle", credentials: "idle", branding: "idle", monitoring: "idle", events: "idle" });
const sectionsForTab = (tab: TabId): Section[] => tab === "overview" ? [] : tab === "setup" ? ["redirects", "scopes"] : [tab];
const message = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;
const isHttpUrl = (value: string) => {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
};
// OAuth redirect URIs may use a custom scheme (com.example:/callback) as well as https.
const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:/i.test(value.trim());
const formatDate = (value?: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

export function ApplicationDrawer({ application, onClose, onUpdate, onDelete }: Props) {
  const tabId = useId();
  const [tab, setTab] = useState<TabId>("overview");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [origin, setOrigin] = useState("");
  const [uris, setUris] = useState<RedirectUri[]>([]); const [newUri, setNewUri] = useState("");
  const [scopes, setScopes] = useState<string[]>(["openid", "profile", "email"]);
  const [credentials, setCredentials] = useState<AppCredential[]>([]); const [freshSecret, setFreshSecret] = useState("");
  const [branding, setBranding] = useState<AppBranding>({ application_id: "" });
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [uptime, setUptime] = useState<UptimeReport | null>(null); const [uptimeDays, setUptimeDays] = useState(30);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [sections, setSections] = useState(initialSections);
  const generation = useRef(0);
  const sectionSeq = useRef<Record<Section, number>>({ redirects: 0, scopes: 0, credentials: 0, branding: 0, monitoring: 0, events: 0 });

  const id = application?.id;
  const loadSection = useCallback(async (section: Section, days = 30) => {
    if (!id) return;
    const currentGeneration = generation.current;
    const seq = ++sectionSeq.current[section];
    const current = () => currentGeneration === generation.current && seq === sectionSeq.current[section];
    setSections((s) => ({ ...s, [section]: "loading" }));
    try {
      switch (section) {
        case "redirects": { const d = await api.applications.redirectUris(id); if (!Array.isArray(d?.redirect_uris)) throw new Error("Invalid redirect URIs response"); if (current()) setUris(d.redirect_uris); break; }
        case "scopes": { const d = await api.applications.scopes(id); if (!Array.isArray(d?.scopes)) throw new Error("Invalid scopes response"); if (current()) setScopes(d.scopes); break; }
        case "credentials": { const d = await api.applications.credentials(id); if (!Array.isArray(d?.credentials)) throw new Error("Invalid credentials response"); if (current()) setCredentials(d.credentials); break; }
        case "branding": { const d = await api.applications.branding(id); if (!d || !("branding" in d)) throw new Error("Invalid branding response"); if (current()) setBranding(d.branding ?? { application_id: id }); break; }
        case "events": { const d = await api.applications.activity(id, 50); if (!Array.isArray(d?.events)) throw new Error("Invalid events response"); if (current()) setEvents(d.events); break; }
        case "monitoring": {
          const [report, active] = await Promise.all([api.applications.uptime(id, days), api.applications.sessions(id, "active", 50)]);
          if (!report || !Array.isArray(active?.sessions)) throw new Error("Invalid monitoring response");
          if (current()) { setUptime(report); setSessions(active.sessions); }
          break;
        }
      }
      if (current()) setSections((s) => ({ ...s, [section]: "ready" }));
    } catch {
      if (current()) setSections((s) => ({ ...s, [section]: "error" }));
    }
  }, [id]);
  useEffect(() => {
    if (!application) return;
    generation.current += 1;
    setName(application.name); setDescription(application.description || ""); setOrigin(application.origin_url || "");
    setEditing(false); setError(""); setStatus(""); setTab("overview"); setNewUri(""); setConfirm(null);
    setUris([]); setScopes([]); setCredentials([]); setBranding({ application_id: application.id }); setFreshSecret("");
    setUptime(null); setUptimeDays(30); setSessions([]); setEvents([]); setSections(initialSections());
    return () => { generation.current += 1; };
  }, [id, loadSection]); // Reset only when the selected application changes.

  // A freshly rotated secret is shown once; leaving the Credentials tab clears it.
  const changeTab = (next: TabId) => {
    if (tab === "credentials" && next !== "credentials") setFreshSecret("");
    setTab(next); setStatus(""); setError("");
    sectionsForTab(next).filter((section) => sections[section] === "idle").forEach((section) => void loadSection(section, uptimeDays));
  };
  if (!application) return null;

  const run = async (work: () => Promise<void>, fallback: string) => { setBusy(true); setError(""); setStatus(""); try { await work(); } catch (e) { setError(message(e, fallback)); } finally { setBusy(false); } };
  const copy = (value: string, done: string, fail: string) => void copyText(value).then((ok) => { if (ok) { setError(""); setStatus(done); } else { setStatus(""); setError(fail); } });
  const ask = (c: Confirm) => setConfirm(c);

  const originValid = !origin.trim() || isHttpUrl(origin.trim());
  const save = () => {
    if (!name.trim() || !originValid) return;
    return run(async () => { await onUpdate(application.id, { name: name.trim(), description, origin_url: origin.trim() || null }); setEditing(false); setStatus("Application updated."); }, "Update failed.");
  };
  const uriValid = hasScheme(newUri);
  const addUri = () => { if (newUri.trim() && uriValid) void run(async () => { const r = await api.applications.addRedirectUri(application.id, newUri.trim()); setUris((c) => c.some((item) => item.uri === r.redirect_uri.uri) ? c : [...c, r.redirect_uri]); setNewUri(""); setStatus("Redirect URI added."); }, "Could not add redirect URI."); };
  const saveScopes = () => run(async () => { const r = await api.applications.updateScopes(application.id, [...new Set(["openid", ...scopes])]); setScopes(r.scopes); setStatus("Scopes saved."); }, "Could not save scopes.");
  const saveBranding = () => run(async () => { const r = await api.applications.updateBranding(application.id, { display_name: branding.display_name || null, logo_url: branding.logo_url || null, accent_color: branding.accent_color || null }); if (r.branding) setBranding(r.branding); setStatus("Branding saved."); }, "Branding update failed.");
  const refreshEvents = () => run(async () => { const d = await api.applications.activity(application.id, 50); setEvents(d.events || []); }, "Could not refresh events.");
  const checkUptime = () => run(async () => { await api.applications.checkUptime(application.id); const [report, active] = await Promise.all([api.applications.uptime(application.id, uptimeDays), api.applications.sessions(application.id, "active", 50)]); setUptime(report); setSessions(active.sessions || []); setStatus("Uptime check completed."); }, "Uptime check failed.");
  const rotate = () => run(async () => { const r = await api.applications.rotateCredentials(application.id); setCredentials((c) => [{ ...r.credential, secret: undefined }, ...c.map((x) => x.revoked_at ? x : { ...x, revoked_at: new Date().toISOString() })]); setFreshSecret(r.credential.secret || ""); }, "Credential rotation failed.");

  const panels: Record<TabId, ReactNode> = {
    overview: editing
      ? <form onSubmit={(e) => { e.preventDefault(); void save(); }}><VStack gap={4}>
        <TextInput label="Application name" isRequired value={name} onChange={setName} />
        <TextArea label="Description" value={description} onChange={setDescription} />
        <TextInput label="Origin URL" type="url" inputMode="url" value={origin} onChange={setOrigin} placeholder="https://app.example.com"
          description="The public base URL of the application."
          status={originValid ? undefined : { type: "error", message: "Use a full http(s) URL, for example https://app.example.com." }} />
        <HStack gap={2} hAlign="end"><Button label="Cancel" onClick={() => setEditing(false)} /><Button label="Save changes" type="submit" variant="primary" isLoading={busy} isDisabled={!name.trim() || !originValid} /></HStack>
      </VStack></form>
      : <VStack gap={4}>
        <MetadataList>
          <MetadataListItem label="Description">{application.description || "Not configured"}</MetadataListItem>
          <MetadataListItem label="Origin URL">{application.origin_url || "Not configured"}</MetadataListItem>
          <MetadataListItem label="Type">{application.application_type || "Web"}</MetadataListItem>
          <MetadataListItem label="Client ID"><Code>{application.client_id || "Unavailable"}</Code></MetadataListItem>
          <MetadataListItem label="Application ID"><Code>{application.id}</Code></MetadataListItem>
          <MetadataListItem label="Created">{application.created_at ? <Timestamp value={application.created_at} format="date_time" /> : "Unavailable"}</MetadataListItem>
          <MetadataListItem label="Status"><Badge variant={application.status === "active" ? "success" : "neutral"} label={application.status || "Unknown"} /></MetadataListItem>
        </MetadataList>
        <HStack gap={2} wrap="wrap">
          <Button label="Copy client ID" isDisabled={!application.client_id} onClick={() => copy(application.client_id || "", "Client ID copied.", "Clipboard unavailable. Select and copy the value manually.")} />
          <Button label="Edit application" onClick={() => { setName(application.name); setDescription(application.description || ""); setOrigin(application.origin_url || ""); setEditing(true); }} />
          <Button label="Delete application" variant="destructive" isDisabled={busy} onClick={() => ask({ title: `Delete “${application.name}”?`, description: "This revokes its Ace ID client and removes its configuration and activity. It cannot be undone.", action: "Delete application", run: () => run(() => onDelete(application.id), "Deletion failed.") })} />
        </HStack>
      </VStack>,
    setup: <ClientPresetGuide application={application} redirects={uris} scopes={scopes} onStatus={(text, ok) => { setError(ok ? "" : text); setStatus(ok ? text : ""); }} />,
    redirects: <VStack gap={4}>
      <Text color="secondary">Exact redirect URI matching is required during OIDC authorization.</Text>
      <form onSubmit={(e) => { e.preventDefault(); addUri(); }}><HStack gap={2} vAlign="end">
        <TextInput label="New redirect URI" isLabelHidden type="url" inputMode="url" value={newUri} onChange={setNewUri} placeholder="https://app.example.com/callback" width="100%"
          description="Exact match, including scheme and path. Custom schemes such as com.example:/callback are accepted."
          status={newUri.trim() && !uriValid ? { type: "error", message: "Include a scheme, for example https:// or com.example:/." } : undefined} />
        <Button label="Add" type="submit" variant="primary" isLoading={busy} isDisabled={!newUri.trim() || !uriValid} />
      </HStack></form>
      {uris.length ? <VStack gap={0}>{uris.map((u) => <Item key={u.id} label={<Code>{u.uri}</Code>}
        endContent={<Button label="Remove" variant="ghost" isDisabled={busy} onClick={() => ask({ title: "Remove this redirect URI?", description: u.uri, action: "Remove", run: () => run(async () => { await api.applications.removeRedirectUri(application.id, u.id); setUris((c) => c.filter((x) => x.id !== u.id)); setStatus("Redirect URI removed."); }, "Could not remove URI.") })} />} />)}</VStack>
        : <EmptyState isCompact title="No redirect URIs configured" description="Add a callback URI to finish OAuth setup." />}
    </VStack>,
    scopes: <VStack gap={3}>
      <Text color="secondary">Grant only the identity claims your app needs. <Code>openid</Code> is required.</Text>
      {!scopes.includes("openid") && <Banner status="warning" title="openid is not currently enabled" description="Save scopes to add the required OIDC scope." />}
      {(Object.keys(SCOPE_INFO) as (keyof typeof SCOPE_INFO)[]).map((scope) => <Toggle key={scope} label={scope} description={SCOPE_INFO[scope]} value={scope === "openid" || scopes.includes(scope)}
        disabled={scope === "openid" || busy}
        onChange={(on) => setScopes((c) => on ? [...new Set([...c, scope])] : c.filter((v) => v !== scope))} />)}
      <Button label="Save scopes" variant="primary" isLoading={busy} onClick={() => void saveScopes()} />
    </VStack>,
    credentials: <VStack gap={4}>
      <Text color="secondary">Secrets are stored as hashes. A newly rotated secret is shown once and cannot be retrieved later.</Text>
      {freshSecret && <Banner status="success" title="New client secret" description="Store it securely now. Leaving this tab clears it from the screen." collapsible={false}
        endContent={<Button label="Copy secret" onClick={() => copy(freshSecret, "Client secret copied.", "Clipboard unavailable. Select and copy the secret manually.")} />}><Code>{freshSecret}</Code></Banner>}
      <Button label="Rotate client secret" variant="primary" isLoading={busy} onClick={() => ask({ title: "Rotate credentials?", description: "All currently active credentials will be revoked.", action: "Rotate", run: () => void rotate() })} />
      {credentials.length ? <VStack gap={0}>{credentials.map((c) => <Item key={c.id} label={<Code>{c.secret_prefix}…</Code>}
        startContent={<Badge variant={c.revoked_at ? "neutral" : "success"} label={c.revoked_at ? "Revoked" : "Active"} />}
        description={<>Created <Timestamp value={c.created_at} format="relative" /></>}
        endContent={<Button label="Revoke" variant="ghost" isDisabled={busy || Boolean(c.revoked_at)} onClick={() => ask({ title: "Revoke this credential?", description: "Clients using it will stop working.", action: "Revoke", run: () => run(async () => { await api.applications.revokeCredential(application.id, c.id); setCredentials((items) => items.map((x) => x.id === c.id ? { ...x, revoked_at: new Date().toISOString() } : x)); setStatus("Credential revoked."); }, "Could not revoke credential.") })} />} />)}</VStack>
        : <EmptyState isCompact title="No credentials issued" description="Rotate a client secret to create one." />}
    </VStack>,
    branding: <VStack gap={4}>
      <Text color="secondary">Customize the name, logo, and accent color shown on supported identity screens.</Text>
      <TextInput label="Display name" value={branding.display_name || ""} onChange={(v) => setBranding((b) => ({ ...b, display_name: v }))} placeholder={application.name} />
      <TextInput label="Logo URL" type="url" value={branding.logo_url || ""} onChange={(v) => setBranding((b) => ({ ...b, logo_url: v }))} placeholder="https://cdn.example.com/logo.png" />
      <TextInput label="Accent color" value={branding.accent_color || ""} onChange={(v) => setBranding((b) => ({ ...b, accent_color: v }))} placeholder="#F97316"
        status={branding.accent_color && !/^#[0-9a-fA-F]{6}$/.test(branding.accent_color) ? { type: "error", message: "Use a 6-digit hex color like #F97316." } : undefined} />
      <HStack gap={2}><Button label="Save branding" variant="primary" isLoading={busy} isDisabled={Boolean(branding.accent_color) && !/^#[0-9a-fA-F]{6}$/.test(branding.accent_color || "")} onClick={() => void saveBranding()} /></HStack>
    </VStack>,
    monitoring: <VStack gap={4}>
      <HStack gap={2} vAlign="end" wrap="wrap">
        <GlassSegmented hideLabel label="History" options={HISTORY} value={String(uptimeDays)} onChange={(v) => { const d = Number(v); setUptimeDays(d); void loadSection("monitoring", d); }} />
        <Button label="Run uptime check" variant="primary" isLoading={busy} onClick={() => void checkUptime()} />
      </HStack>
      <Grid columns={{ minWidth: 130, max: 4, repeat: "fit" }} gap={3}>
        <Metric label="Status" value={<span style={{ textTransform: "capitalize" }}>{uptime?.summary?.status?.replace(/_/g, " ") || "No data"}</span>} />
        <Metric label="Uptime" value={uptime?.summary?.uptime_percent == null ? "—" : `${uptime.summary.uptime_percent}%`} />
        <Metric label="Checks" value={uptime?.summary?.total_checks ?? "—"} />
        <Metric label="Sessions" value={sessions.length} />
      </Grid>
      {uptime?.daily?.length ? <VStack gap={0}>{uptime.daily.map((d) => <Item key={String(d.day)} label={dayLabel(String(d.day))} description={`${d.checks} checks`} endContent={<Text weight="semibold" hasTabularNumbers>{d.uptime_percent == null ? "No checks" : `${d.uptime_percent}%`}</Text>} />)}</VStack> : null}
      <Heading level={3}>Active sessions</Heading>
      {sessions.length ? <VStack gap={0}>{sessions.map((s) => {
        const who = s.display_name || s.email || s.username || s.user_id;
        return <Item key={s.id} label={who} startContent={<Avatar name={who} src={s.avatar_url || undefined} size="sm" tooltip={false} />}
          description={`Last seen ${formatDate(s.last_seen_at)}`} endContent={<Badge label={s.status} />} />;
      })}</VStack> : <EmptyState isCompact title="No active sessions" description="Sessions are shown only for users who consented to this application." />}
    </VStack>,
    events: <VStack gap={3}>
      <HStack gap={2} hAlign="between" vAlign="center"><Text weight="semibold">Recent application events</Text><Button label="Refresh" isLoading={busy} onClick={() => void refreshEvents()} /></HStack>
      {events.length ? <VStack gap={0}>{events.map((e) => <Item key={e.id} label={eventLabel(e.event_type)} description={<>{e.success ? "Succeeded" : "Failed"}{eventDetail(e.metadata) && ` · ${eventDetail(e.metadata)}`}</>}
        startContent={<StatusDot variant={e.success ? "success" : "error"} label={e.success ? "Succeeded" : "Failed"} />} endContent={<Timestamp value={e.created_at} format="auto" />} />)}</VStack>
        : <EmptyState isCompact title="No application events" description="Security and configuration events will appear here as they occur." />}
    </VStack>
  };

  const needed = sectionsForTab(tab);
  const failed = needed.filter((section) => sections[section] === "error");
  const loading = needed.some((section) => sections[section] === "idle" || sections[section] === "loading");
  const content = failed.length ? <ErrorBanner message={`Could not load ${failed.join(" and ")}. Your data has not been changed.`} onRetry={() => failed.forEach((section) => void loadSection(section, uptimeDays))} />
    : loading ? <LoadingState title={`Loading ${tab}`} /> : panels[tab];

  return <>
    <Drawer className="sheet-drawer" isOpen onOpenChange={(open) => { if (!open && !busy) onClose(); }} label={`${application.name} settings`} width={600} purpose="info">
      <Layout
        header={<>
          <DrawerHeader title={application.name} subtitle="Application controls" startContent={<Avatar name={application.name} shape="rounded" size="lg" tooltip={false} />}
            onOpenChange={(open) => { if (!open && !busy) onClose(); }} />
          <GlassTabs className="drawer-tabs" label="Application settings" items={TABS} value={tab} disabled={busy} onChange={(v) => { if (!busy) changeTab(v as TabId); }} />
        </>}
        content={<LayoutContent padding={4} label="Application details">
          <VStack gap={4}>
            {error && <div role="alert"><Banner status="error" title="Something went wrong" description={error} isDismissable onDismiss={() => setError("")} /></div>}
            {status && <div role="status"><Banner status="success" title={status} isDismissable onDismiss={() => setStatus("")} /></div>}
            {TABS.map(({ value: v, label }) => <div key={v} role="tabpanel" id={`${tabId}-panel-${v}`} aria-label={label} tabIndex={0} hidden={tab !== v}>{tab === v ? content : null}</div>)}
          </VStack>
        </LayoutContent>}
      />
    </Drawer>
    <AlertDialog isOpen={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm?.title || ""} description={confirm?.description || ""}
      actionLabel={confirm?.action || "Confirm"} onAction={() => { const c = confirm; setConfirm(null); void c?.run(); }} />
  </>;
}
