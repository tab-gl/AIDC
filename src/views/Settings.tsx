import { useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Code } from "@astryxdesign/core/Code";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Item } from "@astryxdesign/core/Item";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { PageHeader } from "../ui/blocks";
import { defaultPreferences, readPreferences, resetPreferences, savePreferences, type Preferences } from "../lib/prefs";
import type { DiscoveryStatus } from "../types";

export function Settings() {
  const [saved, setSaved] = useState<Preferences>(readPreferences);
  const [prefs, setPrefs] = useState<Preferences>(saved);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryStatus | null>(null);
  const [health, setHealth] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [diagError, setDiagError] = useState("");
  const checkSeq = useRef(0);
  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  const check = async () => {
    const id = ++checkSeq.current;
    setChecking(true); setDiagError("");
    const [identity, service] = await Promise.allSettled([api.integration.discovery(), api.health.get()]);
    if (id !== checkSeq.current) return;
    setDiscovery(identity.status === "fulfilled" ? identity.value : null);
    setHealth(service.status === "fulfilled" ? Boolean(service.value.ok) : null);
    const failed = [identity.status === "rejected" && "Ace ID discovery", service.status === "rejected" && "AIDC API"].filter(Boolean);
    if (failed.length) setDiagError(`Could not check ${failed.join(" and ")}. Please try again.`);
    setChecking(false);
  };
  useEffect(() => { void check(); return () => { checkSeq.current += 1; }; }, []);
  const update = <K extends keyof Preferences>(k: K, v: Preferences[K]) => { setPrefs((p) => ({ ...p, [k]: v })); setNotice(null); };
  const save = () => { const ok = savePreferences(prefs); if (ok) setSaved(prefs); setNotice(ok ? { ok, text: "Preferences saved on this device." } : { ok, text: "Preferences could not be saved in this browser. Check storage permissions and try again." }); };
  const reset = () => { const ok = resetPreferences(); if (ok) { setPrefs(defaultPreferences); setSaved(defaultPreferences); } setNotice(ok ? { ok, text: "Defaults restored." } : { ok, text: "Preferences could not be reset. Check storage permissions and try again." }); };

  return <VStack gap={5}>
    <PageHeader eyebrow="Configuration" title="Settings" description="Personalize the console without changing identity or security configuration."
      actions={<><Button label="Reset" onClick={reset} /><Button label="Save preferences" variant="primary" onClick={save} isDisabled={!dirty} /></>} />
    {notice && <div role={notice.ok ? "status" : "alert"}><Banner status={notice.ok ? "success" : "error"} title={notice.text} isDismissable onDismiss={() => setNotice(null)} /></div>}
    <Grid columns={{ minWidth: 320, max: 3, repeat: "fit" }} gap={4}>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Appearance</Heading>
        <Text color="secondary">Choose the canvas that suits your workspace.</Text>
        <SegmentedControl label="Theme" value={prefs.theme} onChange={(v) => update("theme", v as Preferences["theme"])}>
          <SegmentedControlItem value="system" label="System" /><SegmentedControlItem value="light" label="Light" /><SegmentedControlItem value="dark" label="Dark" />
        </SegmentedControl>
        <Switch label="Reduce motion" description="Respect motion-sensitive preferences." value={prefs.reduceMotion} onChange={(v) => update("reduceMotion", v)} labelPosition="start" labelSpacing="spread" width="100%" />
        <Switch label="Show tips" description="Display contextual guidance when available." value={prefs.showTips} onChange={(v) => update("showTips", v)} labelPosition="start" labelSpacing="spread" width="100%" />
      </VStack></Card>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Integration health</Heading>
        <Text color="secondary">Live checks from the AIDC server. Configuration secrets are never returned to this page.</Text>
        <Item label="AIDC API" description={health === null ? "Unknown" : health ? "Healthy" : "Unavailable"} startContent={<StatusDot variant={health === null ? "neutral" : health ? "success" : "error"} label={health === null ? "Unknown" : health ? "Healthy" : "Unavailable"} />} />
        <Item label="Ace ID discovery" description={discovery?.status || "Unknown"} startContent={<StatusDot variant={discovery?.status === "ready" ? "success" : discovery?.status === "failed" ? "error" : "neutral"} label={discovery?.status || "Unknown"} />} />
        {discovery?.issuer && <Item label="Issuer" description={<Code>{discovery.issuer}</Code>} />}
        {discovery?.lastError && <Banner status="warning" title="Last discovery error" description={discovery.lastError} />}
        {diagError && <Banner status="error" title="Diagnostics failed" description={diagError} />}
        <Button label="Run diagnostics" isLoading={checking} onClick={() => void check()} />
      </VStack></Card>
      <Card padding={4}><VStack gap={2}>
        <Heading level={2}>Ace ID / OIDC</Heading>
        <Text color="secondary">Ace ID owns developer authentication and session issuance. AIDC validates Ace ID sessions and does not issue a separate developer identity.</Text>
        <Text type="label">Server managed</Text>
      </VStack></Card>
    </Grid>
  </VStack>;
}
