import { HugeiconsIcon } from "@hugeicons/react";
import { IdentityAvatar } from "./IdentityAvatar";
import { Activity01Icon, Analytics01Icon, Grid2X2Icon, Home01Icon, Logout01Icon, Settings01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { routes, navigate, type RouteId } from "../lib/navigation";
import "./Sidebar.css";
const routeIcons = { overview: Home01Icon, applications: Grid2X2Icon, analytics: Analytics01Icon, activity: Activity01Icon, users: UserIcon, settings: Settings01Icon };
type Props = { route: RouteId; userName?: string; avatarUrl?: string; onSignIn: () => void; onSignOut: () => void; logoutBusy?: boolean };
export function Sidebar({ route, userName, avatarUrl, onSignIn, onSignOut, logoutBusy = false }: Props) {
  return <aside className="neo-sidebar">
    <div className="neo-brand"><img className="neo-mark" src="/assets/icon.png" alt="" width="32" height="32" /><div><strong>AIDC</strong><span>IDENTITY CONSOLE</span></div></div>
    <nav aria-label="Primary navigation" className="neo-nav">
      {routes.map((item) => <button key={item.id} className={route === item.id ? "active" : ""} aria-current={route === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><HugeiconsIcon icon={routeIcons[item.id]} size={18} strokeWidth={1.7} aria-hidden="true" />{item.label}</button>)}
    </nav>
    <div className="neo-sidebar-bottom">
      {userName ? <div className="neo-user"><span className="neo-avatar-frame">
        {<IdentityAvatar src={avatarUrl} name={userName} className="neo-sidebar-avatar" imageClassName="neo-avatar" fallbackClassName="neo-avatar neo-avatar-fallback" />}
      </span><span className="neo-user-copy"><strong>{userName}</strong><small>Signed in</small></span><button className="neo-signout" onClick={onSignOut} disabled={logoutBusy} title="Sign out" aria-label="Sign out"><HugeiconsIcon icon={Logout01Icon} size={17} strokeWidth={1.7} /></button></div> : <button className="neo-button neo-button-primary neo-full" onClick={onSignIn}>Continue with Ace ID</button>}
    </div>
  </aside>;
}
