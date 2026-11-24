import { useMemo, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Card } from "@astryxdesign/core/Card";
import { ErrorBanner, LoadingState, PageHeader } from "../ui/blocks";
import { PixelIcon } from "../ui/PixelIcon";
import { APPLICATION_LIMIT } from "../lib/limits";
import type { Application } from "../types";

type Props = { applications: Application[]; loading: boolean; error: string | null; signedIn: boolean; onRetry: () => void; onCreate: () => void; onOpen: (application: Application) => void };

const normalize = (value: unknown) => String(value ?? "").toLocaleLowerCase();

export function Applications({ applications, loading, error, signedIn, onRetry, onCreate, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const needle = normalize(query.trim());
  const filtered = useMemo(() => {
    if (!needle) return applications;
    return applications.filter((app) => [app.name, app.description, app.origin_url, app.id, app.client_id].some((value) => normalize(value).includes(needle)));
  }, [applications, needle]);

  const atLimit = applications.length >= APPLICATION_LIMIT;
  // While a refresh is in flight the current rows stay readable and simply dim; a failed
  // refresh is reported above them instead of replacing the workspace with an error page.
  const revalidating = loading && applications.length > 0;

  return <VStack gap={5}>
    <PageHeader eyebrow="Workspace" title="Applications" description="Manage OAuth and OpenID Connect clients, redirect URIs, credentials, and branding."
      actions={<><Badge label={loading && !applications.length ? "Counting…" : `${applications.length}/${APPLICATION_LIMIT} total`} /><Button label="Refresh" onClick={onRetry} isLoading={revalidating} isDisabled={loading} />{signedIn && <Button label={atLimit ? "Limit reached" : "Create application"} variant="primary" onClick={onCreate} isDisabled={loading || Boolean(error) || atLimit} />}</>} />
    {applications.length > 0 && <TextInput label="Search applications" isLabelHidden type="search" startIcon={<PixelIcon name="search" size={18} />} hasClear value={query} onChange={setQuery} placeholder="Search by name, origin, description, or ID" />}
    {error && <ErrorBanner title="Applications could not be refreshed" message={error} onRetry={onRetry} />}
    {needle && applications.length > 0 && <Text type="supporting" color="secondary" aria-live="polite">{filtered.length} of {applications.length} applications match “{query.trim()}”.</Text>}

    {loading && !applications.length
      ? <LoadingState title="Loading applications" text="Fetching the latest data." />
      : !applications.length
        ? error ? null : <EmptyState title={signedIn ? "Your workspace starts here" : "Sign in to view applications"}
          description={signedIn ? "Create an application to configure its identity client, redirect URIs, and credentials." : "Continue with Ace ID to securely load applications owned by your account."}
          actions={signedIn && !error ? <Button label="Create application" variant="primary" onClick={onCreate} /> : undefined} />
        : filtered.length
          ? <Card padding={1}><VStack gap={0} aria-busy={revalidating || undefined} style={{ opacity: revalidating ? 0.72 : 1, transition: "opacity .18s ease" }}>
            {filtered.map((app) => <Item key={app.id} label={app.name}
              description={<>{app.origin_url || "Origin URL not configured"}{app.description ? ` · ${app.description}` : ""}</>}
              startContent={<Avatar name={app.name} shape="rounded" size="md" tooltip={false} />}
              endContent={<HStack gap={2} vAlign="center">
                {app.status && <Badge variant={app.status === "active" ? "success" : "neutral"} label={app.status} />}
                <Button label="Manage" onClick={() => onOpen(app)} />
              </HStack>} />)}
          </VStack></Card>
          : <EmptyState title={`No applications match “${query.trim()}”`} description="Try another name, origin URL, or client ID."
            actions={<Button label="Clear search" onClick={() => setQuery("")} />} />}
  </VStack>;
}
