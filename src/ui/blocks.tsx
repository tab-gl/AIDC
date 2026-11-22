import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useReducedMotion } from "../lib/prefs";

// App-level compositions built from Astryx primitives. No hand-rolled controls live here:
// switches, progress and loading indicators come from @astryxdesign/core and @m3e/web.

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
    <VStack gap={1}>
      <Text type="label" color="secondary">{eyebrow}</Text>
      <Heading level={1} type="display-3">{title}</Heading>
      {description && <Text color="secondary">{description}</Text>}
    </VStack>
    {actions && <HStack gap={2} vAlign="center" wrap="wrap">{actions}</HStack>}
  </HStack>;
}

export function Metric({ label, value, hint, children }: { label: string; value: ReactNode; hint?: string; children?: ReactNode }) {
  return <Card padding={4}>
    <VStack gap={1}>
      <Text type="label" color="secondary">{label}</Text>
      <Text type="display-2" weight="semibold">{value}</Text>
      {hint && <Text type="supporting" color="secondary">{hint}</Text>}
      {children}
    </VStack>
  </Card>;
}

export function LoadingState({ title = "Loading", text }: { title?: string; text?: string }) {
  const reducedMotion = useReducedMotion();
  return <VStack gap={2} hAlign="center" paddingBlock={8} role="status" aria-live="polite" aria-label={title}>
    <m3e-loading-indicator pull-progress={reducedMotion ? 0 : undefined} aria-hidden="true" />
    <Text weight="semibold">{title}</Text>
    {text && <Text type="supporting" color="secondary">{text}</Text>}
  </VStack>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Banner status="error" title="Something went wrong" description={message} endContent={onRetry && <Button label="Retry" onClick={onRetry} />} />;
}

/** Loading → error → empty → content, in one place. */
export function AsyncState({ loading, error, empty, emptyTitle = "Nothing here yet", emptyText = "There is no data to display.", loadingTitle, onRetry, children }: { loading: boolean; error?: string | null; empty?: boolean; emptyTitle?: string; emptyText?: string; loadingTitle?: string; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <LoadingState title={loadingTitle} text="Fetching the latest data." />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle} description={emptyText} />;
  return <>{children}</>;
}

export const eventLabel = (type: string) => type.replace(/[._]/g, " ");
export function eventDetail(metadata?: Record<string, unknown> | null) {
  return metadata && Object.keys(metadata).length ? Object.entries(metadata).slice(0, 3).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") : "";
}
