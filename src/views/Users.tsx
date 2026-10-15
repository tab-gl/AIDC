import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { UserRecord } from "../types";

export function Users() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const search = async (value = query) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await api.users.search(value.trim(), 50);
      if (requestId !== requestSequence.current) return;
      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e instanceof Error ? e.message : "Could not load users.");
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    void search("");
    return () => { requestSequence.current += 1; };
  }, []);

  return <div className="neo-page">
    <section className="neo-section-heading">
      <div><span className="neo-kicker">Audience / Consent-based access</span><h2>Users</h2><p>Find identity users who have consented to an application you own. Results remain scoped to your authorized tenant.</p></div>
      <span className="neo-status-pill">{users.length} {users.length === 1 ? "user" : "users"}</span>
    </section>
    <section className="neo-panel">
      <form className="neo-users-search" role="search" onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} placeholder="Search email, username, name, or ID" aria-label="Search authorized users" />
        <button className="neo-button neo-button-primary" disabled={loading}>{loading ? "Searching…" : "Search users"}</button>
      </form>
      {error && <div className="neo-form-error" role="alert">{error} <button type="button" className="neo-button neo-button-secondary" onClick={() => void search()}>Retry</button></div>}
      {loading ? <div className="neo-state" aria-live="polite"><span className="neo-spinner" aria-hidden="true"/><strong>Loading authorized users</strong><span>Fetching the latest results from Ace ID.</span></div> : users.length ? <div className="neo-user-table" aria-live="polite">{users.map((user) => <article key={user.id} className="neo-user-row"><span className="neo-avatar" aria-hidden="true">{(user.display_name || user.username || user.email || "U").charAt(0).toUpperCase()}</span><div className="neo-user-identity"><strong>{user.display_name || user.username || "Unnamed user"}</strong><span>{user.email || user.username || user.id}</span><small>{user.email_verified ? "Email verified" : "Email not verified"} · Joined {new Date(user.created_at).toLocaleDateString()}</small></div><div className="neo-user-flags">{user.frozen_at ? <span className="neo-status-pill is-revoked">Frozen</span> : <span className="neo-status-pill">Active</span>}{user.onboarding_completed_at && <span className="neo-status-pill">Onboarded</span>}</div></article>)}</div> : <div className="neo-state"><span className="neo-empty-icon" aria-hidden="true">⌕</span><strong>No authorized users found</strong><span>{query.trim() ? "Try a different search term or clear the search." : "Users appear after they consent to an application you own."}</span>{query.trim() && <button className="neo-button neo-button-secondary" onClick={() => { setQuery(""); void search(""); }}>Clear search</button>}</div>}
    </section>
  </div>;
}
