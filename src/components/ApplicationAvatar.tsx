import { useEffect, useState } from "react";
import type { Application } from "../types";
import { api } from "../lib/api";
import { IdentityAvatar } from "./IdentityAvatar";

type Props = { application: Application };

/** Loads the app's saved Ace ID branding logo and falls back to its initials. */
export function ApplicationAvatar({ application }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLogoUrl(null);
    void api.applications.branding(application.id).then(({ branding }) => {
      if (active) setLogoUrl(branding.logo_url || null);
    }).catch(() => { if (active) setLogoUrl(null); });
    return () => { active = false; };
  }, [application.id]);

  return <IdentityAvatar src={logoUrl} name={application.name} className="neo-app-icon neo-app-logo" imageClassName="neo-app-logo-image" fallbackClassName="neo-app-icon-fallback" />;
}
