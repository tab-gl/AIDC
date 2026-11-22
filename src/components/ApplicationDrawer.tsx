import { useEffect, useState, type ReactNode } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { Drawer } from "@astryxdesign/core/Drawer";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Item } from "@astryxdesign/core/Item";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { copyText } from "../lib/copy";
import { M3Switch } from "../ui/m3e";
import { Metric, eventDetail, eventLabel } from "../ui/blocks";
import { ClientPresetGuide } from "./ClientPresetGuide";
import type { ActivityEvent, AppBranding, AppCredential, Application, RedirectUri, SessionRecord, UptimeReport } from "../types";

type Changes = Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>;
type Props = { application: Application | null; onClose: () => void; onUpdate: (id: string, changes: Changes) => Promise<void>; onDelete: (id: string) => Promise<void> };
type TabId = "overview" | "setup" | "redirects" | "scopes" | "credentials" | "branding" | "monitoring" | "events";
const TABS: [TabId, string][] = [["overview", "Overview"], ["setup", "Setup"], ["redirects", "Redirect URIs"], ["scopes", "Scopes"], ["credentials", "Credentials"], ["branding", "Branding"], ["monitoring", "Monitoring"], ["events", "Events"]];
const SCOPE_INFO = { openid: "Required for OIDC identity", profile: "Basic profile claims", email: "Email address and verification status" } as const;
const HISTORY = [{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }];
type Confirm = { title: string; description: string; action: string; run: () => Promise<void> | void };
const message = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

