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
import { Toggle } from "../ui/Toggle";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { api } from "../lib/api";
import { PageHeader } from "../ui/blocks";
import { defaultPreferences, readPreferences, savePreferences, type Preferences } from "../lib/prefs";
import type { DiscoveryStatus } from "../types";

type Draft = { base: Preferences; values: Preferences };
const same = (a: Preferences, b: Preferences) => JSON.stringify(a) === JSON.stringify(b);

export function Settings({ saved, draft, onDraftChange }: { saved: Preferences; draft: Draft | null; onDraftChange: (draft: Draft | null) => void }) {
  const prefs = draft?.values ?? saved;
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryStatus | null>(null);
  const [health, setHealth] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [diagError, setDiagError] = useState("");
  const checkSeq = useRef(0);
  const dirty = draft !== null;
  const conflict = draft !== null && !same(draft.base, saved);

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
  const stage = (values: Preferences) => {
    const base = draft?.base ?? saved;
    onDraftChange(same(values, base) && same(base, saved) ? null : { base, values });
    setNotice(null);
  };
  const update = <K extends keyof Preferences>(k: K, v: Preferences[K]) => stage({ ...prefs, [k]: v });
  const save = () => {
    if (!draft) return;
    // A storage event may not have arrived yet; never silently overwrite another tab.
    if (!same(draft.base, readPreferences())) {
      setNotice({ ok: false, text: "Preferences changed in another tab. Revert to the latest saved preferences before editing again." });
      return;
    }
    if (savePreferences(draft.values)) {
      onDraftChange(null);
      setNotice({ ok: true, text: "Preferences saved on this device." });
    } else setNotice({ ok: false, text: "Preferences could not be saved in this browser. Your changes are still here; check storage permissions and try again." });
  };
  const revert = () => { onDraftChange(null); setNotice({ ok: true, text: "Changes reverted to the latest saved preferences." }); };
  const reset = () => stage({ ...defaultPreferences });

  return <VStack gap={5}>
    <PageHeader eyebrow="Configuration" title="Settings" description="Personalize this browser without changing identity or security configuration. Changes apply after syncing to this device."
      actions={<><Button label="Restore defaults" onClick={reset} /><Button label="Revert changes" onClick={revert} isDisabled={!dirty} /><Button label="Sync preferences" variant="primary" onClick={save} isDisabled={!dirty || conflict} /></>} />
    <div className="settings-status" role="status" aria-live="polite"><span className={`settings-status-dot${dirty ? " is-dirty" : ""}`} aria-hidden="true" />{conflict ? "Saved preferences changed in another tab. Revert to the latest version to continue." : dirty ? "Unsynced changes · retained while you navigate" : "Up to date on this device"}</div>
    {notice && <div role={notice.ok ? "status" : "alert"}><Banner status={notice.ok ? "success" : "error"} title={notice.text} isDismissable onDismiss={() => setNotice(null)} /></div>}
    <Grid columns={{ minWidth: 320, max: 3, repeat: "fit" }} gap={4}>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Appearance</Heading>
        <Text color="secondary">Choose the canvas that suits your workspace.</Text>
        <SegmentedControl label="Theme" value={prefs.theme} onChange={(v) => update("theme", v as Preferences["theme"])}>
          <SegmentedControlItem value="system" label="System" /><SegmentedControlItem value="light" label="Light" /><SegmentedControlItem value="dark" label="Dark" />
        </SegmentedControl>
        <SegmentedControl label="Material contrast" value={prefs.contrast} onChange={(v) => update("contrast", v as Preferences["contrast"])}>
          <SegmentedControlItem value="standard" label="Standard" /><SegmentedControlItem value="medium" label="Medium" /><SegmentedControlItem value="high" label="High" />
        </SegmentedControl>
        <Text type="supporting" color="secondary">Adjusts contrast for Material components.</Text>
        <SegmentedControl label="Text size" value={prefs.textSize} onChange={(v) => update("textSize", v as Preferences["textSize"])}>
          <SegmentedControlItem value="standard" label="Standard" /><SegmentedControlItem value="large" label="Large" />
        </SegmentedControl>
        <Toggle label="Reduce motion" description="Respect motion-sensitive preferences." value={prefs.reduceMotion} onChange={(v) => update("reduceMotion", v)} />
        <Toggle label="Show tips" description="Display contextual guidance when available." value={prefs.showTips} onChange={(v) => update("showTips", v)} />
      </VStack></Card>
      <Card padding={4}><VStack gap={3}>
        <Heading level={2}>Console behavior</Heading>
        <Text color="secondary">Choose defaults for your workspace on this device.</Text>
        <SegmentedControl label="Default reporting range" value={String(prefs.defaultRange)} onChange={(v) => update("defaultRange", Number(v) as Preferences["defaultRange"])}>
          <SegmentedControlItem value="7" label="7 days" /><SegmentedControlItem value="14" label="14 days" /><SegmentedControlItem value="30" label="30 days" />
        </SegmentedControl>
        <Text type="supporting" color="secondary">Used when opening Activity or Analytics. You can still change the range there.</Text>
        <Toggle label="Haptic feedback" description="Brief vibration for supported devices after successful application changes." value={prefs.hapticFeedback} onChange={(v) => update("hapticFeedback", v)} />
      </VStack></Card>
      <VStack gap={4}>
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
        <Heading level={2}>Ace ID @ OIDC</Heading>
        <Text color="secondary">Ace ID owns developer authentication and session issuance. AIDC validates Ace ID sessions and does not issue a separate developer identity.</Text>
        <Text type="label">Server managed</Text>
      </VStack></Card>
      </VStack>
    </Grid>
  </VStack>;
}
