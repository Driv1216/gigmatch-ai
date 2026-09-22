# GigMatch AI — 25 High-Fidelity Frontend UI/UX Concepts

This directory (`/concepts`) contains **twenty-five distinct high-fidelity frontend UI/UX explorations** for **GigMatch AI**. It is completely isolated from the primary application code in `/frontend` and `/backend`.

---

## Instructions for Running & Viewing

To run and interact with all 25 concepts locally:

```bash
cd concepts
npm install
npm run dev
```

Open your browser to **`http://localhost:5174`** (or the URL output by Vite).

### Switching Concepts & Roles

At the top of the screen, a sticky control bar allows you to seamlessly:
1. **Switch Concepts**: Toggle between **Concept 1 through Concept 25** in real time.
2. **Switch Roles**: Toggle between **Freelancer**, **Client**, and **Admin Eval** views to test role-specific workflows in each concept.

---

## 🎨 Overview of all 25 UI/UX Concepts (Radically Distinct Layouts & Interaction Models)

| Concept | Name & Direction | Category | Layout Architecture & Component Placements |
| :--- | :--- | :--- | :--- |
| **Concept 1** | **Precision Workbench** | Functional | Split-pane high-density developer workbench with command palette (`⌘K`), keyboard navigation (`J`/`K`), and inline inspector. |
| **Concept 2** | **Editorial Studio** | Editorial | Warm alabaster magazine spread (`#faf9f6`), Instrument Serif typography, storytelling match narratives, and multi-page step extraction. |
| **Concept 3** | **Graph Match Matrix** | Analytical | Deep obsidian intelligence center (`#080d1a`), live algorithm switcher (Hybrid/Semantic/Keyword), and skill alignment heatmaps. |
| **Concept 4** | **Adaptive Split-Canvas** | Minimal | Scandinavian minimal dual-pane (`#f8fafc`), master-detail layout with sliding focus drawer. |
| **Concept 5** | **Enterprise Grid** | Enterprise | Industrial-strength financial/SaaS data grid (inspired by Cloudflare, Retool), structured tabular data with multi-candidate side-by-side comparison tray. |
| **Concept 6** | **Terminal Noir** | CLI | True black CLI terminal (`#000`), phosphor green text (`#00ff41`), simulated command line (`gigmatch> search --skill react`), ASCII box borders (`┌─┐│└─┘`), scanlines. |
| **Concept 7** | **Broadsheet Journal** | Print | Ivory newspaper (`#fefcf3`), multi-column layout, "above the fold" lead story, classifieds grid, byline metadata, drop caps, decorative print flourishes (❧ §). |
| **Concept 8** | **Brutalist Canvas** | Brutalist | Pure white + black + electric red (`#ff0000`), 3px solid black borders, zero border-radius, oversized `text-6xl` score numbers, slash-separated uppercase text nav. |
| **Concept 9** | **Aurora Dark** | Modern Dark | Rich charcoal (`#111111`) with violet→fuchsia→teal aurora gradient accents, ghost skill tags (`border-white/20`), opacity-based text hierarchy. |
| **Concept 10** | **Kanban Pipeline** | Board | Horizontal scrolling Kanban columns per role (Discovered→Applied→In Review for freelancers; New→Shortlisted→Interview→Accepted for clients), click-to-move cards. |
| **Concept 11** | **Radar Sonar Hub** | Bold | **Circular Radar Sonar & Target Acquisition Grid**: Concentric sonar rings (30%, 60%, 90% match scores) with locked target reticles, sonar frequency sweeper, and target acquisition controls. |
| **Concept 12** | **Cyber Deck Matrix REPL** | Bold | **Cybernetic REPL & Holographic Node Diagnostic Panel**: Matrix code cascade stream, code prompt REPL (`SYS_EXECUTE_PROPOSAL()`), and holographic node telemetry logs. |
| **Concept 13** | **CAD Blueprint Canvas** | Bold | **CAD Drafting Board & Architectural Canvas**: CAD millimeter dimension rulers (`0mm...600mm`), drawing dimension callouts (`|<- 94.00mm ->|`), and official CAD title block seal. |
| **Concept 14** | **Frosted Ambient Orbs** | Bold | **Floating Glass Orbs & Stacked Spatial Canvas**: Dynamic glowing color spheres drifting behind translucent glass panels (`backdrop-blur-2xl border-white/20`), floating pill header, and glass popovers. |
| **Concept 15** | **Bento Tile Matrix** | Bold | **Apple/Vercel Asymmetric 4-Column Bento Tile Matrix**: 6 tiles of completely different aspect ratios & functions (2x2 Hero Feature Tile, 1x1 Circle Gauge Tile, 1x1 Compensation Metric Tile, 2x1 Skill Pill Cloud Tile). |
| **Concept 16** | **Swiss Typographic Grid** | Grounded | **Asymmetric 12-Column Architectural Spec Layout**: Left vertical spine (`01 / GIGMATCH SWISS`), 4-col indexed list, 8-col full-width spec sheet with signal-red rule & fixed bottom action bar. |
| **Concept 17** | **Compliance Audit Ledger** | Grounded | **Full-Width Institutional Data Table & Slide-Up Audit Drawer**: 100% full-width tabular compliance matrix with security hashes (`0x7f...8f`), security seal badges, and 60vh slide-up bottom drawer. |
| **Concept 18** | **Retro OS Desktop** | Bold | **Multi-Window Windows 95 Desktop OS**: Teal desktop wallpaper (`#008080`), desktop icons (`Gig_Explorer.exe`, `AI_Inspector.exe`), floating movable windows with blue title bars, Start menu & taskbar. |
| **Concept 19** | **Acid Graphic Zine** | Bold | **Diagonal Marquee & Cutout Poster Collage**: Top scrolling neon-orange ticker (`★ ACID GIG MATCH ★`), tilted overlapping zine cards (`rotate-2`), tape strip graphics, and bottom floating cassette player bar. |
| **Concept 20** | **Spatial Horizon 3D** | Bold | **3D Perspective Card Carousel & Spatial Control Arc**: 3D spatial viewport (`perspective: 1200px`) with angled 3D depth cards, glowing 3D score rings, and curved 3D floating control arc. |
| **Concept 21** | **Constellation Node Graph** | **Visionary** | **Cinematic Data Visualization**: Cinematic interactive node-graph interface where Gigs are floating stars connected by skill constellations in deep space. |
| **Concept 22** | **Vinyl Record Player** | **Visionary** | **Music Metaphor Interface**: Center-stage spinning vinyl record player UI with stylus/tonearm, and waveform audio-visualizer Match Scores functioning as "BPM". |
| **Concept 23** | **Retro Arcade Fighter** | **Visionary** | **Gamified Character Select Screen**: Gamified 8-bit fighting game select screen. "Freelancer vs. Gig Boss" with dynamic health bars reflecting skill match and budget. |
| **Concept 24** | **HFT Bloomberg Terminal** | **Visionary** | **High-Frequency Trading Terminal**: Financial Bloomberg-style terminal with scrolling skill tickers, index matching grids, candlestick confidence intervals, and "Buy/Sell" actions. |
| **Concept 25** | **Cinematic TikTok Reel** | **Visionary** | **Mobile-First Fullscreen Swiper**: Immersive fullscreen swipeable video cards with heavy background blur, floating side-edge action buttons, and up/down swipe navigation. |

---

## Shared Product Workflows Supported across All 25 Concepts

1. **Freelancer Workflow**:
   - AI Gig Recommendations with match score breakdowns (Overall %, BM25 Keyword %, Cosine Semantic %, Skill Gap Analysis, Justification).
   - Smart Resume Parser & Skill Extraction Terminal (extracting technical skills with confidence weights).
   - Opportunity Proposal Submission.

2. **Client Workflow**:
   - Posting New Gigs & AI Brief Parsing.
   - Applicant Review & Side-by-Side Candidate Comparison.
   - Application Status Lifecycle Management (Shortlist, Accept, Decline).

3. **Admin / AI Evaluation Console**:
   - Algorithmic evaluation metrics comparing Keyword vs. Semantic vs. Hybrid models (NDCG@5, NDCG@10, MAP, MRR, Precision@5).
