import LiquidGlass from "liquid-glass-react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { Reveal, useSpotlight } from "../ui/motion";
import { PixelBlast } from "../ui/PixelBlast";

export const DOCS_URL = "https://docs.ace-base.cc/projects/aidc";
// A slow marquee of the standards the console speaks, between the hero and the bento.
const STANDARDS = ["OAuth 2.0", "OpenID Connect", "PKCE", "Client credentials", "Refresh tokens", "Redirect URIs", "JWKS rotation", "Audit trails"];
const CONTROLS = ["Clients", "Redirect URIs", "Scopes", "Credentials", "Branding"];

type TileProps = { className: string; delay?: number; number: string; kicker: string; title: string; children?: React.ReactNode; text?: string };
function Tile({ className, delay = 0, number, kicker, title, text, children }: TileProps) {
  const spotlight = useSpotlight<HTMLElement>();
  return <Reveal delay={delay} className={`bento-cell ${className}`}>
    <article ref={spotlight.ref} onPointerMove={spotlight.onPointerMove} className="landing-tile spotlight">
      <div className="landing-tile-index"><span>{number} @ {kicker}</span><span aria-hidden="true">↗</span></div>
      <Heading level={3} className="landing-tile-title">{title}</Heading>
      {text && <Text color="secondary" className="landing-tile-copy">{text}</Text>}
      {children}
    </article>
  </Reveal>;
}

export function Landing({ onSignIn }: { onSignIn: () => void }) {
  return <div className="landing">
    <header className="landing-nav-wrap">
      <LiquidGlass className="landing-glass" cornerRadius={999} padding="8px 10px 8px 20px" blurAmount={0.1} displacementScale={70} saturation={150} aberrationIntensity={1.5} elasticity={0.12} style={{ position: "fixed", top: "34px", left: "50%" }}>
        <nav className="landing-nav" aria-label="Primary">
          <HStack gap={2} vAlign="center" className="landing-brand">
            <img src="/assets/icon.png" alt="" width={28} height={28} />
            <Text weight="semibold">AIDC</Text>
            <span className="landing-brand-description">Ace Identity Developer Console</span>
          </HStack>
          <HStack gap={3} vAlign="center">
            <span className="landing-nav-docs"><Link href={DOCS_URL}>Documentation</Link></span>
            <Button label="Sign in" variant="primary" onClick={onSignIn} />
          </HStack>
        </nav>
      </LiquidGlass>
    </header>
    <main className="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <PixelBlast className="landing-hero-field" />
        <div className="landing-hero-copy">
          <Reveal><p className="landing-eyebrow"><span className="landing-eyebrow-dot" aria-hidden="true" /> The Ace Base @ Identity tools</p></Reveal>
          <Reveal delay={70}>
            <Heading level={1} type="display-1" id="landing-title" className="landing-hero-title">
              Identity infrastructure.<br /><em>Without the noise.</em>
            </Heading>
          </Reveal>
          <Reveal delay={130}><Text color="secondary" className="landing-lede">One focused workspace for the apps connected to Ace ID. Configure clients, manage credentials, and understand authentication at a glance.</Text></Reveal>
          <Reveal delay={190}><HStack gap={3} vAlign="center" wrap="wrap" className="landing-actions">
            <Button label="Continue with Ace ID" variant="primary" size="lg" onClick={onSignIn} />
            <Button label="Read the documentation" size="lg" href={DOCS_URL} />
          </HStack></Reveal>
        </div>
      </section>

      <div className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee-track">
          {[0, 1].map((copy) => <div className="landing-marquee-group" key={copy}>
            {STANDARDS.map((standard) => <span key={standard}>{standard}<span className="landing-marquee-sep">/</span></span>)}
          </div>)}
        </div>
      </div>

      <section aria-labelledby="capabilities" className="landing-section">
        <Reveal><Heading level={2} type="display-2" id="capabilities" className="landing-section-title">Everything your app needs. <em>Nothing pretending to be you.</em></Heading></Reveal>
        <div className="landing-bento">
          <Tile className="tile-wide" number="01" kicker="Configure" title="Application control" text="Manage clients, redirect URIs, scopes, credentials, and application settings from one workspace.">
            <ul className="landing-chips" aria-label="What you can configure">{CONTROLS.map((item) => <li key={item}>{item}</li>)}</ul>
          </Tile>
          <Tile className="tile-narrow" delay={90} number="02" kicker="Connect" title="Standards, not shortcuts" text="OAuth 2.0 and OpenID Connect through a clear, focused surface." />
          <Tile className="tile-narrow" delay={60} number="03" kicker="Observe" title="Visibility when it counts" text="Authentication activity and operational signals, right beside the app." />
          <Tile className="tile-wide" delay={120} number="04" kicker="Boundary" title="Ace ID handles identity. AIDC handles your apps." text="That split is deliberate: sign-in, security and passkeys stay with Ace ID." />
          <Reveal delay={90} className="bento-cell tile-full">
            <section className="landing-tile landing-cta" aria-labelledby="landing-cta-title">
              <Heading level={2} type="display-2" id="landing-cta-title" className="landing-cta-title">Ship the app.<br /><em>Trust the identity layer.</em></Heading>
              <Button label="Enter the console" variant="primary" size="lg" onClick={onSignIn} />
            </section>
          </Reveal>
        </div>
      </section>
    </main>
    <footer className="landing-footer">
      <span>AIDC <span aria-hidden="true">@</span> The Ace Base</span>
      <span>Identity by Ace ID. Application control by AIDC.</span>
      <span>© {new Date().getFullYear()}</span>
    </footer>
  </div>;
}
