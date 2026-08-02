# GigMatch AI — Geometry and Interaction Audit

Status: source-backed audit of concepts 01–32  
Purpose: prevent structural repetition before any further concepts are designed

## Scope and method

This audit evaluates the implemented application views, not the names, palettes, stated metaphors, or landing-page claims.

Each concept was inspected across:

- desktop page geometry;
- persistent shell and navigation;
- information density;
- dominant interaction primitive;
- state-change behavior;
- mobile transformation;
- repeated structures shared with other concepts.

The common reducer, fixtures, route vocabulary, persistence model, semantic controls, and accessibility requirements are deliberately excluded from the prohibition register. They are product constraints, not design concepts.

## Executive finding

The first twenty concepts contain twenty visual identities but substantially fewer spatial systems. Concepts 21–26 form a product collection whose identity comes from six different operational manipulations rather than landing-page metaphor.

Across concepts 01–20:

- retain a persistent header or top control region;
- swap complete route-specific page bodies inside a stable application shell;
- introduce most pages with a small label, large left-aligned heading, and supporting copy;
- arrange the workflow into bounded rectangular sections;
- use grids, rows, side summaries, or panels as the primary composition tools;
- include at least one mobile breakpoint that collapses a desktop grid to one column.

Nineteen concepts also use a fixed notification toast. The same proposal, selection, and engagement compositions recur particularly often:

- proposal fields beside a consequence or summary rail;
- exact terms presented as three or four adjacent cells;
- an action footer beneath the selected record;
- engagement terms beside lifecycle, activity, or contact permission.

The core issue is therefore not palette repetition. It is **shell repetition, reading-order repetition, and state-transition repetition**.

The two product collections do not add another shared shell family. Concepts 21–26 manipulate change hunks, working sheets, coupled constraints, priority regions, record branches, and qualification gates. Concepts 27–32 manipulate docked panes, record overlays, semantic clusters, functional connections, historical state, and scoped custody. Each role receives a substantive operational home.

## Structural families

These families are not mutually exclusive. A concept can belong to more than one.

### A. Rail workspace

Concepts: **01 Northline, 02 Covenant, 04 Relay, 08 Aperture, 13 Command, 16 Harbor, 18 Vector, 19 Atelier**

Shared traits:

- narrow persistent region on the left;
- content page occupying the remaining width;
- sticky or fixed top controls;
- role switch separated from page content;
- mobile replacement through an overlay, horizontal strip, or bottom navigation.

Relay adds a second event rail, but its central reading model remains a rail-framed workspace.

### B. Top-navigation register

Concepts: **05 Monument, 09 Facet, 11 Tally, 15 Trace, 20 Index**

Shared traits:

- full-width or max-width page beneath a sticky top bar;
- dense horizontal rows or grids;
- records selected through table-like controls;
- detail exposed below, beside, or after the selected row;
- mobile behavior based on column removal, overflow, or vertical stacking.

### C. Stage strip and board

Concepts: **03 Waypoint, 06 Tempo, 12 Lane**

Shared traits:

- workflow stages represented as persistent adjacent segments;
- content positioned relative to a route, calendar, lane, or five-column board;
- horizontal stage navigation surviving through scroll on smaller screens;
- route transitions still replace the main content rather than spatially transforming one persistent object.

### D. Bilateral split

Concepts: **07 Duet, 17 Accord**

Shared traits:

- party A and party B occupy opposing columns;
- a narrow center spine represents alignment, authority, or convergence;
- exact selection is depicted as the two sides meeting;
- mobile layouts flatten the bilateral thesis into a single vertical sequence.

### E. Expandable bands

Concept: **10 Fold**

Shared traits:

- five persistent horizontal bands;
- one active band expands while others remain as labels;
- disclosure depth is represented by opening bounded rectangles;
- mobile retains the accordion and stacks the opened record.

### F. Artifact gallery

Concepts: **14 Proofroom, 19 Atelier**

Shared traits:

- evidence is packaged as discrete artifact tiles;
- selection changes a focused artifact, room, or thread;
- carousel, picker, grid, or stage placement supplies the main manipulation;
- the artifact metaphor eventually resolves into conventional proposal and selection panels.

### G. Command shell

Concepts: **13 Command, 18 Vector**

Shared traits:

- persistent command field in the top region;
- keyboard aliases duplicate visible navigation;
- suggestions appear as a fixed overlay;
- a left rail and fixed status/footer region remain present;
- routed pages below the command field use familiar lists, grids, forms, and side summaries.

