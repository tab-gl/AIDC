import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Grid2X2Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TopNav } from "@astryxdesign/core/TopNav";
import { VStack } from "@astryxdesign/core/VStack";

export const DOCS_URL = "https://docs.ace-base.cc/projects/aidc";
const FEATURES = [
  { icon: Grid2X2Icon, kicker: "01 / Configure", title: "Application control", text: "Manage clients, redirect URIs, scopes, credentials, and application settings from one workspace." },
  { icon: Settings01Icon, kicker: "02 / Connect", title: "Standards, not shortcuts", text: "Work with OAuth 2.0 and OpenID Connect flows through a clear, focused configuration surface." },
  { icon: Activity01Icon, kicker: "03 / Observe", title: "Visibility when it counts", text: "Review authentication activity and operational signals without losing sight of the application." }
];

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  return <div className="landing">
    <TopNav label="Primary" heading={<HStack gap={2} vAlign="center"><img src="/assets/icon.png" alt="" width={28} height={28} /><Text weight="semibold">AIDC</Text><Text type="supporting" color="secondary">Ace Identity Developer Console</Text></HStack>}
      endContent={<HStack gap={3} vAlign="center"><Link href={DOCS_URL}>Documentation</Link><Button label="Continue with Ace ID" variant="primary" onClick={onSignIn} /></HStack>} />
    <main>
      <VStack gap={5} hAlign="start" className="landing-hero">
        <Text type="label" color="secondary">Identity control, clearly</Text>
        <Heading level={1} type="display-1">Identity infrastructure. Without the noise.</Heading>
        <Text type="large" color="secondary" className="landing-lede">One focused workspace for the apps connected to Ace ID. Configure clients, manage credentials, and understand authentication at a glance.</Text>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Button label="Continue with Ace ID" variant="primary" size="lg" onClick={onSignIn} />
          <Button label="Read the documentation" size="lg" href={DOCS_URL} />
        </HStack>
        <Text type="supporting" color="secondary">Ace ID handles identity. AIDC handles your apps.</Text>
      </VStack>
      <section aria-labelledby="capabilities" className="landing-section">
        <VStack gap={2} className="landing-intro">
          <Heading level={2} type="display-2" id="capabilities">Everything your app needs. Nothing pretending to be you.</Heading>
          <Text color="secondary">AIDC manages app configuration. Ace ID remains the identity provider. That boundary is deliberate.</Text>
        </VStack>
        <Grid columns={{ minWidth: 260, max: 3, repeat: "fit" }} gap={4}>
          {FEATURES.map((f) => <Card key={f.title} padding={5}><VStack gap={2}>
            <HugeiconsIcon icon={f.icon} size={22} strokeWidth={1.6} aria-hidden="true" />
            <Text type="label" color="secondary">{f.kicker}</Text>
            <Heading level={3}>{f.title}</Heading>
            <Text color="secondary">{f.text}</Text>
          </VStack></Card>)}
        </Grid>
      </section>
      <VStack gap={3} hAlign="center" className="landing-cta">
        <Heading level={2} type="display-2">Ship the app. Trust the identity layer.</Heading>
        <Button label="Enter the console" variant="primary" size="lg" onClick={onSignIn} />
      </VStack>
    </main>
    <footer className="landing-footer"><Text type="supporting" color="secondary">Identity by Ace ID. Application control by AIDC. © {new Date().getFullYear()} The Ace Base</Text></footer>
  </div>;
}
