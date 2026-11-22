import { useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { Item } from "@astryxdesign/core/Item";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { copyText } from "../lib/copy";
import type { Application, RedirectUri } from "../types";

type Preset = "react-vite" | "nextjs" | "vanilla" | "mobile";
const PRESETS = [{ value: "react-vite", label: "React + Vite" }, { value: "nextjs", label: "Next.js" }, { value: "vanilla", label: "Vanilla web" }, { value: "mobile", label: "Mobile client" }];

export function ClientPresetGuide({ application, redirects, scopes, onStatus }: { application: Application; redirects: RedirectUri[]; scopes: string[]; onStatus: (message: string, ok: boolean) => void }) {
  const [preset, setPreset] = useState<Preset>("react-vite");
  const origin = application.origin_url?.replace(/\/$/, "") || "";
  const redirect = useMemo(() => preset === "mobile" ? "YOUR_APP_SCHEME://oauth/callback" : (origin || "https://app.example.com") + (preset === "nextjs" ? "/api/auth/callback/ace-id" : "/auth/callback"), [preset, origin]);
  const snippet = useMemo(() => {
    const clientId = application.client_id || "YOUR_CLIENT_ID";
    if (preset === "react-vite") return `# VITE_ values are public. Use Authorization Code + PKCE.\nVITE_ACE_ID_CLIENT_ID=${clientId}\nVITE_ACE_ID_REDIRECT_URI=${redirect}\n# Never put a client secret in Vite variables.`;
    if (preset === "nextjs") return `# Server-only variables; never prefix secrets with NEXT_PUBLIC_.\nACE_ID_CLIENT_ID=${clientId}\nACE_ID_CALLBACK_URL=${redirect}\nACE_ID_CLIENT_SECRET=<server-only secret>\n# Validate state, PKCE, issuer, audience and callback errors.`;
    if (preset === "vanilla") return `const clientId = "${clientId}";\nconst redirectUri = "${redirect}";\n// Authorization Code + PKCE. Never embed a client secret.`;
    return `clientId: "${clientId}"\nredirectUri: "${redirect}"\n// Use the system browser + Authorization Code + PKCE.\n// Register a reverse-domain scheme or verified app link.`;
  }, [application.client_id, preset, redirect]);
  const httpsOrigin = useMemo(() => {
    try { const u = new URL(origin); const h = u.hostname.toLowerCase().replace(/\.$/, ""); return u.protocol === "https:" && !!h && h !== "example.com" && !h.endsWith(".example.com"); } catch { return false; }
  }, [origin]);
  const checks = [
    { label: "Production origin uses HTTPS", ok: httpsOrigin },
    { label: "Callback URI registered exactly", ok: redirects.some((r) => r.uri === redirect) },
    { label: "openid scope enabled", ok: scopes.includes("openid") },
    { label: "Client type and redirect flow reviewed", ok: false },
    { label: "Callback handles state, PKCE and provider errors", ok: false }
  ];
  const copy = (value: string, done: string, fail: string) => void copyText(value).then((ok) => onStatus(ok ? done : fail, ok));

  return <VStack gap={4}>
    <Text color="secondary">Generate a starter configuration for your client stack. Confirm the actual issuer and callback route before launch.</Text>
    <Selector label="Client preset" options={PRESETS} value={preset} onChange={(v) => v && setPreset(v as Preset)} />
    <Heading level={3}>Redirect URI</Heading>
    <CodeBlock code={redirect} language="text" />
    <Button label="Copy redirect URI" onClick={() => copy(redirect, "Redirect URI copied.", "Clipboard unavailable. Select and copy the URI manually.")} />
    <Heading level={3}>Environment starter</Heading>
    <CodeBlock code={snippet} language="bash" />
    <Button label="Copy setup" onClick={() => copy(snippet, "Setup snippet copied.", "Clipboard unavailable. Select and copy the snippet manually.")} />
    <Heading level={3}>Pre-launch checklist</Heading>
    <VStack gap={0}>{checks.map((c) => <Item key={c.label} label={c.label} startContent={<StatusDot variant={c.ok ? "success" : "warning"} label={c.ok ? "Ready" : "Needs review"} />} description={c.ok ? "Ready" : "Review"} />)}</VStack>
    <Text type="supporting" color="secondary">Review items need manual or integration-level verification. This guide does not test an external callback.</Text>
  </VStack>;
}
