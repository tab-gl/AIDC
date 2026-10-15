import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IdentityAvatar } from "./components/IdentityAvatar";
import { Activity01Icon, Analytics01Icon, Grid2X2Icon, Home01Icon, Logout01Icon, Search01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { CommandPalette } from "./components/CommandPalette";
import { CreateApplicationModal } from "./components/CreateApplicationModal";
import { ApplicationDrawer } from "./components/ApplicationDrawer";
import { Applications } from "./views/Applications";
import { Activity } from "./views/Activity";
import { Analytics } from "./views/Analytics";
import { Overview } from "./views/Overview";
import { Settings } from "./views/Settings";
import { Users } from "./views/Users";
import { API_ORIGIN, api } from "./lib/api";
import { haptic } from "./lib/haptics";
import { navigate, readRoute, type RouteId } from "./lib/navigation";
import type { Application, Entitlements, Quota, User } from "./types";

function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return <main className="ace-landing">
    <nav className="ace-landing-nav" aria-label="Main navigation">
      <a className="ace-wordmark" href="/" aria-label="AIDC home"><span className="ace-wordmark-mark">A</span><span>AIDC<small>DEVELOPER CONSOLE</small></span></a>
      <div className="ace-nav-links"><a href="#capabilities">Capabilities</a><a href="https://docs.ace-base.cc/projects/aidc">Documentation <span aria-hidden="true">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></a></div>
      <button className="ace-nav-signin" onClick={onSignIn}>Continue with Ace ID <span aria-hidden="true">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></button>
    </nav>
    <section className="ace-landing-hero">
      <div className="ace-hero-copy">
        <div className="ace-eyebrow"><span className="ace-live-dot" /> THE DEVELOPER CONSOLE FOR ACE ID</div>
        <h1>Identity infrastructure.<br/><em>Under your control.</em></h1>
        <p className="ace-hero-lede">Build, configure, and observe the applications connected to Ace ID. OAuth and OpenID Connect, without the guesswork.</p>
        <div className="ace-hero-actions"><button className="ace-primary-cta" onClick={onSignIn}>Continue with Ace ID <span aria-hidden="true">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></button><a className="ace-secondary-cta" href="https://docs.ace-base.cc/projects/aidc">Explore the docs <span aria-hidden="true">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></a></div>
        <div className="ace-trust-line"><span className="ace-trust-check">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span> Your identity stays with Ace ID <span className="ace-trust-separator">ÃÂÃÂÃÂÃÂ·</span> Your apps stay yours</div>
      </div>
      <div className="ace-hero-art" aria-label="Illustration of an application connected securely to Ace ID">
        <div className="ace-art-orbit ace-art-orbit-one" /><div className="ace-art-orbit ace-art-orbit-two" />
        <div className="ace-art-label ace-art-label-top"><span className="ace-art-pulse" /> AUTH FLOW <b>READY</b></div>
        <div className="ace-art-core"><span className="ace-art-core-mark">A</span><span>ACE ID</span><small>IDENTITY PROVIDER</small></div>
        <div className="ace-art-connector ace-art-connector-left"><i>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</i></div><div className="ace-art-connector ace-art-connector-right"><i>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</i></div>
        <div className="ace-art-node ace-art-node-left"><span className="ace-node-glyph">{"{}"}</span><b>Your app</b><small>OAuth client</small></div>
        <div className="ace-art-node ace-art-node-right"><span className="ace-node-glyph">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span><b>Verified</b><small>OIDC session</small></div>
        <div className="ace-art-footnote">STATEFUL BY DESIGN <span>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ¢</span> PKCE ENABLED</div>
      </div>
      <div className="ace-hero-index"><span>01 / DEVELOPER PLATFORM</span><span>BUILT FOR THE DETAILS ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></div>
    </section>
    <section className="ace-capabilities" id="capabilities">
      <div className="ace-section-heading"><div><span className="ace-section-kicker">ONE CONSOLE. CLEAR CONTROL.</span><h2>Everything your app needs.<br/><em>Nothing pretending to be you.</em></h2></div><p>AIDC manages app configuration. Ace ID remains the identity provider. The boundary is deliberate.</p></div>
      <div className="ace-feature-grid">
        <article className="ace-feature-card ace-feature-card-main"><div className="ace-feature-top"><span>01</span><span className="ace-feature-symbol">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></div><div className="ace-feature-visual ace-visual-clients"><div className="ace-mini-window"><div className="ace-mini-window-bar"><i/><i/><i/><span>APPLICATIONS / 03</span></div><div className="ace-mini-row"><b className="ace-mini-icon">N</b><span>Northstar Web<small>Production client</small></span><i className="ace-mini-tag">ACTIVE</i></div><div className="ace-mini-row"><b className="ace-mini-icon ace-mini-icon-alt">S</b><span>Studio Mobile<small>Native client</small></span><i className="ace-mini-tag">ACTIVE</i></div><div className="ace-mini-row"><b className="ace-mini-icon ace-mini-icon-third">D</b><span>Dev Workspace<small>Development</small></span><i className="ace-mini-tag">TEST</i></div></div></div><h3>Application control</h3><p>Manage clients, redirect URIs, scopes, credentials, and branding from one workspace.</p></article>
        <article className="ace-feature-card"><div className="ace-feature-top"><span>02</span><span className="ace-feature-symbol">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></div><div className="ace-feature-visual ace-visual-protocol"><div className="ace-protocol-row"><span>01</span><b>OAuth 2.0</b><i>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</i></div><div className="ace-protocol-row"><span>02</span><b>OpenID Connect</b><i>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</i></div><div className="ace-protocol-row"><span>03</span><b>PKCE</b><i>ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</i></div><div className="ace-protocol-stamp">PROTOCOLS<br/>NOT PROMISES</div></div><h3>Standards, not shortcuts</h3><p>Configure the flows your clients need with a clear view of the settings that matter.</p></article>
        <article className="ace-feature-card"><div className="ace-feature-top"><span>03</span><span className="ace-feature-symbol">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></div><div className="ace-feature-visual ace-visual-observe"><div className="ace-observe-header"><span>AUTH EVENTS</span><b><i/> LIVE VIEW</b></div><div className="ace-sparkline"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div><div className="ace-observe-stats"><div><small>SUCCESS RATE</small><b>Observable</b></div><div><small>EVENT TRAIL</small><b>Auditable</b></div></div></div><h3>Visibility when it counts</h3><p>Review authentication activity, application events, and operational health in context.</p></article>
      </div>
    </section>
    <section className="ace-landing-bottom"><div><span className="ace-section-kicker">YOUR WORKSPACE STARTS HERE</span><h2>Ship the app.<br/><em>Trust the identity layer.</em></h2></div><button className="ace-primary-cta" onClick={onSignIn}>Enter the console <span aria-hidden="true">ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</span></button></section>
    <footer className="ace-landing-footer"><a className="ace-wordmark ace-wordmark-footer" href="/"><span className="ace-wordmark-mark">A</span><span>Ace <b>ID</b><small>DEVELOPER CONSOLE</small></span></a><span>Identity by Ace ID. Application control by AIDC.</span><a href="https://docs.ace-base.cc/projects/aidc">Documentation ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ</a><span>ÃÂÃÂÃÂÃÂ© {new Date().getFullYear()} ACE ID</span></footer>
  </main>;
}

