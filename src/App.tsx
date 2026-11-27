import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { DropdownMenu, DropdownMenuItem } from "@astryxdesign/core/DropdownMenu";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SideNav, SideNavHeading, SideNavItem } from "@astryxdesign/core/SideNav";
import { Theme } from "@astryxdesign/core/theme";
import { TopNav } from "@astryxdesign/core/TopNav";
import { VStack } from "@astryxdesign/core/VStack";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { Landing } from "./components/Landing";
import { CookieBanner } from "./components/CookieBanner";
import { Icon } from "./ui/Icon";
import type { IconName } from "./ui/Icon";
import { MobileNav, type MobileNavItem } from "./components/MobileNav";
import { SearchField, type SearchItem } from "./components/SearchField";
import { Sheet } from "./components/Sheet";
import { useIsMobile } from "./lib/useMedia";
import { Overview } from "./views/Overview";
import { Applications } from "./views/Applications";
import { LoadingState } from "./ui/blocks";
import { API_ORIGIN, api } from "./lib/api";
import { APPLICATION_LIMIT } from "./lib/limits";
import { reconcileApplications } from "./lib/applications";
import { haptic } from "./lib/haptics";
import { INSIGHTS_TABS, navigate, readInsightsTab, readRoute, routes, type InsightsTab, type RouteId } from "./lib/navigation";
import { usePreferences, type Preferences } from "./lib/prefs";
import type { Application, User } from "./types";

