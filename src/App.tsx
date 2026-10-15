import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BlurFade } from "./components/magicui/blur-fade";
import BlurText from "./components/reactbits/BlurText";
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
  return <main className="fresh-landing">
    <nav className="fresh-nav" aria-label="Main navigation">
      <a className="fresh-brand" href="/" aria-label="AIDC home">
        <span className="fresh-brand-mark">A</span>
        <span className="fresh-brand-copy"><strong>AIDC</strong><small>ACE IDENTITY DEVELOPER CONSOLE</small></span>
      </a>
      <div className="fresh-nav-links">
        <a href="#capabilities">Capabilities</a>
        <a href="https://docs.ace-base.cc/projects/aidc">Documentation <span aria-hidden="true">↗</span></a>
      </div>
      <button className="fresh-nav-cta" onClick={onSignIn}>Continue with Ace ID <span aria-hidden="true">↗</span></button>
    </nav>

    <section className="fresh-hero">
      <div className="fresh-hero-copy">
        <div className="fresh-eyebrow"><span className="fresh-status-dot" /> IDENTITY CONTROL, CLEARLY</div>
        <BlurFade delay={0.08} duration={0.55}><h1>Identity infrastructure.<br /><em>Without the noise.</em></h1></BlurFade>
        <BlurText text="One focused workspace for the apps connected to Ace ID. Configure clients, manage credentials, and understand authentication at a glance." className="fresh-hero-lede fresh-reactbits-blur" animateBy="words" direction="top" delay={24} stepDuration={0.3} blur={7} distance={18} trigger="view" threshold={0.15} />
        <div className="fresh-hero-actions">
          <button className="fresh-primary" onClick={onSignIn}>Continue with Ace ID <span aria-hidden="true">↗</span></button>
          <a className="fresh-text-link" href="https://docs.ace-base.cc/projects/aidc">Read the documentation <span aria-hidden="true">→</span></a>
        </div>
        <div className="fresh-assurance"><HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.7} aria-hidden="true" /><span>Ace ID handles identity.</span><i /> <span>AIDC handles your apps.</span></div>
      </div>

      <div className="fresh-preview" aria-label="Preview of the AIDC developer console">
        <div className="fresh-preview-top">
          <div className="fresh-preview-brand"><span className="fresh-preview-mark">A</span><span><b>Workspace</b><small>DEVELOPER CONSOLE</small></span></div>
          <span className="fresh-preview-live"><i /> Operational</span>
        </div>
        <div className="fresh-preview-heading"><div><small>YOUR WORKSPACE</small><h2>Applications</h2></div><span className="fresh-preview-count">03</span></div>
        <div className="fresh-preview-apps">
          <div className="fresh-preview-app"><span className="fresh-app-glyph">N</span><span><b>Northstar Web</b><small>Production client</small></span><i>Active</i></div>
          <div className="fresh-preview-app"><span className="fresh-app-glyph fresh-app-glyph-two">S</span><span><b>Studio Mobile</b><small>Native application</small></span><i>Active</i></div>
          <div className="fresh-preview-app"><span className="fresh-app-glyph fresh-app-glyph-three">D</span><span><b>Dev Workspace</b><small>Development client</small></span><i>Test</i></div>
        </div>
        <div className="fresh-preview-foot"><span><HugeiconsIcon icon={Activity01Icon} size={15} strokeWidth={1.8} aria-hidden="true" /> OAuth / OIDC</span><span>PKCE enabled</span></div>
        <div className="fresh-preview-side-note"><span className="fresh-note-icon"><HugeiconsIcon icon={Analytics01Icon} size={17} strokeWidth={1.7} /></span><span><b>Clear by design</b><small>Configuration, activity, and health in one place.</small></span></div>
      </div>
      <div className="fresh-hero-meta"><span>01 / DEVELOPER PLATFORM</span><span>BUILT FOR THE DETAILS <span aria-hidden="true">↘</span></span></div>
    </section>

    <section className="fresh-capabilities" id="capabilities">
      <div className="fresh-section-heading"><div><span className="fresh-eyebrow">ONE CONSOLE. CLEAR CONTROL.</span><h2>Everything your app needs.<br /><em>Nothing pretending to be you.</em></h2></div><p>AIDC manages app configuration. Ace ID remains the identity provider. That boundary is deliberate.</p></div>
      <BlurFade delay={0.08} duration={0.55} inView>
      <div className="fresh-feature-grid">
        <article className="fresh-feature"><span className="fresh-feature-icon"><HugeiconsIcon icon={Grid2X2Icon} size={21} strokeWidth={1.6} /></span><small>01 / CONFIGURE</small><h3>Application control</h3><p>Manage clients, redirect URIs, scopes, credentials, and application settings from one workspace.</p><a href="https://docs.ace-base.cc/projects/aidc">Explore applications <span aria-hidden="true">↗</span></a></article>
        <article className="fresh-feature"><span className="fresh-feature-icon"><HugeiconsIcon icon={Settings01Icon} size={21} strokeWidth={1.6} /></span><small>02 / CONNECT</small><h3>Standards, not shortcuts</h3><p>Work with OAuth 2.0 and OpenID Connect flows through a clear, focused configuration surface.</p><a href="https://docs.ace-base.cc/projects/aidc">Understand the setup <span aria-hidden="true">↗</span></a></article>
        <article className="fresh-feature"><span className="fresh-feature-icon"><HugeiconsIcon icon={Activity01Icon} size={21} strokeWidth={1.6} /></span><small>03 / OBSERVE</small><h3>Visibility when it counts</h3><p>Review authentication activity and operational signals without losing sight of the application.</p><a href="https://docs.ace-base.cc/projects/aidc">Explore observability <span aria-hidden="true">↗</span></a></article>
      </div>
      </BlurFade>
    </section>

    <section className="fresh-bottom-cta"><div><span className="fresh-eyebrow">YOUR WORKSPACE STARTS HERE</span><h2>Ship the app.<br /><em>Trust the identity layer.</em></h2></div><button className="fresh-primary" onClick={onSignIn}>Enter the console <span aria-hidden="true">↗</span></button></section>
    <footer className="fresh-footer"><a className="fresh-brand" href="/"><span className="fresh-brand-mark">A</span><span className="fresh-brand-copy"><strong>AIDC</strong><small>THE ACE BASE</small></span></a><span>Identity by Ace ID. Application control by AIDC.</span><a href="https://docs.ace-base.cc/projects/aidc">Documentation ↗</a><small>© {new Date().getFullYear()} The Ace Base</small></footer>
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