export function App() {
  const [route, setRoute] = useState<RouteId>(readRoute);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 820px)").matches);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const authEpoch = useRef(0);
  const clearAuthenticatedState = useCallback(() => {
    authEpoch.current += 1;
    setUser(null); setApplications([]); setQuota(null); setEntitlements(null); setSelectedApplication(null); setCreateOpen(false); setCreateError(null); setCommandOpen(false);
  }, []);
  const signOut = async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try { await api.auth.logout(); } catch { /* Clear local view even if the session already expired. */ }
    clearAuthenticatedState();
    window.location.replace("/");
  };
  const updateApplication = async (id: string, changes: Partial<Pick<Application, "name" | "description" | "origin_url" | "application_type">>) => {
    const result = await api.applications.update(id, changes);
    haptic(6);
    setApplications((items) => items.map((item) => item.id === id ? { ...item, ...result.application } : item));
    setSelectedApplication(result.application);
  };
  const deleteApplication = async (id: string) => {
    await api.applications.remove(id);
    haptic(8);
    setApplications((items) => items.filter((item) => item.id !== id));
    setSelectedApplication(null);
    await loadQuota();
  };
  const loadApplications = useCallback(async () => {
    const epoch = authEpoch.current;
    setApplicationsLoading(true); setApplicationsError(null);
    try {
      const data = await api.applications.list();
      if (epoch !== authEpoch.current) return;
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (error) {
      if (epoch !== authEpoch.current) return;
      setApplicationsError(error instanceof Error ? error.message : "Failed to load applications.");
    } finally { setApplicationsLoading(false); }
  }, []);
  const loadQuota = useCallback(async () => {
    const epoch = authEpoch.current;
    try {
      const data = await api.quota.get();
      if (epoch !== authEpoch.current) return;
      setQuota(data.quota ?? null); setEntitlements(data.entitlements ?? null);
    } catch {
      if (epoch !== authEpoch.current) return;
      setQuota(null); setEntitlements(null);
    }
  }, []);
  const bootstrap = useCallback(async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = await api.auth.me();
      setUser(data.user ?? null);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 401) setAuthError(error instanceof Error ? error.message : "Unable to reach the API.");
      clearAuthenticatedState();
    } finally { setAuthLoading(false); }
  }, [clearAuthenticatedState]);
  useEffect(() => {
    const onAuthRequired = () => {
      clearAuthenticatedState();
      setRoute("overview");
      navigate("overview");
    };
    window.addEventListener("aidc-auth-required", onAuthRequired);
    return () => window.removeEventListener("aidc-auth-required", onAuthRequired);
  }, [clearAuthenticatedState]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aidc-neo-preferences-v1") || "{}");
      const root = document.documentElement;
      root.dataset.theme = saved.theme || "system";
      root.dataset.accent = saved.accent || "orange";
      root.dataset.density = saved.density || "comfortable";
      root.dataset.reduceMotion = String(Boolean(saved.reduceMotion));
      setShowTips(saved.showTips !== false);
    } catch { /* Preferences are optional and never block authentication. */ }
    const onPreferenceChange = () => { try { const saved = JSON.parse(localStorage.getItem("aidc-neo-preferences-v1") || "{}"); setShowTips(saved.showTips !== false); } catch { setShowTips(true); } };
    window.addEventListener("aidc:preferences-change", onPreferenceChange);
    void bootstrap();
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("aidc:preferences-change", onPreferenceChange); };
  }, [bootstrap]);
  useEffect(() => {
    if (!user) return;
    void loadApplications(); void loadQuota();
  }, [user, loadApplications, loadQuota]);
  useEffect(() => {
    if (!user) return;
    const refreshEntitlements = () => {
      if (document.visibilityState === "visible") void loadQuota();
    };
    window.addEventListener("focus", refreshEntitlements);
    document.addEventListener("visibilitychange", refreshEntitlements);
    return () => {
      window.removeEventListener("focus", refreshEntitlements);
      document.removeEventListener("visibilitychange", refreshEntitlements);
    };
  }, [user, loadQuota]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const onViewportChange = () => setIsMobile(media.matches);
    onViewportChange();
    media.addEventListener("change", onViewportChange);
    return () => media.removeEventListener("change", onViewportChange);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const createApplication = async (input: { name: string; description: string; origin_url?: string }) => {
    setCreateBusy(true); setCreateError(null);
    try {
      const data = await api.applications.create({ ...input, application_type: "web" });
      if (!data.application) throw new Error("The server returned an invalid application.");
      haptic(8);
      setApplications((current) => [data.application, ...current]);
      setCreateOpen(false); await loadQuota();
    } catch (error) {
      const typed = error as { status?: number; message?: string; data?: { error?: string } };
      setCreateError(typed.data?.error || typed.message || "Failed to create application.");
    } finally { setCreateBusy(false); }
  };
  const userName = useMemo(() => user?.name || user?.email || "Developer", [user]);
  const signIn = () => window.location.assign(`${API_ORIGIN}/auth/login`);
  const openCreateApplication = () => { setCreateError(null); setCreateOpen(true); };
  if (!authLoading && !authError && !user) {
    return <LandingPage onSignIn={signIn} />;
  }
  const mobileRouteLabel = ({ overview: "Overview", applications: "Applications", analytics: "Analytics", activity: "Activity", users: "Users", settings: "Settings" } as Record<RouteId, string>)[route];
  return <div className="neo-app">
    {!isMobile && <div className="neo-desktop-shell">
      <Sidebar route={route} userName={userName} avatarUrl={user?.picture || user?.avatar_url || undefined} plan={entitlements?.plan} hasPaidSubscription={Boolean(entitlements?.subscription)} onSignIn={signIn} onSignOut={() => void signOut()} logoutBusy={logoutBusy} />
      <div className="neo-main">
        <Topbar route={route} onCommand={() => setCommandOpen(true)} />
      {authLoading ? (
        <main className="neo-content"><div className="neo-state"><span className="neo-spinner" aria-hidden="true" /><strong>Connecting to Ace ID</strong><span>Checking the current session.</span></div></main>
      ) : authError ? (
        <main className="neo-content"><div className="neo-state neo-state-error" role="alert"><strong>Console connection failed</strong><span>{authError}</span><button className="neo-button neo-button-secondary" onClick={() => void bootstrap()}>Retry</button></div></main>
      ) : (
        <main className="neo-content">
          {route === "overview" && <Overview applications={applications} quota={quota} entitlements={entitlements} signedIn={Boolean(user)} showTips={showTips} onApplications={() => navigate("applications")} onActivity={() => navigate("activity")} onSettings={() => navigate("settings")} onCreate={openCreateApplication} />}
          {route === "applications" && <Applications applications={applications} loading={applicationsLoading} error={applicationsError} signedIn={Boolean(user)} onRetry={() => void loadApplications()} onCreate={openCreateApplication} onOpen={setSelectedApplication} />}
          {route === "analytics" && <Analytics />}
          {route === "activity" && <Activity />}
          {route === "users" && <Users />}
          {route === "settings" && <Settings />}
        </main>
      )}
      </div>
    </div>}
    {isMobile && <div className="neo-mobile-shell">
      <header className="neo-mobile-header">
        <button className="neo-mobile-brand" onClick={() => navigate("overview")} aria-label="Go to overview"><img src="/assets/icon.png" alt="" width="28" height="28" /><span><b>AIDC</b><small>DEVELOPER CONSOLE</small></span></button>
        <div className="neo-mobile-header-actions">
          <button className="neo-mobile-icon-button" onClick={() => setCommandOpen(true)} aria-label="Search and commands"><HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} aria-hidden="true" /></button>

        </div>
      </header>
      <main className="neo-mobile-content">
        <div className="neo-mobile-page-heading"><div><span className="neo-mobile-eyebrow">ACE ID / CONSOLE</span><h1>{mobileRouteLabel}</h1></div>{route === "applications" && <button className="neo-mobile-create" onClick={openCreateApplication} aria-label="Create application">+</button>}</div>
        {authLoading ? <div className="neo-state"><span className="neo-spinner" aria-hidden="true" /><strong>Connecting to Ace ID</strong><span>Checking the current session.</span></div> : authError ? <div className="neo-state neo-state-error" role="alert"><strong>Console connection failed</strong><span>{authError}</span><button className="neo-button neo-button-secondary" onClick={() => void bootstrap()}>Retry</button></div> : <div className="neo-mobile-view">
          {route === "overview" && <Overview applications={applications} quota={quota} entitlements={entitlements} signedIn={Boolean(user)} showTips={showTips} onApplications={() => navigate("applications")} onActivity={() => navigate("activity")} onSettings={() => navigate("settings")} onCreate={openCreateApplication} />}
          {route === "applications" && <Applications applications={applications} loading={applicationsLoading} error={applicationsError} signedIn={Boolean(user)} onRetry={() => void loadApplications()} onCreate={openCreateApplication} onOpen={setSelectedApplication} />}
          {route === "analytics" && <Analytics />}
          {route === "activity" && <Activity />}
          {route === "users" && <Users />}
          {route === "settings" && <Settings />}
        </div>}
      </main>
      <nav className="neo-mobile-tabbar" aria-label="Mobile navigation">
        {([{id:"overview",label:"Home",icon:Home01Icon},{id:"applications",label:"Apps",icon:Grid2X2Icon},{id:"analytics",label:"Analytics",icon:Analytics01Icon},{id:"activity",label:"Activity",icon:Activity01Icon},{id:"settings",label:"Settings",icon:Settings01Icon}] as {id:RouteId;label:string;icon:typeof Home01Icon}[]).map(item => <button key={item.id} className={route === item.id ? "is-active" : ""} aria-current={route === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.7} aria-hidden="true" /><small>{item.label}</small></button>)}
        <div className="neo-account-control neo-mobile-account-slot">
          <DropdownMenu.Root open={accountMenuOpen} onOpenChange={setAccountMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button className={`neo-mobile-profile ${accountMenuOpen ? "is-open" : ""}`} aria-label="Open profile menu" aria-haspopup="menu">
                <IdentityAvatar src={user?.picture || user?.avatar_url} name={userName} className="neo-mobile-profile-avatar" imageClassName="neo-mobile-profile-image" fallbackClassName="neo-mobile-profile-fallback" />
                <small>Profile</small>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="neo-account-menu" aria-label="Account menu" side="top" align="end" sideOffset={12} collisionPadding={12}>
                <div className="neo-account-summary"><strong>{userName || "Account"}</strong><small>Signed in with Ace ID</small></div>
                <DropdownMenu.Item className="neo-account-menu-item" asChild><a href="https://identity.ace-base.cc/account"><HugeiconsIcon icon={Settings01Icon} size={17} aria-hidden="true" />Account <span aria-hidden="true">↗</span></a></DropdownMenu.Item>
                <DropdownMenu.Separator className="neo-account-separator" />
                <DropdownMenu.Item className="neo-account-menu-item" disabled={logoutBusy} onSelect={() => { void signOut(); }}><HugeiconsIcon icon={Logout01Icon} size={17} aria-hidden="true" />{logoutBusy ? "Signing out…" : "Sign out"}</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>
    </div>}
    <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    <CreateApplicationModal open={createOpen} busy={createBusy} error={createError} onClose={() => !createBusy && setCreateOpen(false)} onCreate={createApplication} />
    <ApplicationDrawer application={selectedApplication} onClose={() => setSelectedApplication(null)} onUpdate={updateApplication} onDelete={deleteApplication} />
  </div>;
}
