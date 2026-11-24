import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { ErrorBanner, LoadingState, PageHeader } from "../ui/blocks";
import { Icon } from "../ui/Icon";
import type { UserRecord } from "../types";

const DEBOUNCE_MS = 320;

function joinedLabel(value?: string | null) {
  if (!value) return "Join date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Join date unavailable" : `Joined ${date.toLocaleDateString()}`;
}

export function Users() {
  const [query, setQuery] = useState("");
  // The term whose results are on screen. Keeping it separate from the input lets the list
  // stay useful while a new search is in flight, instead of collapsing into a spinner.
  const [applied, setApplied] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (value: string) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const term = value.trim();
    setApplied(term);
    setLoading(true);
    setError("");
    try {
      const result = await api.users.search(term, 50, controller.signal);
      if (controller.signal.aborted) return;
      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (e) {
      if (controller.signal.aborted || (e as Error | undefined)?.name === "AbortError") return;
      // Keep the previous results visible; only the banner changes.
      setError(e instanceof Error ? e.message : "Could not load users.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { void run(""); return () => abort.current?.abort(); }, [run]);

  // Typing searches after a pause; submitting the form always searches immediately.
  useEffect(() => {
    const term = query.trim();
    if (term === applied) return;
    const timer = window.setTimeout(() => void run(term), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, applied, run]);

  const filtered = users;
  const summary = loading ? "Searching…" : `${filtered.length} ${filtered.length === 1 ? "user" : "users"}`;

  return <VStack gap={5}>
    <PageHeader eyebrow="Audience" title="Users" description="Find identity users who have consented to an application you own. Results stay scoped to your tenant."
      actions={<Badge label={summary} />} />
    <Card padding={4}><VStack gap={4}>
      <form onSubmit={(e) => { e.preventDefault(); void run(query); }} role="search">
        <HStack gap={2} vAlign="end" wrap="wrap">
          <StackItem size="fill"><TextInput label="Search authorized users" isLabelHidden type="search" startIcon={<Icon name="search" size={18} />} hasClear value={query} onChange={setQuery} placeholder="Search email, username, name, or ID" width="100%" /></StackItem>
          <StackItem size="static"><Button label="Search" type="submit" variant="primary" isLoading={loading} /></StackItem>
        </HStack>
      </form>
      {error && <ErrorBanner title="Could not search users" message={error} onRetry={() => void run(query)} />}
      {loading && !filtered.length
        ? <LoadingState title="Loading authorized users" text="Fetching the latest results from Ace ID." />
        : filtered.length
          ? <VStack gap={0} aria-busy={loading || undefined} style={{ opacity: loading ? 0.72 : 1, transition: "opacity .18s ease" }}>{filtered.map((u) => {
            const name = u.display_name || u.username || "Unnamed user";
            const detail = [u.email || u.username || u.id, u.email_verified ? "Email verified" : "Email not verified", joinedLabel(u.created_at)].filter(Boolean).join(" · ");
            return <Item key={u.id} label={name} description={detail}
              startContent={<Avatar name={name} src={u.avatar_url || undefined} size="md" tooltip={false} />}
              endContent={<HStack gap={1}><Badge variant={u.frozen_at ? "error" : "success"} label={u.frozen_at ? "Frozen" : "Active"} />{u.onboarding_completed_at && <Badge label="Onboarded" />}</HStack>} />;
          })}</VStack>
          : <EmptyState isCompact title={applied ? "No authorized users found" : "No users have consented yet"}
            description={applied ? `Nothing matched “${applied}”. Try a different search term or clear the search.` : "Users appear after they consent to an application you own."}
            actions={query.trim() || applied ? <Button label="Clear search" onClick={() => { setQuery(""); void run(""); }} /> : undefined} />}
    </VStack></Card>
  </VStack>;
}