### H. Provenance path

Concepts: **04 Relay, 15 Trace, 18 Vector**

Shared traits:

- events or nodes proceed from source to consequence;
- revision breaks or supersedes an authority link;
- acceptance locks an exact chain;
- contact permission becomes another short chain or record group.

### I. Operational product collection

Concepts: **21 Merge, 22 Stack, 23 Calibrate, 24 Mosaic, 25 Fork, 26 Sieve**

The collection shares product depth rather than a shell: both role homes expose live work, all routes retain complete records and controls, and every revision, authority, acceptance, lifecycle, and permission action has a spatial consequence. The governing interactions remain distinct: review, push/pop, adjustment, reflow, branch/merge, and pass/hold.

## Concept-by-concept map

### Original directions — 01–15

| # | Concept | Actual desktop geometry | Navigation model | Density | Dominant interaction | Mobile behavior and structural overlap |
|---|---|---|---|---|---|---|
| 01 | Northline | 224px sticky left rail plus sticky top bar; max-width content; frequent content/aside splits | Four-item role-aware rail | High operational | Select a row, inspect its adjacent detail, then act | Rail becomes compact/fixed navigation; almost every grid becomes a vertical feed. Establishes the suite’s default dashboard skeleton |
| 02 | Covenant | 220px case index plus sticky record header; centered paper-like body; document and register grids | Case index, tabs, and record sections | High editorial | Open a case record, tab, clause, or instrument | Index becomes an overlay; documents and registers stack or shed columns. Reuses rail workspace and table/register structures |
| 03 | Waypoint | 90px stage label beside main destination; fixed five-stop route along the bottom | Sequential route destinations | Medium and spacious | Move between focused destinations and select a record within each | Bottom route becomes horizontally scrollable; destinations stack. Spatial journey still resolves to page replacement |
| 04 | Relay | 190px resource rail, central protocol body, and 220px event rail | Resource index plus append-only event context | Very high | Select a signal/packet and append or inspect an event | Event rail disappears first; resource navigation becomes compact or overlaid; central grids stack. Distinct audit language inside a familiar rail shell |
| 05 | Monument | Sticky top header, fixed bottom footer, edge-to-edge typographic rows | Top navigation and expandable full-width records | Medium-high | Expand a large row to reveal its detail | Mobile menu overlays the page; rows lose columns and become vertical. Strong silhouette, but most task pages still use headers, rows, two-column bodies, and four-up terms |
| 06 | Tempo | Sticky top header and fixed footer; time rows, weekly grids, calendar/detail splits | Top navigation organized around planning views | Medium-high | Select a date/record and inspect capacity or phases | Calendar and planner splits become one column; stage/phase cells become two-up or vertical. Time is the theme, but page architecture remains conventional |
| 07 | Duet | Full-width mirrored columns separated by a 100–130px center spine | Top navigation; bilateral comparison within every view | Medium | Compare or reconcile the two party positions | Nearly all mirrors collapse to one column. The defining bilateral relationship is weakest on mobile |
| 08 | Aperture | 70px depth rail plus sticky header and five-part depth track; large focus fields | Depth navigation and zoom-in/zoom-out controls | Medium and spacious | Change semantic depth or focused record | Rail disappears; depth track scrolls; focus fields become stacked. Semantic zoom is visually distinctive, but routed views still use familiar grids and summary rails |
| 09 | Facet | Sticky top bar over wide lattices, comparison matrices, and row grids | Top navigation plus comparison axes | Very high | Change an axis or selected lattice cell | Matrices use horizontal overflow or lose columns; secondary layouts stack. Establishes the comparison-table family |
| 10 | Fold | Sticky header above five persistent expandable horizontal bands | Band labels are both navigation and disclosure controls | High when expanded | Expand one workflow band and operate inside it | Accordion remains; inner grids stack. One of the few concepts where navigation and content share the same object |
| 11 | Tally | Sticky top bar; dense registers, quote tables, line items, and summary asides | Top navigation and row selection | Very high | Edit or select a commercial line and reconcile totals | Tables overflow; two-column registers stack. Strong domain fit, but structurally close to Facet |
| 12 | Lane | Sticky header, five-column stage strip, and five-column workflow board | Stage strip plus record movement between lanes | Very high | Select or move a record across stages | Board and row groups use horizontal overflow; detail views stack |
| 13 | Command | 190px rail plus sticky command header, page body, command overlay, and status footer | Slash command and duplicated clickable rail actions | High and compact | Resolve a safe command or select the equivalent visible action | Main grids stack; suggestions scroll; command remains a top field. Establishes the command-shell template reused by Vector |
| 14 | Proofroom | Sticky top bar; walls, five-column artifact grids, picker, rotator, and archive split | Top navigation plus artifact selection | Medium-high | Select, rotate, or attach an evidence artifact | Artifact groups scroll horizontally; most record views stack. Artifact tiles remain cards even when described as rooms |
| 15 | Trace | Sticky top bar; horizontal source → claim → consequence paths inside conventional page sections | Top navigation plus path-node inspection | Medium-high | Follow a lineage path and inspect a broken link | Paths overflow horizontally while surrounding grids stack. Provenance is distinct at component level, not at shell level |

