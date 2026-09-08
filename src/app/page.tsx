import type { Metadata } from "next";
import Link from "next/link";

import { ArrowIcon, IntelligenceIcon, LeagueIcon, PulseIcon } from "@/components/icons";
import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Fantasy Football Waiver Decisions With Context",
  description:
    "Waiver Ops combines league context, player outlooks, and meaningful news to explain the waiver moves that fit your roster.",
};

export default function HomePage() {
  return (
    <PublicSiteShell>
      <main id="main-content">
        <section className="public-hero">
          <div className="hero-copy">
            <p className="eyebrow">Fantasy football decision intelligence</p>
            <h1>Know why before you claim.</h1>
            <p>
              Waiver Ops turns league context, player outlooks, and the news that
              changes value into recommendations built for your roster.
            </p>
            <div className="hero-actions">
              <Link className="button primary-button public-primary" href="/dashboard">
                Open your dashboard <ArrowIcon />
              </Link>
              <a className="button secondary-button" href="#how-it-works">See how it works</a>
            </div>
            <small>No generic top-ten list. Every recommendation should earn its place.</small>
          </div>
          <div aria-label="Recommendation model preview" className="hero-model">
            <div className="hero-model-header">
              <span>Waiver decision model</span>
              <strong>Live context</strong>
            </div>
            <ol>
              <li><span>01</span><div><strong>Your league</strong><small>Scoring, roster construction, and availability</small></div></li>
              <li><span>02</span><div><strong>Player outlook</strong><small>Projection, role, performance, and competition</small></div></li>
              <li><span>03</span><div><strong>Meaningful intelligence</strong><small>Recent evidence across news and podcasts</small></div></li>
            </ol>
            <div className="hero-model-result"><PulseIcon /><span><small>Result</small><strong>A ranked move with a reason</strong></span></div>
          </div>
        </section>

        <section className="public-proof" aria-label="Product principles">
          <span>League-aware</span>
          <span>Evidence-ranked</span>
          <span>Explanation-first</span>
          <span>Private by design</span>
        </section>

        <section className="public-section" id="how-it-works">
          <header className="public-section-heading">
            <div>
              <p className="eyebrow">One decision surface</p>
              <h2>The inputs that matter, in the order they matter.</h2>
            </div>
            <p>Recommendations become useful when they account for the team you actually manage—not an imaginary average league.</p>
          </header>
          <div className="public-feature-grid">
            <article><span className="public-icon"><LeagueIcon /></span><p className="eyebrow">01 · League fit</p><h3>Start with your roster.</h3><p>Connect a supported league so roster needs, scoring, and available players shape the board.</p></article>
            <article><span className="public-icon"><IntelligenceIcon /></span><p className="eyebrow">02 · Player context</p><h3>Separate signal from volume.</h3><p>Player evidence is aggregated, ranked by meaning, and weighted by how recently it happened.</p></article>
            <article><span className="public-icon"><PulseIcon /></span><p className="eyebrow">03 · Clear action</p><h3>See the reason, not just the rank.</h3><p>Each move explains its modeled fit and remains honest about uncertainty and missing inputs.</p></article>
          </div>
        </section>

        <section className="public-cta">
          <div><p className="eyebrow">Your next move</p><h2>Build a waiver board around your league.</h2></div>
          <Link className="button primary-button public-primary" href="/dashboard">Open Waiver Ops <ArrowIcon /></Link>
        </section>
      </main>
    </PublicSiteShell>
  );
}
