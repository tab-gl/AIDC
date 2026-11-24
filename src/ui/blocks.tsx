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
// progress and loading indicators come from @astryxdesign/core and @m3e/web; the switches
// and tabs now come from glisse (see src/ui/Toggle.tsx and GlassTabs.tsx).

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap" className="console-page-header">
    <VStack gap={1}>
      <Text type="label" color="secondary" className="console-eyebrow">{eyebrow}</Text>
      <Heading level={1} type="display-3">{title}</Heading>
      {description && <Text color="secondary">{description}</Text>}
    </VStack>
    {actions && <HStack gap={2} vAlign="center" wrap="wrap">{actions}</HStack>}
  </HStack>;
}

export function Metric({ label, value, hint, children }: { label: string; value: ReactNode; hint?: string; children?: ReactNode }) {
  return <Card padding={4} className="console-metric">
    <VStack gap={1}>
      <Text type="label" color="secondary" className="console-eyebrow">{label}</Text>
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

export function ErrorBanner({ message, title = "Something went wrong", onRetry }: { message: string; title?: string; onRetry?: () => void }) {
  return <Banner status="error" title={title} description={message} endContent={onRetry ? <Button label="Retry" onClick={onRetry} /> : undefined} />;
}

/** Loading → error → empty → content, in one place. */
export function AsyncState({ loading, error, empty, emptyTitle = "Nothing here yet", emptyText = "There is no data to display.", loadingTitle, onRetry, children }: { loading: boolean; error?: string | null; empty?: boolean; emptyTitle?: string; emptyText?: string; loadingTitle?: string; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <LoadingState title={loadingTitle} text="Fetching the latest data." />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle} description={emptyText} />;
  return <>{children}</>;
}

// Event types arrive as machine identifiers (`login.success`, `credential.rotated`). Show them
// as a readable sentence instead of leaking the wire format into the UI.
const EVENT_WORDS: Record<string, string> = {
  oidc: "OIDC", oauth: "OAuth", mfa: "MFA", totp: "TOTP", api: "API",
  jwt: "JWT", jwks: "JWKS", sso: "SSO", uri: "URI", urls: "URLs", id: "ID"
};
export function eventLabel(type: string) {
  const words = String(type || "")
    .replace(/[._\-/]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => EVENT_WORDS[word.toLowerCase()] ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
  return words.length ? words.join(" ") : "Event";
}

const detailValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    try { return JSON.stringify(value).slice(0, 120); } catch { return "—"; }
  }
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

export function eventDetail(metadata?: Record<string, unknown> | null) {
  if (!metadata) return "";
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== "");
  return entries.slice(0, 3).map(([key, value]) => `${eventLabel(key)}: ${detailValue(value)}`).join(" · ");
}