### Hybrid collection I — 16–20

| # | Concept | Actual desktop geometry | Navigation model | Density | Dominant interaction | Mobile behavior and structural overlap |
|---|---|---|---|---|---|---|
| 16 | Harbor | Fixed left rail, sticky top controls, max-width body, repeated 1.45/0.55 content/aside grids | Five-item rail | High operational | Select an agenda item or action row | Rail becomes a five-item horizontal navigation; every major split becomes one column. Closest to Northline with Tempo content |
| 17 | Accord | Sticky centered header; max-width body; repeated party/center/party grids | Top navigation plus bilateral alignment records | Medium-high | Reconcile two sides through a central authority spine | Navigation overlays; bilateral layouts mostly stack. Closest to Covenant and Duet without a new shell |
| 18 | Vector | Fixed command header, fixed left navigation, fixed bottom status, max-width page | Command field plus five-item rail | Very high | Resolve commands and inspect lineage nodes | Rail becomes a five-cell strip; lineage and record grids stack. Structurally Command with Trace components |
| 19 | Atelier | Sticky header, fixed vertical dock, fixed bottom footer; large artifact focus and room grids | Five-room dock plus artifact focus controls | Medium | Change room or focused artifact through picker/carousel controls | Dock becomes a horizontal five-cell strip; rooms and archives stack. Spatially richer than most hybrids but still a rail/dock shell with card artifacts |
| 20 | Index | Sticky top header and footer; edge-to-edge typographic registers and comparison rows | Top navigation plus comparison-axis controls | Very high | Expand a row or change a comparison axis | Navigation overlays; rows compress to a few columns and detail stacks. Structurally Monument rows carrying Facet data |

### Product collection — 21–26

| # | Concept | Actual desktop geometry | Navigation model | Density | Dominant interaction | Mobile behavior and structural overlap |
|---|---|---|---|---|---|---|
| 21 | Merge | Full-width unified change surface with review metadata and inline decisions | Material records and review anchors | High operational | Inspect, explain, dismiss, renew, or merge a change | Unified diffs reflow without side-by-side scrolling |
| 22 | Stack | Functional full-height sheets layered in depth | Push/pop working sheets with retained context | Medium-high | Open, return, pin, eject, or lock a sheet | One active sheet plus an accessible back-stack preserves depth |
| 23 | Calibrate | Centered control instrument paired with a live consequence readout | Constraint modes and direct record actions | High interactive | Adjust coupled evidence, capacity, scope, timing, and price | One control receives focus while the exact summary persists |
| 24 | Mosaic | Full-viewport unequal tessellation whose regions encode priority | Native actionable regions with arrow-key enhancement | High spatial and operational | Focus a region and trigger deterministic reflow | Predefined two-dimensional templates avoid horizontal scrolling |
| 25 | Fork | Full-width accessible branch tree above the active record | Semantic tree nodes and branch actions | High relational | Create a sibling version, renew authority, or merge a branch | Indented ancestry remains visible without two-dimensional scrolling |
| 26 | Sieve | Irregular narrowing gates and held-out record pockets | Direct gate controls and passing records | Medium-high | Adjust, pass, hold, seal, or release a bundle | Gates retain their narrowing relationship with one expanded control |

### Product collection II — 27–32

