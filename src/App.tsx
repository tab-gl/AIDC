import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Add01Icon, Analytics01Icon, Grid2X2Icon, Home01Icon, Settings01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu, DropdownMenuItem } from "@astryxdesign/core/DropdownMenu";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Theme } from "@astryxdesign/core/theme";
import { TopNav } from "@astryxdesign/core/TopNav";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { Landing } from "./components/Landing";
import { Overview } from "./views/Overview";
import { Applications } from "./views/Applications";
import { ErrorBanner, LoadingState } from "./ui/blocks";
import { API_ORIGIN, api } from "./lib/api";
import { haptic } from "./lib/haptics";
import { navigate, readRoute, routes, type RouteId } from "./lib/navigation";
import { usePreferences } from "./lib/prefs";
import type { Application, Quota, User } from "./types";

const CommandPalette = lazy(() => import("@astryxdesign/core/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const ApplicationDrawer = lazy(() => import("./components/ApplicationDrawer").then((m) => ({ default: m.ApplicationDrawer })));
const CreateApplicationModal = lazy(() => import("./components/CreateApplicationModal").then((m) => ({ default: m.CreateApplicationModal })));
const Activity = lazy(() => import("./views/Activity").then((m) => ({ default: m.Activity })));
const Analytics = lazy(() => import("./views/Analytics").then((m) => ({ default: m.Analytics })));
const Settings = lazy(() => import("./views/Settings").then((m) => ({ default: m.Settings })));
const Users = lazy(() => import("./views/Users").then((m) => ({ default: m.Users })));

const ICONS = { overview: Home01Icon, applications: Grid2X2Icon, analytics: Analytics01Icon, activity: Activity01Icon, users: UserIcon, settings: Settings01Icon } satisfies Record<RouteId, typeof Home01Icon>;
const navIcon = (id: RouteId) => <HugeiconsIcon icon={ICONS[id]} size={18} strokeWidth={1.7} aria-hidden="true" />;
type Changes = Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>;

function connectionMessage(error: unknown): string {
  const e = error as { status?: number; message?: string };
  if (e.status && [404, 502, 503, 504].includes(e.status)) return "The console can't reach the AIDC backend. Check that the API origin (AIDC_BACKEND_URL or VITE_AIDC_API_BASE_URL) points to a running backend.";
  return e.message || "Unable to reach the API.";
}

export function App() {
  const prefs = usePreferences();
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const authEpoch = useRef(0);
  const selected = useMemo(() => applications.find((a) => a.id === selectedId) ?? null, [applications, selectedId]);

  const clearAuthenticatedState = useCallback(() => {
    authEpoch.current += 1;
    setUser(null); setApplications([]); setQuota(null); setSelectedId(null); setCreateOpen(false); setCreateError(null); setCommandOpen(false);
  }, []);
  const loadQuota = useCallback(async () => {
    const epoch = authEpoch.current;
    try { const d = await api.quota.get(); if (epoch === authEpoch.current) setQuota(d.quota ?? null); }
    catch { if (epoch === authEpoch.current) setQuota(null); }
  }, []);
  const loadApplications = useCallback(async () => {
    const epoch = authEpoch.current;
    setApplicationsLoading(true); setApplicationsError(null);
    try {
      const d = await api.applications.list();
      if (epoch === authEpoch.current) setApplications(Array.isArray(d.applications) ? d.applications : []);
    } catch (error) {
      if (epoch === authEpoch.current) setApplicationsError(error instanceof Error ? error.message : "Failed to load applications.");
    } finally { if (epoch === authEpoch.current) setApplicationsLoading(false); }
  }, []);
  const bootstrap = useCallback(async () => {
    setAuthLoading(true); setAuthError(null);
    try { setUser((await api.auth.me()).user ?? null); }
    catch (error) {
      if ((error as { status?: number }).status !== 401) setAuthError(connectionMessage(error));
      clearAuthenticatedState();
    } finally { setAuthLoading(false); }
  }, [clearAuthenticatedState]);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    const onAuthRequired = () => { clearAuthenticatedState(); setRoute("overview"); navigate("overview"); };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("aidc-auth-required", onAuthRequired);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("aidc-auth-required", onAuthRequired); };
  }, [clearAuthenticatedState]);
  useEffect(() => { if (user) { void loadApplications(); void loadQuota(); } }, [user, loadApplications, loadQuota]);
  useEffect(() => {
    if (!user) return;
    const refresh = () => { if (document.visibilityState === "visible") void loadQuota(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [user, loadQuota]);
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCommandOpen(true); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user]);

  const signIn = () => window.location.assign(`${API_ORIGIN}/auth/login`);
  const signOut = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try { await api.auth.logout(); } catch { /* Clear the local view even if the session already expired. */ }
    clearAuthenticatedState();
    window.location.replace("/");
  };
  const openCreate = () => { setCreateError(null); setCreateOpen(true); };
  const createApplication = async (input: { name: string; description: string; origin_url?: string }) => {
    setCreateBusy(true); setCreateError(null);
    try {
      const d = await api.applications.create({ ...input, application_type: "web" });
      if (!d.application) throw new Error("The server returned an invalid application.");
      haptic(8);
      setApplications((c) => [d.application, ...c]);
      setCreateOpen(false);
      void loadQuota();
    } catch (error) {
      const t = error as { message?: string; data?: { error?: string } };
      setCreateError(t.data?.error || t.message || "Failed to create application.");
    } finally { setCreateBusy(false); }
  };
  const updateApplication = async (id: string, changes: Changes) => {
    const r = await api.applications.update(id, changes);
    haptic(6);
    setApplications((items) => items.map((i) => i.id === id ? { ...i, ...r.application } : i));
  };
  const deleteApplication = async (id: string) => {
    await api.applications.remove(id);
    haptic(8);
    setApplications((items) => items.filter((i) => i.id !== id));
    setSelectedId(null);
    void loadQuota();
  };

  const userName = user?.name || user?.email || "Developer";
  const searchSource = useMemo(() => {
    const items = [
      ...routes.map((r) => ({ id: `route:${r.id}`, label: r.label, element: <HStack gap={2} vAlign="center">{navIcon(r.id)}<span>{r.label}</span></HStack> })),
      { id: "action:create", label: "New application", element: <HStack gap={2} vAlign="center"><HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.7} aria-hidden="true" /><span>New application</span></HStack> }
    ];
    const find = (q: string) => items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()));
    return { search: find, bootstrap: () => items, cancel: () => {} };
  }, []);
  const onCommand = (value: string) => {
    setCommandOpen(false);
    if (value === "action:create") window.setTimeout(openCreate, 120); // let the palette dialog finish closing first
    else if (value.startsWith("route:")) navigate(value.slice(6) as RouteId);
  };

  const page = (() => {
    if (authLoading) return <LoadingState title="Connecting to Ace ID" text="Checking the current session." />;
    if (authError) return <ErrorBanner message={authError} onRetry={() => void bootstrap()} />;
    switch (route) {
      case "overview": return <Overview applications={applications} quota={quota} signedIn={Boolean(user)} showTips={prefs.showTips} onApplications={() => navigate("applications")} onActivity={() => navigate("activity")} onSettings={() => navigate("settings")} onCreate={openCreate} />;
      case "applications": return <Applications applications={applications} loading={applicationsLoading} error={applicationsError} signedIn={Boolean(user)} onRetry={() => void loadApplications()} onCreate={openCreate} onOpen={(a) => setSelectedId(a.id)} />;
      case "analytics": return <Analytics />;
      case "activity": return <Activity />;
      case "users": return <Users />;
      case "settings": return <Settings />;
    }
  })();

  const signedOut = !authLoading && !authError && !user;
  return <Theme theme={neutralTheme} mode={prefs.theme}>
    <m3e-theme>
      {signedOut ? <Landing onSignIn={signIn} /> : <>
        <AppShell contentPadding={5}
          sideNav={<SideNav header={<SideNavHeading heading="AIDC" subheading="Developer console" icon={<img src="/assets/icon.png" alt="" width={24} height={24} />} headingHref="#" />}>
            <SideNavSection title="Console">
              {routes.map((r) => <SideNavItem key={r.id} label={r.label} icon={navIcon(r.id)} isSelected={route === r.id} href={r.id === "overview" ? "#" : `#${r.id}`} onClick={(e) => { e.preventDefault(); navigate(r.id); }} />)}
            </SideNavSection>
          </SideNav>}
          topNav={<TopNav label="Console toolbar" endContent={<HStack gap={2} vAlign="center">
            <Button label="Search" onClick={() => setCommandOpen(true)} icon={<Icon icon="search" />} />
            <DropdownMenu placement="below" alignment="end" renderTrigger={(props) => <IconButton {...props} label="Account menu" variant="ghost" icon={<Avatar name={userName} src={user?.picture || user?.avatar_url || undefined} size="sm" tooltip={false} />} />}>
              <DropdownMenuItem label={userName} description="Signed in with Ace ID" isDisabled />
              <DropdownMenuItem label="Account" icon="externalLink" href="https://identity.ace-base.cc/account" target="_blank" rel="noreferrer" />
              <DropdownMenuItem label={logoutBusy ? "Signing out…" : "Sign out"} variant="destructive" isDisabled={logoutBusy} onClick={() => void signOut()} />
            </DropdownMenu>
          </HStack>} />}>
          <Suspense fallback={<LoadingState title="Loading" />}>{page}</Suspense>
        </AppShell>
        <Suspense fallback={null}>
          {commandOpen && <CommandPalette isOpen onOpenChange={setCommandOpen} searchSource={searchSource} onValueChange={onCommand} label="Command palette" />}
          {createOpen && <CreateApplicationModal open busy={createBusy} error={createError} onClose={() => !createBusy && setCreateOpen(false)} onCreate={createApplication} />}
          {selected && <ApplicationDrawer application={selected} onClose={() => setSelectedId(null)} onUpdate={updateApplication} onDelete={deleteApplication} />}
        </Suspense>
      </>}
    </m3e-theme>
  </Theme>;
}