export function ApplicationDrawer({ application, onClose, onUpdate, onDelete }: Props) {
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

  const id = application?.id;
  useEffect(() => {
    if (!application) return;
    let active = true;
    const appId = application.id;
    setName(application.name); setDescription(application.description || ""); setOrigin(application.origin_url || "");
    setEditing(false); setError(""); setStatus(""); setTab("overview"); setNewUri(""); setConfirm(null);
    setUris([]); setScopes(["openid", "profile", "email"]); setCredentials([]); setBranding({ application_id: appId }); setFreshSecret("");
    setUptime(null); setUptimeDays(30); setSessions([]); setEvents([]);
    const ok = <T,>(p: Promise<T>, apply: (v: T) => void, fallback?: () => void) => p.then((v) => { if (active) apply(v); }).catch(() => { if (active) fallback?.(); });
    void ok(api.applications.redirectUris(appId), (d) => setUris(d.redirect_uris || []));
    void ok(api.applications.scopes(appId), (d) => setScopes(d.scopes?.length ? d.scopes : ["openid"]));
    void ok(api.applications.credentials(appId), (d) => setCredentials(d.credentials || []));
    void ok(api.applications.branding(appId), (d) => setBranding(d.branding ?? { application_id: appId }));
    void ok(api.applications.sessions(appId, "active", 50), (d) => setSessions(d.sessions || []));
    void ok(api.applications.activity(appId, 50), (d) => setEvents(d.events || []));
    void ok(api.applications.uptime(appId, 30), (d) => setUptime(d));
    return () => { active = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A freshly rotated secret is shown once; leaving the Credentials tab clears it.
  const changeTab = (next: TabId) => { if (tab === "credentials" && next !== "credentials") setFreshSecret(""); setTab(next); setStatus(""); setError(""); };
  if (!application) return null;

  const run = async (work: () => Promise<void>, fallback: string) => { setBusy(true); setError(""); try { await work(); } catch (e) { setError(message(e, fallback)); } finally { setBusy(false); } };
  const copy = (value: string, done: string, fail: string) => void copyText(value).then((ok) => setStatus(ok ? done : fail));
  const ask = (c: Confirm) => setConfirm(c);

  const save = () => run(async () => { await onUpdate(application.id, { name, description, origin_url: origin }); setEditing(false); }, "Update failed.");
  const addUri = () => { if (newUri.trim()) void run(async () => { const r = await api.applications.addRedirectUri(application.id, newUri.trim()); setUris((c) => [...c, r.redirect_uri]); setNewUri(""); }, "Could not add redirect URI."); };
  const saveScopes = () => run(async () => { const r = await api.applications.updateScopes(application.id, scopes); setScopes(r.scopes); setStatus("Scopes saved."); }, "Could not save scopes.");
  const saveBranding = () => run(async () => { const r = await api.applications.updateBranding(application.id, { display_name: branding.display_name || null, logo_url: branding.logo_url || null, accent_color: branding.accent_color || null }); if (r.branding) setBranding(r.branding); setStatus("Branding saved."); }, "Branding update failed.");
  const refreshEvents = () => run(async () => { const d = await api.applications.activity(application.id, 50); setEvents(d.events || []); }, "Could not refresh events.");
  const loadUptime = (days: number) => run(async () => setUptime(await api.applications.uptime(application.id, days)), "Could not load uptime.");
  const checkUptime = () => run(async () => { await api.applications.checkUptime(application.id); const [report, active] = await Promise.all([api.applications.uptime(application.id, uptimeDays), api.applications.sessions(application.id, "active", 50)]); setUptime(report); setSessions(active.sessions || []); }, "Uptime check failed.");
  const rotate = () => run(async () => { const r = await api.applications.rotateCredentials(application.id); setCredentials((c) => [{ ...r.credential, secret: undefined }, ...c.map((x) => x.revoked_at ? x : { ...x, revoked_at: new Date().toISOString() })]); setFreshSecret(r.credential.secret || ""); }, "Credential rotation failed.");

  const panels: Record<TabId, ReactNode> = {
    overview: editing
      ? <form onSubmit={(e) => { e.preventDefault(); void save(); }}><VStack gap={4}>
        <TextInput label="Application name" isRequired value={name} onChange={setName} />
        <TextArea label="Description" value={description} onChange={setDescription} />
        <TextInput label="Origin URL" type="url" value={origin} onChange={setOrigin} placeholder="https://app.example.com" />
        <HStack gap={2} hAlign="end"><Button label="Cancel" onClick={() => setEditing(false)} /><Button label="Save changes" type="submit" variant="primary" isLoading={busy} isDisabled={!name.trim()} /></HStack>
      </VStack></form>
      : <VStack gap={4}>
        <MetadataList>
          <MetadataListItem label="Description">{application.description || "Not configured"}</MetadataListItem>
          <MetadataListItem label="Origin URL">{application.origin_url || "Not configured"}</MetadataListItem>
          <MetadataListItem label="Type">{application.application_type || "Web"}</MetadataListItem>
          <MetadataListItem label="Client ID"><Code>{application.client_id || "Unavailable"}</Code></MetadataListItem>
          <MetadataListItem label="Application ID"><Code>{application.id}</Code></MetadataListItem>
          <MetadataListItem label="Created">{application.created_at ? <Timestamp value={application.created_at} format="date_time" /> : "Unavailable"}</MetadataListItem>
        </MetadataList>
        <HStack gap={2} className="wrap">
          <Button label="Copy client ID" isDisabled={!application.client_id} onClick={() => copy(application.client_id || "", "Client ID copied.", "Clipboard unavailable. Select and copy the value manually.")} />
          <Button label="Edit application" onClick={() => setEditing(true)} />
          <Button label="Delete application" variant="destructive" isDisabled={busy} onClick={() => ask({ title: `Delete “${application.name}”?`, description: "This revokes its Ace ID client and removes its configuration and activity. It cannot be undone.", action: "Delete application", run: () => run(() => onDelete(application.id), "Deletion failed.") })} />
        </HStack>
      </VStack>,
    setup: <ClientPresetGuide application={application} redirects={uris} scopes={scopes} onStatus={setStatus} />,
    redirects: <VStack gap={4}>
      <Text color="secondary">Exact redirect URI matching is required during OIDC authorization.</Text>
      <form onSubmit={(e) => { e.preventDefault(); addUri(); }}><HStack gap={2} vAlign="end">
        <TextInput label="New redirect URI" isLabelHidden type="url" value={newUri} onChange={setNewUri} placeholder="https://app.example.com/callback" width="100%" />
        <Button label="Add" type="submit" variant="primary" isLoading={busy} isDisabled={!newUri.trim()} />
      </HStack></form>
      {uris.length ? <VStack gap={0}>{uris.map((u) => <Item key={u.id} label={<Code>{u.uri}</Code>}
        endContent={<IconButton label={`Remove ${u.uri}`} icon={<Icon icon="close" />} isDisabled={busy} onClick={() => ask({ title: "Remove this redirect URI?", description: u.uri, action: "Remove", run: () => run(async () => { await api.applications.removeRedirectUri(application.id, u.id); setUris((c) => c.filter((x) => x.id !== u.id)); }, "Could not remove URI.") })} />} />)}</VStack>
        : <EmptyState isCompact title="No redirect URIs configured" description="Add a callback URI to finish OAuth setup." />}
    </VStack>,
    scopes: <VStack gap={3}>
      <Text color="secondary">Grant only the identity claims your app needs. <Code>openid</Code> is required.</Text>
      {(Object.keys(SCOPE_INFO) as (keyof typeof SCOPE_INFO)[]).map((scope) => <M3Switch key={scope} label={scope} description={SCOPE_INFO[scope]} checked={scopes.includes(scope)} disabled={scope === "openid" || busy}
        onChange={(on) => setScopes((c) => on ? [...new Set([...c, scope])] : c.filter((v) => v !== scope))} />)}
      <Button label="Save scopes" variant="primary" isLoading={busy} onClick={() => void saveScopes()} />
    </VStack>,
    credentials: <VStack gap={4}>
      <Text color="secondary">Secrets are stored as hashes. A newly rotated secret is shown once and cannot be retrieved later.</Text>
      {freshSecret && <Banner status="success" title="New client secret" description="Store it securely now. Leaving this tab clears it from the screen."
        endContent={<Button label="Copy secret" onClick={() => copy(freshSecret, "Client secret copied.", "Clipboard unavailable. Select and copy the secret manually.")} />}><Code>{freshSecret}</Code></Banner>}
      <HStack gap={2}><Button label="Rotate client secret" variant="primary" isLoading={busy} onClick={() => ask({ title: "Rotate credentials?", description: "All currently active credentials will be revoked.", action: "Rotate", run: () => void rotate() })} /></HStack>
      {credentials.length ? <VStack gap={0}>{credentials.map((c) => <Item key={c.id} label={<Code>{c.secret_prefix}…</Code>}
        startContent={<Badge variant={c.revoked_at ? "neutral" : "success"} label={c.revoked_at ? "Revoked" : "Active"} />}
        description={<>Created <Timestamp value={c.created_at} format="relative" /></>}
        endContent={<Button label="Revoke" variant="ghost" isDisabled={busy || Boolean(c.revoked_at)} onClick={() => ask({ title: "Revoke this credential?", description: "Clients using it will stop working.", action: "Revoke", run: () => run(async () => { await api.applications.revokeCredential(application.id, c.id); setCredentials((items) => items.map((x) => x.id === c.id ? { ...x, revoked_at: new Date().toISOString() } : x)); }, "Could not revoke credential.") })} />} />)}</VStack>
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
      <HStack gap={2} vAlign="end" className="wrap">
        <Selector label="History" options={HISTORY} value={String(uptimeDays)} onChange={(v) => { if (!v) return; const d = Number(v); setUptimeDays(d); void loadUptime(d); }} />
        <Button label="Run uptime check" variant="primary" isLoading={busy} onClick={() => void checkUptime()} />
      </HStack>
      <Grid columns={{ minWidth: 130 }} gap={3}>
        <Metric label="Status" value={<span className="cap">{uptime?.summary?.status?.replace("_", " ") || "No data"}</span>} />
        <Metric label="Uptime" value={uptime?.summary?.uptime_percent == null ? "—" : `${uptime.summary.uptime_percent}%`} />
        <Metric label="Checks" value={uptime?.summary?.total_checks ?? "—"} />
        <Metric label="Sessions" value={sessions.length} />
      </Grid>
      {uptime?.daily?.length ? <VStack gap={0}>{uptime.daily.map((d) => <Item key={String(d.day)} label={new Date(d.day).toLocaleDateString()} description={`${d.checks} checks`} endContent={<Text weight="semibold" hasTabularNumbers>{d.uptime_percent == null ? "No checks" : `${d.uptime_percent}%`}</Text>} />)}</VStack> : null}
      <Heading level={3}>Active sessions</Heading>
      {sessions.length ? <VStack gap={0}>{sessions.map((s) => {
        const who = s.display_name || s.email || s.username || s.user_id;
        return <Item key={s.id} label={who} startContent={<Avatar name={who} src={s.avatar_url || undefined} size="sm" tooltip={false} />}
          description={`Last seen ${s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : "unknown"}`} endContent={<Badge label={s.status} />} />;
      })}</VStack> : <EmptyState isCompact title="No active sessions" description="Sessions are shown only for users who consented to this application." />}
    </VStack>,
    events: <VStack gap={3}>
      <HStack gap={2} hAlign="between" vAlign="center"><Text weight="semibold">Recent application events</Text><Button label="Refresh" isLoading={busy} onClick={() => void refreshEvents()} /></HStack>
      {events.length ? <VStack gap={0}>{events.map((e) => <Item key={e.id} label={eventLabel(e.event_type)} description={<>{e.success ? "Succeeded" : "Failed"}{eventDetail(e.metadata) && ` · ${eventDetail(e.metadata)}`}</>}
        startContent={<StatusDot variant={e.success ? "success" : "error"} label={e.success ? "Succeeded" : "Failed"} />} endContent={<Timestamp value={e.created_at} format="auto" />} />)}</VStack>
        : <EmptyState isCompact title="No application events" description="Security and configuration events will appear here as they occur." />}
    </VStack>
  };

  return <>
    <Drawer isOpen onOpenChange={(open) => { if (!open) onClose(); }} label={`${application.name} settings`} width={600} purpose="info" padding={0}>
      <VStack gap={0}>
        <HStack gap={3} vAlign="center" hAlign="between" padding={4}>
          <HStack gap={3} vAlign="center"><Avatar name={application.name} shape="rounded" size="lg" tooltip={false} /><VStack gap={0}><Text type="label" color="secondary">Application controls</Text><Heading level={2}>{application.name}</Heading></VStack></HStack>
          <IconButton label="Close" icon={<Icon icon="close" />} variant="ghost" onClick={onClose} />
        </HStack>
        <TabList value={tab} onChange={(v) => changeTab(v as TabId)} hasDivider isFullBleed>{TABS.map(([v, label]) => <Tab key={v} value={v} label={label} />)}</TabList>
        <VStack gap={4} padding={4}>
          {error && <Banner status="error" title="Something went wrong" description={error} isDismissable onDismiss={() => setError("")} />}
          {status && <Banner status="success" title={status} isDismissable onDismiss={() => setStatus("")} />}
          {panels[tab]}
        </VStack>
      </VStack>
    </Drawer>
    <AlertDialog isOpen={Boolean(confirm)} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm?.title || ""} description={confirm?.description || ""}
      actionLabel={confirm?.action || "Confirm"} onAction={() => { const c = confirm; setConfirm(null); void c?.run(); }} />
  </>;
}