| # | Concept | Actual desktop geometry | Navigation model | Density | Dominant interaction | Mobile behavior and structural overlap |
|---|---|---|---|---|---|---|
| 27 | Dock | Unequal concurrent pane groups occupying a full viewport | Focus, split, join, maximize, and restore open record panes | Very high operational | Arrange and retain several live working contexts | One active pane plus an accessible open-pane tablist preserves every context |
| 28 | Overlay | One registered record plane with switchable opaque layers | Layer toolbar and in-plane record actions | High editorial-operational | Compare, stamp, void, and flatten aligned record layers | The same portrait record plane reflows without two-dimensional page scrolling |
| 29 | Cluster | Freeform semantic field with irregular membership containers | Regrouping controls plus click-first record movement | Medium-high spatial | Form, dissolve, and bind meaningful record groups | Deterministic spatial islands retain membership and focused enlargement |
| 30 | Patchbay | Irregular socket banks with a live connection map | Source-to-destination routing and bank focus | Very high relational | Create, reject, disconnect, or hard-wire functional relationships | One active bank plus a compact persistent connection map |
| 31 | Chronicle | Persistent state surface anchored to a scrubber and named moments | Scrub historical state or activate a bookmarked record moment | High temporal | Reconstruct the complete effective record at a chosen time | Vertical scrubber and a single complete snapshot preserve historical context |
| 32 | Vault | Central custody chamber with irregular surrounding compartments | Select compartments and issue, quarantine, consume, or withdraw scoped keys | Medium-high spatial-operational | Govern exact authority and permission through custody | Central chamber remains visible while one surrounding compartment expands |

### Product collection admission matrix

Every P01–P24 pattern was checked. The table lists patterns used only as subordinate utilities; every unlisted pattern is absent, and no prohibited pattern governs any concept.

| Concept | Subordinate only | Governing prohibited patterns |
|---|---|---|
| Merge | P01 compact toolbar, P08 local headings, P11 diff rows, P20 status toast, P21 unified mobile reflow | None |
| Stack | P01 compact toolbar, P08 local headings, P12 sheet bounds, P20 status toast, P21 single active mobile sheet | None |
| Calibrate | P01 compact toolbar, P08 local headings, P09 consequence readout, P16 form/readout relationship, P20 status toast | None |
| Mosaic | P01 compact toolbar, P08 local headings, P12 bounded regions, P20 status toast | None |
| Fork | P01 compact toolbar, P08 local headings, P15 subordinate connectors, P20 status toast | None |
| Sieve | P01 compact toolbar, P08 local headings, P11 held-record rows, P20 status toast, P21 compact mobile gates | None |
| Dock | P01 compact utility controls, P12 functional pane bounds, P20 status toast, P21 accessible mobile tablist | None |
| Overlay | P01 compact utility controls, P08 local headings, P20 status toast | None |
| Cluster | P01 compact utility controls, P12 bounded cluster members, P20 status toast | None |
| Patchbay | P01 compact utility controls, P15 subordinate connection traces, P20 status toast | None |
| Chronicle | P01 compact utility controls, P15 subordinate time marks, P20 status toast | None |
| Vault | P01 compact utility controls, P12 bounded compartments, P20 status toast | None |

Cross-concept stress test:

| Concept | Persistent object | State transformation | Mobile preservation |
|---|---|---|---|
| Merge | Material changes | Review becomes stale, renewed, then merged | Unified change review |
| Stack | Working sheet stack | Authority sheet is pinned, ejected, or locked | Push/pop depth |
| Calibrate | Constraint snapshot | Editable values freeze or become stale | Focused control plus exact summary |
| Mosaic | Priority regions | Regions resize, separate, join, and convert to work | Two-dimensional named areas |
| Fork | Record branch | Revision forks and acceptance merges | Focused ancestry |
| Sieve | Qualified bundle | Records pass, hold, seal, and release | Compact narrowing gates |
| Dock | Open pane workspace | Records split, focus, pin, join, and restore | Active pane with retained tablist |
| Overlay | Authoritative record plane | Layers compare, void, stamp, and flatten | Portrait record plane |
| Cluster | Semantic membership field | Records regroup, eject, bind, and separate | Focused spatial islands |
| Patchbay | Functional connection circuit | Connections form, fail, stale, and hard-wire | Active bank with connection map |
| Chronicle | Effective-state chronicle | The entire record reconstructs at a selected moment | Vertical scrubber and full snapshot |
| Vault | Scoped custody chamber | Keys issue, quarantine, consume, reveal, and revoke | Central chamber with focused compartment |

## Repeated route templates

The shared workflow does not require these repeated compositions, but the suite currently treats them as defaults.

### Landing

Common structure:

