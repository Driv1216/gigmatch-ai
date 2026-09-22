# GigMatch AI — Eight Frontend Concepts

This folder is a fully isolated frontend exploration. It does not import from, write to, or modify the real GigMatch AI frontend, backend, Supabase migrations, or existing `/concepts` work.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
cd /Users/drivyaanshyadav/Desktop/Ai-Gig/gigmatch-ai/concepts-gpt
npm install
npm run dev
```

Open the local URL printed by Vite. The default is:

```text
http://localhost:5185
```

Create a production build:

```bash
npm run build
npm run preview
```

## How to view and compare

The dark comparison bar at the top is outside the concepts themselves.

- Open the concept menu at the upper left to switch between all eight directions.
- Switch between **Freelancer** and **Client** to inspect both sides of the same marketplace workflow.
- Use **Concept notes** for the interaction thesis behind the active direction.
- Use the reset icon to return the demo to its initial state.
- The URL hash records the concept, role, and current view, so a specific screen can be refreshed or shared locally.

The initial scenario begins at a high-consequence moment: Northstar has sent a version-bound selection request for proposal version 2. This makes each concept demonstrate meaningful product states immediately. The complete discovery and proposal flow remains accessible through navigation.

## The eight directions

| # | Concept | Product thesis | Distinct interaction model |
|---|---|---|---|
| 01 | **Concierge** | A calm, high-trust service for consequential work decisions | One recommended next action, progressive disclosure, and focused single-applicant review |
| 02 | **Terms Ledger** | The product is a durable commercial record rather than a dashboard | Document folios, version registers, margin notes, decision marks, and explicit record references |
| 03 | **The Exchange** | A professional marketplace should make comparison fast without becoming noisy | Faceted opportunity register, dense listing rows, evidence inspector, and applicant book |
| 04 | **Deal Room** | Each opportunity is a case workspace containing people, evidence, terms, and history | Contextual rooms, case tabs, participant-visible threads, and a persistent decision dock |
| 05 | **Pocket Desk** | The complete workflow should remain usable under mobile interruption and time pressure | Bottom navigation, short review surfaces, expandable evidence, and deliberate sticky action bars |
| 06 | **Studio** | A marketplace can feel human, culturally confident, and visually alive without becoming frivolous | Full-bleed original photography, magazine-scale typography, story-led opportunity discovery, and portfolio-like talent dossiers |
| 07 | **Signal Index** | Alternatives are easiest to understand when they occupy one rigorous visual frame | Swiss-modernist poster typography, functional primary colours, criteria-on-rows comparison, and high-contrast record forms |
| 08 | **Afterdark** | Senior independent work can feel like entry into a quiet, carefully curated private network | Cinematic original photography, immersive brief paging, focused decision rooms, and restrained oxblood-and-parchment dossiers |

These are not colour variations. Each direction changes information architecture, navigation, density, decision sequencing, and the relationship between marketplace browsing and official records. Concepts 06–08 deliberately break from the shared cream-and-green language of the original set: one is image-led editorial, one is a modernist comparison instrument, and one is a cinematic private network.

## Shared comparison scenario

Every concept uses the same scenario and realistic mock data:

- Client: **Northstar Health Systems**
- Primary gig: **Senior Design Systems Engineer for Clinical Operations**
- Published terms: **₹4.8L–₹6.2L fixed price**, 12–16 weeks
- Lead applicant: **Meera Shah**
- Current proposal: **₹5.6L fixed**, 14 weeks, proposal version 2
- Match: **91%**, with suitability evidence kept separate from price

The same important product workflow is represented across all eight concepts:

1. Discover an open, financially clear gig.
2. Review honest match evidence and preferred-skill gaps.
3. Submit a structured commercial proposal tied to a gig version.
4. Track the application stage and immutable version history.
5. Review actual applicants by suitability as a client.
6. Privately shortlist or formally advance a candidate.
7. Send one selection request bound to exact gig and proposal versions.
8. Accept exact unchanged terms.
9. Enter a lightweight engagement record with consent-gated contact exchange.

## Interactive states

The frontend is entirely local and has no backend dependency. Demo actions update shared in-memory state across concepts:

- save/remove a private shortlist mark;
- formally advance/return an applicant;
- send a version-bound selection request;
- accept the exact terms and enter the engagement;
- submit the structured proposal;
- switch roles, views, concepts, and selected gigs;
- open simulated version, clarification, consent, and activity actions with confirmation feedback.

Reloading or using the reset control restores the seeded scenario.

## Product boundaries represented

The concepts preserve the repository’s current product rules:

- AI matching assists review but does not make hiring decisions.
- Price does not increase or decrease suitability.
- Internal shortlist is private; formal advancement is applicant-visible.
- Proposal edits create new versions.
- Selection requests bind exact application and gig versions.
- One active selection request is allowed per gig.
- Contact details remain masked until a confirmed engagement and separate sharing consent.
- GigMatch records terms but does not claim to provide contracts, payment processing, or escrow.
- No chat, task board, decorative analytics, fake production metrics, or invented marketplace performance claims are introduced.

## Project structure

```text
concepts-gpt/
  src/
    concepts/
      Afterdark.tsx
      Concierge.tsx
      SignalIndex.tsx
      Studio.tsx
      Ledger.tsx
      Exchange.tsx
      Workroom.tsx
      Pocket.tsx
    assets/
      afterdark-architect.jpg
      studio-engineer.jpg
    App.tsx
    concept-additions.css
    data.ts
    shared.tsx
    styles.css
    types.ts
  index.html
  package.json
  README.md
```

All eight directions share one data contract and state model to keep comparison fair, while each concept owns its information architecture and responsive presentation. The two photographic assets are original generated artwork stored locally, so the concepts do not depend on remote stock-image services.
