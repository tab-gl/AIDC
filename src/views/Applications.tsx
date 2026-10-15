import { useMemo, useState } from "react";
import type { Application } from "../types";
import { AsyncState } from "../components/AsyncState";
import { ApplicationAvatar } from "../components/ApplicationAvatar";

type Props = {
  applications: Application[];
  loading: boolean;
  error: string | null;
  signedIn: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onOpen: (application: Application) => void;
};

export function Applications({ applications, loading, error, signedIn, onRetry, onCreate, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return applications;
    return applications.filter((app) => [app.name, app.description, app.origin_url, app.id]
      .some((value) => String(value || "").toLocaleLowerCase().includes(needle)));
  }, [applications, query]);

  return (
    <div className="neo-page">
      <section className="neo-section-heading">
        <div>
          <span className="neo-kicker">Workspace / Identity clients</span>
          <h2>Applications</h2>
          <p>Manage OAuth and OpenID Connect clients, redirect URIs, credentials, and branding.</p>
        </div>
        <div className="neo-heading-actions">
          <span className="neo-chip">{applications.length} total</span>
          {signedIn && <button className="neo-button neo-button-primary" onClick={onCreate}>+ Create application</button>}
        </div>
      </section>

      {applications.length > 0 && <div className="neo-filter-bar" role="search">
        <label className="neo-filter-input">
          <span aria-hidden="true">â</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, origin, description, or ID" aria-label="Search applications" />
        </label>
        <span className="neo-filter-count" aria-live="polite">{filtered.length} of {applications.length} shown</span>
        {query && <button className="neo-button neo-button-secondary" onClick={() => setQuery("")}>Clear</button>}
      </div>}

      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && !applications.length}
        emptyTitle={signedIn ? "Your workspace starts here" : "Sign in to view applications"}
        emptyText={signedIn ? "Create an application to configure its identity client, redirect URIs, and credentials." : "Continue with Ace ID to securely load applications owned by your account."}
        onRetry={onRetry}
      >
        {filtered.length ? <div className="neo-app-list">
          {filtered.map((app) => (
            <article className="neo-app-card" key={app.id}>
              <ApplicationAvatar application={app} />
              <div className="neo-app-main">
                <div className="neo-app-title"><h3>{app.name}</h3><span className="neo-app-kind">OAuth/OIDC client</span></div>
                <p>{app.description || "Add a description to help your team recognize this client."}</p>
                <small>{app.origin_url || "Origin URL not configured"}</small>
              </div>
              <button className="neo-button neo-button-secondary" onClick={() => onOpen(app)} aria-label={`Open settings for ${app.name}`}>Manage <span aria-hidden="true">â</span></button>
            </article>
          ))}
        </div> : applications.length > 0 && <div className="neo-empty-search"><strong>No applications match â{query}â</strong><p>Try another name, origin URL, or client ID.</p><button className="neo-button neo-button-secondary" onClick={() => setQuery("")}>Clear search</button></div>}
      </AsyncState>
    </div>
  );
}