const CommandPalette = lazy(() => import("@astryxdesign/core/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const ApplicationDrawer = lazy(() => import("./components/ApplicationDrawer").then((m) => ({ default: m.ApplicationDrawer })));
const CreateApplicationModal = lazy(() => import("./components/CreateApplicationModal").then((m) => ({ default: m.CreateApplicationModal })));
const Insights = lazy(() => import("./views/Insights").then((m) => ({ default: m.Insights })));
const Settings = lazy(() => import("./views/Settings").then((m) => ({ default: m.Settings })));

const navIcon = (id: RouteId, filled = false) => <Icon name={ROUTE_ICONS[id]} size={20} filled={filled} />;
// One Solar glyph per destination, shared by both shells.
const ROUTE_ICONS: Record<RouteId, IconName> = { overview: "home", applications: "grid", insights: "chart", settings: "gear" };
const TAB_ICONS: Record<InsightsTab, IconName> = { analytics: "chart", activity: "pulse", users: "user" };
type Changes = Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>;

function connectionMessage(error: unknown): string {
  const e = error as { status?: number; message?: string };
  if (e.status && [404, 502, 503, 504].includes(e.status)) return "The console can't reach the AIDC backend. Check that the API origin (AIDC_BACKEND_URL or VITE_AIDC_API_BASE_URL) points to a running backend.";
  return e.message || "Unable to reach the API.";
}

export function App() {
  const prefs = usePreferences();
  const isMobile = useIsMobile();
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<{ base: Preferences; values: Preferences } | null>(null);
  useEffect(() => {
    if (!settingsDraft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [settingsDraft]);
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [insightsTab, setInsightsTab] = useState<InsightsTab>(readInsightsTab);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const authEpoch = useRef(0);
  const bootSeq = useRef(0);
  const appsSeq = useRef(0);
  const selected = useMemo(() => applications.find((a) => a.id === selectedId) ?? null, [applications, selectedId]);

  const clearAuthenticatedState = useCallback(() => {
    authEpoch.current += 1;
    setUser(null); setApplications([]); setSelectedId(null); setCreateOpen(false); setCreateError(null); setCommandOpen(false); setNotice(null); setAccountOpen(false);
    setAuthLoading(false); setApplicationsLoading(false); setApplicationsError(null); setSettingsDraft(null);
  }, []);
  /**
   * Loads the application list. A silent refresh revalidates in the background after a
   * mutation or when the tab regains focus: the current list stays on screen instead of
   * being replaced by a spinner, and a failed refresh keeps the confirmed local state.
   */
  const loadApplications = useCallback(async (change?: { upsert?: Application; removedId?: string }, options?: { silent?: boolean }) => {
    const seq = ++appsSeq.current;
    const epoch = authEpoch.current;
    const silent = options?.silent === true;
    if (!silent) { setApplicationsLoading(true); setApplicationsError(null); }
    try {
      const d = await api.applications.list();
      if (!Array.isArray(d?.applications)) throw new Error("The server returned an invalid application list.");
      if (seq === appsSeq.current && epoch === authEpoch.current) {
        setApplications(reconcileApplications(d.applications, change));
        setApplicationsError(null);
      }
    } catch (error) {
      // A background refresh must not blank a list the user can already see; the next
      // foreground load (or the retry button) reports the problem.
      if (seq === appsSeq.current && epoch === authEpoch.current && !silent) {
        setApplicationsError(error instanceof Error ? error.message : "Failed to load applications.");
      }
    } finally {
      if (seq === appsSeq.current && epoch === authEpoch.current) setApplicationsLoading(false);
    }
  }, []);
  const bootstrap = useCallback(async () => {
    const seq = ++bootSeq.current;
    const epoch = authEpoch.current;
    setAuthLoading(true); setAuthError(null);
    try {
      const session = await api.auth.me();
      if (seq !== bootSeq.current || epoch !== authEpoch.current) return;
      if (!session || typeof session !== "object" || !("user" in session)) {
        throw new Error("The AIDC API returned an invalid session response. Check the API proxy and backend configuration.");
      }
      setUser(session.user ?? null);
    } catch (error) {
      if (seq !== bootSeq.current || epoch !== authEpoch.current) return;
      if ((error as { status?: number }).status !== 401) setAuthError(connectionMessage(error));
      clearAuthenticatedState();
    } finally { if (seq === bootSeq.current && epoch === authEpoch.current) setAuthLoading(false); }
  }, [clearAuthenticatedState]);

  useEffect(() => { void bootstrap(); }, [bootstrap]);
  useEffect(() => {
    const onHash = () => { setRoute(readRoute()); setInsightsTab(readInsightsTab()); };
    const onAuthRequired = () => { clearAuthenticatedState(); setRoute("overview"); navigate("overview"); };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("aidc-auth-required", onAuthRequired);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("aidc-auth-required", onAuthRequired); };
  }, [clearAuthenticatedState]);
  useEffect(() => { if (user) void loadApplications(); }, [user, loadApplications]);
  // Coming back to the tab or regaining connectivity is a natural moment to revalidate.
  // Throttled, silent and skipped while hidden, so it never competes with a view's own fetch.
  useEffect(() => {
    if (!user) return;
    let lastRefresh = Date.now();
    const revalidate = () => {
      if (document.visibilityState === "hidden") return;
      if (Date.now() - lastRefresh < 30_000) return;
      lastRefresh = Date.now();
      void loadApplications(undefined, { silent: true });
    };
    window.addEventListener("online", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => { window.removeEventListener("online", revalidate); document.removeEventListener("visibilitychange", revalidate); };
  }, [user, loadApplications]);
  // Hash navigation does not reset scroll; a new page should start at its masthead.
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }, [route]);
  // Successes are confirmations, not permanent furniture; errors linger a little longer.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.kind === "success" ? 5_000 : 9_000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const label = routes.find((item) => item.id === route)?.label;
    document.title = user && label ? `${label} · AIDC` : "AIDC @ Ace Identity Developer Console";
  }, [route, user]);
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
    try {
      await api.auth.logout();
    } catch (error) {
      // An expired session is already signed out server-side, so still drop local state.
      if ((error as { status?: number }).status !== 401) {
        setNotice({ kind: "error", text: "Could not sign out. Please try again." });
        setLogoutBusy(false);
        return;
      }
    }
    clearAuthenticatedState();
    window.location.replace("/");
  };
  const switchAccount = async () => {
    setAccountOpen(false);
    try { await api.auth.logout(); } catch { /* continue: a stale session is replaced on sign-in */ }
    window.location.assign(`${API_ORIGIN}/auth/login?switch=1`);
  };
  const openCreate = () => {
    if (applicationsLoading || applicationsError) {
      setNotice({ kind: "error", text: "Refresh your application list before creating a project." });
      return;
    }
    if (applications.length >= APPLICATION_LIMIT) {
      setNotice({ kind: "error", text: `Each Ace ID can own up to ${APPLICATION_LIMIT} applications.` });
      return;
    }
    setCreateError(null);
    setCreateOpen(true);
  };
  const createApplication = async (input: { name: string; description: string; origin_url?: string }) => {
    const epoch = authEpoch.current;
    if (applicationsLoading || applicationsError) {
      setCreateError("Refresh your application list before creating a project.");
      return;
    }
    if (applications.length >= APPLICATION_LIMIT) {
      setCreateError(`Each Ace ID can own up to ${APPLICATION_LIMIT} applications.`);
      return;
    }
    setCreateBusy(true); setCreateError(null);
    try {
      const d = await api.applications.create({ ...input, application_type: "web" });
      if (epoch !== authEpoch.current) return;
      if (!d.application) throw new Error("The server returned an invalid application.");
      if (prefs.hapticFeedback) haptic(8);
      appsSeq.current += 1;
      setApplicationsLoading(false); setApplicationsError(null);
      setApplications((c) => [d.application, ...c.filter((a) => a.id !== d.application.id)]);
      setCreateOpen(false);
      setNotice({ kind: "success", text: `Application “${d.application.name}” created.` });
      void loadApplications({ upsert: d.application }, { silent: true });
    } catch (error) {
      if (epoch !== authEpoch.current) return;
      const t = error as { message?: string; data?: { error?: string } };
      setCreateError(t.data?.error || t.message || "Failed to create application.");
    } finally { setCreateBusy(false); }
  };
  const updateApplication = async (id: string, changes: Changes) => {
    const epoch = authEpoch.current;
    const r = await api.applications.update(id, changes);
    if (epoch !== authEpoch.current) return;
    if (prefs.hapticFeedback) haptic(6);
    appsSeq.current += 1;
    setApplicationsLoading(false); setApplicationsError(null);
    const previous = applications.find((item) => item.id === id);
    setApplications((items) => items.map((i) => i.id === id ? { ...i, ...r.application } : i));
    void loadApplications(previous ? { upsert: { ...previous, ...r.application } } : undefined, { silent: true });
  };
  const deleteApplication = async (id: string) => {
    const epoch = authEpoch.current;
    await api.applications.remove(id);
    if (epoch !== authEpoch.current) return;
    if (prefs.hapticFeedback) haptic(8);
    appsSeq.current += 1;
    setApplicationsLoading(false); setApplicationsError(null);
    setApplications((items) => items.filter((i) => i.id !== id));
    setSelectedId(null);
    setNotice({ kind: "success", text: "Application deleted." });
    void loadApplications({ removedId: id }, { silent: true });
  };

  const userName = user?.name || user?.email || "Developer";

  // Stable identities keep the floating bar out of re-renders it has nothing to do with
  // (application counts and health polling, notices, drawers); the icon set and destinations never change.
  const navItems = useMemo<MobileNavItem[]>(() => routes
    .filter((r) => ["overview", "applications", "insights"].includes(r.id))
    .map((r) => ({ id: r.id, label: r.id === "applications" ? "Apps" : r.label, icon: ROUTE_ICONS[r.id] })), []);
  const navAccount = useMemo(() => ({ name: userName, avatarUrl: user?.picture || user?.avatar_url || undefined }), [userName, user]);
  const selectRoute = useCallback((id: string) => { setAccountOpen(false); navigate(id as RouteId); }, []);
  const openAccount = useCallback(() => setAccountOpen(true), []);
  const searchSource = useMemo(() => {
    const items = [
      ...routes.map((r) => ({ id: `route:${r.id}`, label: r.label, element: <HStack gap={2} vAlign="center">{navIcon(r.id)}<span>{r.label}</span></HStack> })),
      ...INSIGHTS_TABS.map((t) => ({ id: `route:${t.id}`, label: `Insights · ${t.label}`, element: <HStack gap={2} vAlign="center"><Icon name={TAB_ICONS[t.id]} size={20} /><span>Insights · {t.label}</span></HStack> })),
      { id: "action:create", label: "New application", element: <HStack gap={2} vAlign="center"><Icon name="plus" size={20} /><span>New application</span></HStack> },
      ...applications.map((a) => ({ id: `app:${a.id}`, label: a.name, element: <HStack gap={2} vAlign="center"><Icon name="grid" size={20} /><span>{a.name}</span></HStack> }))
    ];
    const find = (q: string) => {
      const needle = q.trim().toLowerCase();
      return needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items;
    };
    return { search: find, bootstrap: () => items, cancel: () => {} };
  }, [applications]);
  const searchItems = useMemo<SearchItem[]>(() => [
    ...routes.map((r) => ({ id: `route:${r.id}`, label: r.label, hint: "Page" })),
    ...INSIGHTS_TABS.map((t) => ({ id: `route:${t.id}`, label: `Insights · ${t.label}`, hint: "Page" })),
    { id: "action:create", label: "New application", hint: "Action" },
    ...applications.map((a) => ({ id: `app:${a.id}`, label: a.name, hint: "Application" }))
  ], [applications]);
  const onSearchSelect = (value: string) => {
    if (value === "action:create") openCreate();
    else if (value.startsWith("route:")) navigate(value.slice(6) as RouteId);
    else if (value.startsWith("app:")) setSelectedId(value.slice(4));
  };
  const onCommand = (value: string) => {
    setCommandOpen(false);
    if (value === "action:create") window.setTimeout(openCreate, 120); // let the palette dialog finish closing first
    else if (value.startsWith("route:")) navigate(value.slice(6) as RouteId);
    else if (value.startsWith("app:")) setSelectedId(value.slice(4));
  };

  // The existing AIDC charcoal/neutral palette is also the Material color seed.
  const frame = (content: ReactNode) => <Theme theme={neutralTheme} mode={prefs.theme}><m3e-theme color="#1b1b1b" variant="monochrome" contrast={prefs.contrast} scheme={prefs.theme === "system" ? "auto" : prefs.theme}>{content}<CookieBanner /></m3e-theme></Theme>;

  // Session checks and backend errors render without the authenticated shell, so no phantom
  // account menu or navigation is shown before the session is known.
  if (authLoading) return frame(<Center minHeight="100dvh" padding={4}><LoadingState title="Connecting to Ace ID" text="Checking the current session." /></Center>);
  if (authError) return frame(<Center minHeight="100dvh" padding={4}>
    <VStack gap={4} width="100%" maxWidth={560}>
      <HStack gap={2} vAlign="center"><img src="/assets/icon.png" alt="" width={32} height={32} /><Heading level={1} type="display-3">AIDC</Heading></HStack>
      <Banner status="error" title="The console can't reach Ace ID" description={authError} endContent={<Button label="Retry" onClick={() => void bootstrap()} />} />
      <Button label="Continue with Ace ID" variant="primary" onClick={signIn} />
    </VStack>
  </Center>);
  if (!user) return frame(<Landing onSignIn={signIn} />);

  const page = (() => {
    switch (route) {
      case "overview": return <Overview applications={applications} applicationsLoading={applicationsLoading} applicationsError={applicationsError} signedIn showTips={prefs.showTips} onApplications={() => navigate("applications")} onActivity={() => navigate("activity")} onSettings={() => navigate("settings")} onCreate={openCreate} />;
      case "applications": return <Applications applications={applications} loading={applicationsLoading} error={applicationsError} signedIn onRetry={() => void loadApplications()} onCreate={openCreate} onOpen={(a) => setSelectedId(a.id)} />;
      case "insights": return <Insights tab={insightsTab} onTab={setInsightsTab} applications={applications} applicationsLoading={applicationsLoading} applicationsError={applicationsError} />;
      case "settings": return <Settings saved={prefs} draft={settingsDraft} onDraftChange={setSettingsDraft} />;
    }
  })();

  const overlays = <>
    <Suspense fallback={null}>
      {commandOpen && <CommandPalette isOpen onOpenChange={setCommandOpen} searchSource={searchSource} onValueChange={onCommand} label="Command palette" />}
      {createOpen && <CreateApplicationModal open busy={createBusy} error={createError} onClose={() => !createBusy && setCreateOpen(false)} onCreate={createApplication} />}
      {selected && <ApplicationDrawer application={selected} onClose={() => setSelectedId(null)} onUpdate={updateApplication} onDelete={deleteApplication} />}
    </Suspense>
  </>;

  if (isMobile) {
    // Secondary pages (Users, Settings) are opened from the account sheet, so the profile slot
    // carries their selected state instead of a bar destination.
    const onPrimary = navItems.some((r) => r.id === route);
    const feedback = (duration = 4) => { if (prefs.hapticFeedback) haptic(duration); };
    const accountRow = (id: RouteId, icon: IconName, label: string, hint: string) => (
      <button
        key={id}
        type="button"
        className={`sheet-row${route === id ? " is-current" : ""}`}
        onClick={() => { feedback(); selectRoute(id); }}
      >
        <span className="sheet-row-icon"><Icon name={icon} size={22} /></span>
        <span className="sheet-row-text"><span className="sheet-row-label">{label}</span><span className="sheet-row-hint">{hint}</span></span>
        <Icon name="chevron-right" size={16} className="sheet-row-caret" />
      </button>
    );
    return frame(<div className="m-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => { event.preventDefault(); const main = document.getElementById("main-content"); main?.focus({ preventScroll: true }); main?.scrollIntoView({ block: "start" }); }}
      >Skip to content</a>
      <header className="m-top">
        <a className="m-brand" href="#" onClick={(e) => { e.preventDefault(); navigate("overview"); }}><img src="/assets/icon.png" alt="" width={26} height={26} /><span>AIDC</span></a>
        <div className="m-top-actions">
          <SearchField items={searchItems} onSelect={onSearchSelect} />
        </div>
      </header>
      <main className="m-main" id="main-content" tabIndex={-1}>
        <VStack gap={4}>
          {notice && <div role={notice.kind === "error" ? "alert" : "status"}><Banner status={notice.kind} title={notice.text} isDismissable onDismiss={() => setNotice(null)} /></div>}
          <Suspense fallback={<LoadingState title="Loading" />}><div key={route} className="route-enter">{page}</div></Suspense>
        </VStack>
      </main>
      <MobileNav
        active={onPrimary ? route : null}
        accountActive={!onPrimary}
        accountOpen={accountOpen}
        account={navAccount}
        hapticsEnabled={prefs.hapticFeedback}
        pinned={accountOpen || createOpen || commandOpen || selectedId !== null}
        onAccount={openAccount}
        onSelect={selectRoute}
        items={navItems}
      />
      <Sheet open={accountOpen} title="Ace ID" description="Signed in on this device." onClose={() => setAccountOpen(false)}>
        <div className="sheet-identity">
          <Avatar name={userName} src={navAccount.avatarUrl} size={40} tooltip={false} />
          <div className="sheet-identity-text">
            <span className="sheet-identity-name">{userName}</span>
            {user.email && <span className="sheet-identity-email">{user.email}</span>}
          </div>
          <span className="sheet-identity-badge">Ace ID</span>
        </div>
        <div className="sheet-list">
          {accountRow("settings", "gear", "Settings", "Theme, contrast, motion and haptics")}
          <button type="button" className="sheet-row" onClick={() => { feedback(); void switchAccount(); }}>
            <span className="sheet-row-icon"><Icon name="exchange" size={22} /></span>
            <span className="sheet-row-text"><span className="sheet-row-label">Switch Ace ID</span><span className="sheet-row-hint">Sign in with a different Ace ID</span></span>
            <Icon name="chevron-right" size={16} className="sheet-row-caret" />
          </button>
          <a className="sheet-row" href="https://identity.ace-base.cc/me" target="_blank" rel="noreferrer" onClick={() => feedback()}>
            <span className="sheet-row-icon"><Icon name="external-link" size={22} /></span>
            <span className="sheet-row-text"><span className="sheet-row-label">Manage Ace ID</span><span className="sheet-row-hint">Name, security and connected apps</span></span>
            <Icon name="chevron-right" size={16} className="sheet-row-caret" />
          </a>
          <button type="button" className="sheet-row is-danger" disabled={logoutBusy} onClick={() => { feedback(6); void signOut(); }}>
            <span className="sheet-row-icon"><Icon name="logout" size={22} /></span>
            <span className="sheet-row-text"><span className="sheet-row-label">{logoutBusy ? "Signing out…" : "Sign out"}</span><span className="sheet-row-hint">Ends this console session</span></span>
          </button>
        </div>
      </Sheet>
      {overlays}
    </div>);
  }

  return frame(<>
    <AppShell contentPadding={5}
      sideNav={<SideNav header={<SideNavHeading heading="AIDC" icon={<img src="/assets/icon.png" alt="" width={24} height={24} />} headingHref="#" />}>
        {routes.map((r) => (
          <SideNavItem
            key={r.id}
            label={r.label}
            icon={<Icon name={ROUTE_ICONS[r.id]} size={20} />}
            selectedIcon={<Icon name={ROUTE_ICONS[r.id]} size={20} filled />}
            isSelected={route === r.id}
            onClick={() => navigate(r.id)}
          />
        ))}
      </SideNav>}
      topNav={<TopNav label="Console toolbar" endContent={<HStack gap={2} vAlign="center">
        <SearchField items={searchItems} onSelect={onSearchSelect} />
        <DropdownMenu placement="below" alignment="end" renderTrigger={(props) => <IconButton {...props} label="Ace ID menu" variant="ghost" icon={<Avatar name={userName} src={user.picture || user.avatar_url || undefined} size="sm" tooltip={false} />} />}>
          <DropdownMenuItem label={userName} description="Signed in with Ace ID" isDisabled />
          <DropdownMenuItem label="Switch Ace ID" icon={<Icon name="exchange" size={20} />} onClick={() => void switchAccount()} />
          <DropdownMenuItem label="Manage Ace ID" icon={<Icon name="external-link" size={20} />} href="https://identity.ace-base.cc/me" target="_blank" rel="noreferrer" />
          <DropdownMenuItem label={logoutBusy ? "Signing out…" : "Sign out"} variant="destructive" isDisabled={logoutBusy} onClick={() => void signOut()} />
        </DropdownMenu>
      </HStack>} />}>
      <VStack gap={4}>
        {notice && <div role={notice.kind === "error" ? "alert" : "status"}><Banner status={notice.kind} title={notice.text} isDismissable onDismiss={() => setNotice(null)} /></div>}
        <Suspense fallback={<LoadingState title="Loading" />}><div key={route} className="route-enter">{page}</div></Suspense>
      </VStack>
    </AppShell>
    {overlays}
  </>);
}