1. brand and collection label;
2. large left-aligned statement;
3. supporting paragraph;
4. freelancer/client entry links;
5. preview panel, diagram, or record on the right.

The preview changes, but the two-column hero silhouette often does not.

### Home

Common structure:

1. eyebrow or record code;
2. large heading;
3. short explanatory paragraph;
4. urgent decision or workflow summary;
5. two- or three-column overview beneath it.

### Discovery and applicant review

Common structure:

- list, table, lane, or grid of records;
- local selected-record state;
- adjacent or subsequent detail inspector;
- primary action to open the complete gig or candidate.

Changing the list into artifacts, events, or threads does not change the interaction if the user still selects an item and reads an inspector.

### Gig and candidate

Common structure:

- identity/title block;
- evidence or deliverables in the main column;
- score, gap, availability, or commercial summary in an aside;
- action row at the bottom.

### Proposal

Common structure:

- grouped fields in the main area;
- immutable-version explanation;
- consequence, total, or next-version summary beside the form;
- submit action in a footer.

### Application

Common structure:

- current proposal and version;
- structured Q&A beside or below it;
- selection status callout;
- history or activity rows.

### Selection

Common structure:

- authoritative heading;
- three- or four-cell exact-terms summary;
- invalidated/expired status block;
- deadline selector for the client or acceptance action for the freelancer;
- action footer.

### Engagement

Common structure:

- accepted commercial terms;
- lifecycle control or activity history;
- contact permission in an aside;
- masked/revealed/revoked states expressed inside one bounded section.

## Prohibited-pattern register

Future concepts must not use the following structures as their governing composition. A small instance may appear when functionally necessary, but it cannot define the page silhouette, navigation, or primary interaction.

### Shell and navigation prohibitions

**P01 — Conventional sticky top app bar**

Do not begin with brand on the left, page navigation in the center, and role/reset controls on the right.

Already used by nearly the entire suite.

**P02 — 180–230px left rail plus content**

Do not use a persistent vertical navigation column beside a route-swapped main area.

Used by Northline, Covenant, Relay, Command, Harbor, Vector, and Atelier; Aperture and Waypoint use narrow variants.

**P03 — Fixed bottom workflow stepper**

Do not place five adjacent workflow destinations in a persistent bottom bar.

Used by Waypoint and echoed by several fixed suite footers.

**P04 — Five-column stage strip**

Do not represent Find, Propose, Review, Confirm, and Work as equal adjacent navigation cells above a board.

Used by Lane; related stage segmentation appears in Waypoint and Tempo.

**P05 — Header + max-width routed page**

Do not place every view inside a centered 1,400–1,500px page beneath a persistent shell.

Used across most concepts, including hybrids 16–20.

**P06 — Command field added to a conventional workspace**

Do not treat a slash field, suggestion overlay, and duplicated rail navigation as a new spatial thesis.

Used by Command and Vector.

**P07 — Five expandable workflow bands**

Do not use stacked accordion bands as both the navigation and disclosure model.

Used by Fold.

### Page-geometry prohibitions

**P08 — Left-aligned eyebrow → heading → paragraph**

Do not make this the universal entrance to every view. It is the most pervasive hierarchy in both grounded and bold concepts.

**P09 — Main column plus 280–380px summary aside**

Do not place evidence, a form, or activity in a wide column with totals, status, gap, or contact in a narrow right rail.

Used heavily by Northline, Relay, Tempo, Tally, Harbor, and many detail views elsewhere.

**P10 — Selectable list beside an inspector**

Do not make a left record list and right detail panel the primary discovery or review interaction.

Used by Northline, Waypoint, Tempo, Command, Tally, Trace, Harbor, Accord, Vector, Atelier, and others in equivalent form.

**P11 — Full-width pseudo-table rows**

Do not use repeated CSS-grid rows with record metadata in adjacent columns as the defining layout.

Used by Covenant, Relay, Monument, Facet, Fold, Tally, Lane, Command, and Index.

**P12 — Equal card or cell grid**

Do not turn stages, terms, evidence, artifacts, or participants into three, four, or five equal rectangular cells.

Used throughout the suite. Changing borders, gaps, or color does not create a new geometry.

**P13 — Bilateral columns with a center spine**

Do not represent client and specialist as left/right columns separated by an alignment or authority axis.

Used by Duet and Accord.

**P14 — Artifact wall, picker, or carousel**

Do not make evidence novelty depend on a grid of selectable tiles with one enlarged focused item.

