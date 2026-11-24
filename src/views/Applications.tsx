import { useMemo, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Item } from "@astryxdesign/core/Item";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Card } from "@astryxdesign/core/Card";
import { AsyncState, PageHeader } from "../ui/blocks";
import { PixelIcon } from "../ui/PixelIcon";
import { APPLICATION_LIMIT } from "../lib/limits";
import type { Application } from "../types";

type Props = { applications: Application[]; loading: boolean; error: string | null; signedIn: boolean; onRetry: () => void; onCreate: () => void; onOpen: (application: Application) => void };

export function Applications({ applications, loading, error, signedIn, onRetry, onCreate, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return applications;
    return applications.filter((app) => [app.name, app.description, app.origin_url, app.id, app.client_id].some((v) => String(v || "").toLocaleLowerCase().includes(needle)));
  }, [applications, query]);

  return <VStack gap={5}>
    <PageHeader eyebrow="Workspace" title="Applications" description="Manage OAuth and OpenID Connect clients, redirect URIs, credentials, and branding."
      actions={<><Badge label={`${applications.length}/${APPLICATION_LIMIT} total`} />{signedIn && <Button label={applications.length >= APPLICATION_LIMIT ? "Limit reached" : "Create application"} variant="primary" onClick={onCreate} isDisabled={loading || Boolean(error) || applications.length >= APPLICATION_LIMIT} />}</>} />
    {applications.length > 0 && <TextInput label="Search applications" isLabelHidden type="search" startIcon={<PixelIcon name="search" size={18} />} hasClear value={query} onChange={setQuery} placeholder="Search by name, origin, description, or ID" />}
    <AsyncState loading={loading} error={error} loadingTitle="Loading applications" onRetry={onRetry} empty={!loading && !error && !applications.length}
      emptyTitle={signedIn ? "Your workspace starts here" : "Sign in to view applications"}
      emptyText={signedIn ? "Create an application to configure its identity client, redirect URIs, and credentials." : "Continue with Ace ID to securely load applications owned by your account."}>
      {filtered.length ? <Card padding={1}><VStack gap={0}>
        {filtered.map((app) => <Item key={app.id} label={app.name} description={app.origin_url || app.description || "Origin URL not configured"}
          startContent={<Avatar name={app.name} shape="rounded" size="md" tooltip={false} />}
          endContent={<Button label="Manage" onClick={() => onOpen(app)} />} />)}
      </VStack></Card>
        : <EmptyState title={`No applications match “${query}”`} description="Try another name, origin URL, or client ID." actions={<Button label="Clear search" onClick={() => setQuery("")} />} />}
    </AsyncState>
  </VStack>;
}
