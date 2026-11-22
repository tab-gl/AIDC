import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TopNav } from "@astryxdesign/core/TopNav";

export const DOCS_URL = "https://docs.ace-base.cc/projects/aidc";
const FEATURES = [
  { number: "01", kicker: "Configure", title: "Application control", text: "Manage clients, redirect URIs, scopes, credentials, and application settings from one workspace." },
  { number: "02", kicker: "Connect", title: "Standards, not shortcuts", text: "Work with OAuth 2.0 and OpenID Connect flows through a clear, focused configuration surface." },
  { number: "03", kicker: "Observe", title: "Visibility when it counts", text: "Review authentication activity and operational signals without losing sight of the application." }
];

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  return <div className="landing">
    <TopNav className="landing-nav" label="Primary" heading={<HStack gap={2} vAlign="center" className="landing-brand">
      <img src="/assets/icon.png" alt="" width={32} height={32} />
      <Text weight="semibold">AIDC</Text>
      <span className="landing-brand-description">Ace Identity Developer Console</span>
    </HStack>} endContent={<HStack gap={3} vAlign="center">
      <span className="landing-nav-docs"><Link href={DOCS_URL}>Documentation</Link></span>
      <Button label="Sign in" variant="primary" onClick={onSignIn} />
    </HStack>} />
    <main className="landing-main">
      <div className="landing-masthead" aria-label="The Ace Base, identity tools">
        <span>The Ace Base <span aria-hidden="true">/</span> Identity tools</span>
        <span>For developers, by design</span>
      </div>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span className="landing-eyebrow-dot" aria-hidden="true" /> Identity control, clearly</p>
          <Heading level={1} type="display-1" id="landing-title" className="landing-hero-title">
            Identity infrastructure.<br /><em>Without the noise.</em>
          </Heading>
          <Text color="secondary" className="landing-lede">One focused workspace for the apps connected to Ace ID. Configure clients, manage credentials, and understand authentication at a glance.</Text>
          <HStack gap={3} vAlign="center" wrap="wrap" className="landing-actions">
            <Button label="Continue with Ace ID" variant="primary" size="lg" onClick={onSignIn} />
            <Button label="Read the documentation" size="lg" href={DOCS_URL} />
          </HStack>
        </div>
        <aside className="landing-hero-note" aria-label="About AIDC">
          <span className="landing-note-index">A note on identity <span>01 / 03</span></span>
          <p className="landing-note-quote">A clearer way to <em>connect.</em></p>
          <p className="landing-note-copy">Ace ID handles identity.<br />AIDC handles your apps.</p>
          <span className="landing-note-mark" aria-hidden="true">A / I</span>
        </aside>
      </section>

      <section aria-labelledby="capabilities" className="landing-section">
        <div className="landing-section-label"><span>01 / The essentials</span><span>Made for the work</span></div>
        <div className="landing-intro">
          <Heading level={2} type="display-2" id="capabilities" className="landing-section-title">Everything your app needs. <em>Nothing pretending to be you.</em></Heading>
          <Text color="secondary" className="landing-intro-copy">AIDC manages app configuration. Ace ID remains the identity provider. That boundary is deliberate.</Text>
        </div>
        <Grid columns={{ minWidth: 240, max: 3, repeat: "fit" }} gap={5} className="landing-features">
          {FEATURES.map((f) => <article key={f.number} className="landing-feature">
            <div className="landing-feature-index"><span>{f.number} / {f.kicker}</span><span aria-hidden="true">↗</span></div>
            <Heading level={3} className="landing-feature-title">{f.title}</Heading>
            <Text color="secondary" className="landing-feature-copy">{f.text}</Text>
          </article>)}
        </Grid>
      </section>

      <section className="landing-cta" aria-labelledby="landing-cta-title">
        <div>
          <p className="landing-eyebrow">02 / Ready when you are</p>
          <Heading level={2} type="display-2" id="landing-cta-title" className="landing-cta-title">Ship the app.<br /><em>Trust the identity layer.</em></Heading>
        </div>
        <Button label="Enter the console" variant="primary" size="lg" onClick={onSignIn} />
      </section>
    </main>
    <footer className="landing-footer">
      <span>AIDC <span aria-hidden="true">/</span> The Ace Base</span>
      <span>Identity by Ace ID. Application control by AIDC.</span>
      <span>© {new Date().getFullYear()}</span>
    </footer>
  </div>;
}