Used by Aperture, Proofroom, and Atelier.

**P15 — Horizontal node or lineage chain**

Do not represent provenance as adjacent source, claim, consequence, and authority boxes connected by lines or arrows.

Used by Relay, Trace, and Vector.

### Workflow-view prohibitions

**P16 — Proposal form with side summary**

Do not separate editable terms from a narrow total/version/consequence panel.

**P17 — Four-up exact-terms block**

Do not arrange proposal, duration, capacity, and version as adjacent equal cells above the acceptance action.

**P18 — Confirmation sheet followed by action footer**

Do not use a bordered exact-record panel with the decisive controls attached to its bottom edge.

**P19 — Engagement terms plus contact aside**

Do not divide engagement into accepted work on the left and permission/contact state on the right.

**P20 — Fixed bottom-right toast as the only spatial response**

Do not communicate important state transitions solely through a detached notification while the surrounding geometry remains unchanged.

### Responsive prohibitions

**P21 — Novel desktop, generic mobile feed**

Do not solve mobile by changing every multi-column structure to `grid-template-columns: 1fr`.

**P22 — Horizontal overflow as preservation**

Do not claim that a wide board, table, stage strip, or lineage survives mobile merely because it can scroll sideways.

**P23 — Rail-to-five-cell-strip conversion**

Do not convert a desktop rail directly into five equal mobile navigation cells.

Used by Harbor, Vector, Atelier, and related shells.

**P24 — Hide secondary context**

Do not make a concept responsive by removing the event rail, inspector, metadata columns, or relationship that made the desktop thesis meaningful.

## Common visual traits that are not sufficient differentiation

The following may still be used, but none can serve as evidence that a concept is new:

- a new palette;
- serif versus sans-serif typography;
- uppercase codes and micro-labels;
- heavier rules or border removal;
- rounded versus square corners;
- warm paper, dark terminal, or monochrome styling;
- differently named cards, rooms, packets, threads, layers, or records;
- icon changes;
- hover color changes;
- denser or sparser spacing;
- a metaphor applied only through copy;
- a custom landing page followed by familiar application views.

## Future concept admission gate

No future concept should receive a name, palette, typography system, or parent pairing until it passes this gate.

### 1. Define the spatial thesis in monochrome

Document:

- the dominant axis or absence of an axis;
- what remains spatially persistent;
- what moves when state changes;
- how the user enters and exits detail;
- where authority lives;
- how client and freelancer perspectives relate;
- how the model behaves at both 1,440px and 390px.

The thesis must be understandable as grey boxes, lines, and motion annotations.

### 2. Name the primary manipulated object

The answer cannot merely be “a page,” “a card,” “a row,” “a panel,” or “a route.”

The same object should carry the workflow from discovery through engagement instead of being discarded whenever the route changes.

### 3. Demonstrate four representative views before styling

Provide structural wireframes for:

- discovery;
- proposal revision and selection invalidation;
- exact selection/acceptance;
- engagement contact permission.

A concept fails if only its home or discovery view is novel.

### 4. Compare against every prohibition

For each P01–P24, mark:

- absent;
- functionally necessary but subordinate;
- governing structure.

Any candidate with a prohibited pattern as its governing structure fails.

### 5. Run a similarity test against all thirty-two concepts

Compare:

- shell geometry;
- navigation topology;
- reading order;
- density;
- manipulated object;
- detail transition;
- state-change transformation;
- mobile transformation.

A candidate fails if it matches an existing concept on three of the first four dimensions, or on five of the eight dimensions overall.

### 6. Require meaningful state transformation

Revision, invalidation, acceptance, engagement creation, contact reveal, and revocation must change the spatial relationship of existing information—not only its color, badge, copy, or toast.

### 7. Validate mobile as the same thesis

The 390px version must preserve the central relationship through a deliberate transformation. It cannot default to:

- one long vertical feed;
- a horizontally scrolling desktop table;
- hidden context;
- a generic bottom navigation strip.

### 8. Apply visual identity last

Only after structural approval should the concept receive:

- a name;
- grounded or bold classification;
- color;
- typography;
- decorative treatment;
- motion character.

## Decision rule for the next round

A future concept is admissible only when it remains unmistakably different:

- with all text replaced by placeholders;
- in grayscale;
- without icons;
- in both desktop and mobile silhouettes;
- across the complete workflow, not only on its landing page.

If its identity disappears under those conditions, it is a reskin and should not be implemented.
