import { useEffect, useRef, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { StackItem } from "@astryxdesign/core/Stack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { ErrorBanner, LoadingState, PageHeader } from "../ui/blocks";
import { PixelIcon } from "../ui/PixelIcon";
import type { UserRecord } from "../types";

export function Users() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const search = async (value: string) => {
    const id = ++seq.current;
    setLoading(true); setError("");
    try {
      const result = await api.users.search(value.trim(), 50);
      if (id === seq.current) setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (e) {
      if (id === seq.current) { setUsers([]); setError(e instanceof Error ? e.message : "Could not load users."); }
    } finally { if (id === seq.current) setLoading(false); }
  };
  useEffect(() => { void search(""); return () => { seq.current += 1; }; }, []);

  return <VStack gap={5}>
    <PageHeader eyebrow="Audience" title="Users" description="Find identity users who have consented to an application you own. Results stay scoped to your tenant."
      actions={<Badge label={`${users.length} ${users.length === 1 ? "user" : "users"}`} />} />
    <Card padding={4}><VStack gap={4}>
      <form onSubmit={(e) => { e.preventDefault(); void search(query); }} role="search">
        <HStack gap={2} vAlign="end" wrap="wrap">
          <StackItem size="fill"><TextInput label="Search authorized users" isLabelHidden type="search" startIcon={<PixelIcon name="search" size={18} />} hasClear value={query} onChange={setQuery} placeholder="Search email, username, name, or ID" width="100%" /></StackItem>
          <StackItem size="static"><Button label="Search" type="submit" variant="primary" isLoading={loading} /></StackItem>
        </HStack>
      </form>
      {error ? <ErrorBanner message={error} onRetry={() => void search(query)} /> : loading ? <LoadingState title="Loading authorized users" text="Fetching the latest results from Ace ID." /> : users.length
        ? <VStack gap={0}>{users.map((u) => {
          const name = u.display_name || u.username || "Unnamed user";
          return <Item key={u.id} label={name} description={`${u.email || u.username || u.id} · ${u.email_verified ? "Email verified" : "Email not verified"} · Joined ${new Date(u.created_at).toLocaleDateString()}`}
            startContent={<Avatar name={name} src={u.avatar_url || undefined} size="md" tooltip={false} />}
            endContent={<HStack gap={1}><Badge variant={u.frozen_at ? "error" : "success"} label={u.frozen_at ? "Frozen" : "Active"} />{u.onboarding_completed_at && <Badge label="Onboarded" />}</HStack>} />;
        })}</VStack>
        : <EmptyState isCompact title="No authorized users found" description={query.trim() ? "Try a different search term or clear the search." : "Users appear after they consent to an application you own."}
          actions={query.trim() ? <Button label="Clear search" onClick={() => { setQuery(""); void search(""); }} /> : undefined} />}
    </VStack></Card>
  </VStack>;
}
