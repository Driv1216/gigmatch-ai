import { Fragment } from "react";
import { ArrowUpRight, Check, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkflow } from "../domain/useWorkflow";
import "./gallery.css";

const concepts = [
  {
    id: "northline",
    number: "01",
    name: "Northline",
    type: "Grounded",
    thesis: "Action workspace",
    detail: "Compact, evidence-first, and immediately credible for production.",
    entry: "/northline/freelancer/home",
  },
  {
    id: "covenant",
    number: "02",
    name: "Covenant",
    type: "Grounded",
    thesis: "Premium casebook",
    detail: "Commercial terms, revisions, and decisions treated as durable records.",
    entry: "/covenant/client/home",
  },
  {
    id: "waypoint",
    number: "03",
    name: "Waypoint",
    type: "Bold",
    thesis: "Spatial journey",
    detail: "The marketplace workflow becomes a sequence of focused destinations.",
    entry: "/waypoint/freelancer/home",
  },
  {
    id: "relay",
    number: "04",
    name: "Relay",
    type: "Bold",
    thesis: "Protocol interface",
    detail: "Versions, decisions, and permissions connected in one auditable chain.",
    entry: "/relay/client/home",
  },
  {
    id: "monument",
    number: "05",
    name: "Monument",
    type: "Bold",
    thesis: "Typographic market",
    detail: "A serious marketplace made from rhythm, type, and edge-to-edge structure.",
    entry: "/monument/freelancer/home",
  },
  {
    id: "tempo",
    number: "06",
    name: "Tempo",
    type: "Grounded",
    thesis: "Time and capacity planner",
    detail: "Deadlines, availability, and delivery phases become the operating structure.",
    entry: "/tempo/freelancer/home",
  },
  {
    id: "duet",
    number: "07",
    name: "Duet",
    type: "Bold",
    thesis: "Mirrored agreement",
    detail: "Client requirements and specialist terms stay visible on opposite sides.",
    entry: "/duet/client/home",
  },
  {
    id: "aperture",
    number: "08",
    name: "Aperture",
    type: "Bold",
    thesis: "Semantic zoom",
    detail: "Move from market to exact terms by changing depth, not changing dashboards.",
    entry: "/aperture/freelancer/home",
  },
  {
    id: "facet",
    number: "09",
    name: "Facet",
    type: "Bold",
    thesis: "Evidence lattice",
    detail: "Every comparison cell answers a real marketplace decision question.",
    entry: "/facet/client/home",
  },
  {
    id: "fold",
    number: "10",
    name: "Fold",
    type: "Bold",
    thesis: "Expandable workflow",
    detail: "The complete journey lives in five connected, expanding bands.",
    entry: "/fold/freelancer/home",
  },
  {
    id: "tally",
    number: "11",
    name: "Tally",
    type: "Grounded",
    thesis: "Commercial scope register",
    detail: "Evidence, delivery packages, and exact quote composition remain accountable.",
    entry: "/tally/freelancer/home",
  },
  {
    id: "lane",
    number: "12",
    name: "Lane",
    type: "Bold",
    thesis: "Parallel workflow lanes",
    detail: "Several records remain visible across market stages at the same time.",
    entry: "/lane/client/home",
  },
  {
    id: "command",
    number: "13",
    name: "Command",
    type: "Bold",
    thesis: "Keyboard-first workspace",
    detail: "Direct intent replaces persistent menus without removing clickable access.",
    entry: "/command/freelancer/home",
  },
  {
    id: "proofroom",
    number: "14",
    name: "Proofroom",
    type: "Bold",
    thesis: "Evidence-artifact gallery",
    detail: "Reviewed work artifacts lead discovery, proposals, and applicant review.",
    entry: "/proofroom/client/home",
  },
  {
    id: "trace",
    number: "15",
    name: "Trace",
    type: "Bold",
    thesis: "Decision provenance",
    detail: "Every important claim exposes its source, evidence, and consequence.",
    entry: "/trace/freelancer/home",
  },
  {
    id: "harbor",
    number: "16",
    name: "Harbor",
    type: "Grounded",
    thesis: "Action and capacity workspace",
    detail: "Northline’s focused operating view meets Tempo’s credible time commitments.",
    parents: "Northline × Tempo",
    entry: "/harbor/freelancer/home",
  },
  {
    id: "accord",
    number: "17",
    name: "Accord",
    type: "Grounded",
    thesis: "Bilateral premium case file",
    detail: "Covenant’s durable record reconciles both positions through Duet’s alignment spine.",
    parents: "Covenant × Duet",
    entry: "/accord/client/home",
  },
  {
    id: "vector",
    number: "18",
    name: "Vector",
    type: "Bold",
    thesis: "Command and provenance",
    detail: "Direct intent from Command exposes the source and consequence logic of Trace.",
    parents: "Command × Trace",
    entry: "/vector/freelancer/home",
  },
  {
    id: "atelier",
    number: "19",
    name: "Atelier",
    type: "Bold",
    thesis: "Semantic evidence rooms",
    detail: "Aperture’s depth model moves through Proofroom’s reviewed artifact collection.",
    parents: "Aperture × Proofroom",
    entry: "/atelier/client/home",
  },
  {
    id: "index",
    number: "20",
    name: "Index",
    type: "Bold",
    thesis: "Typographic comparison market",
    detail: "Monument’s full-width rhythm gives Facet’s normalized comparison a stronger voice.",
    parents: "Monument × Facet",
    entry: "/index/freelancer/home",
  },
  {
    id: "bench",
    number: "21",
    name: "Bench",
    type: "Grounded",
    thesis: "Focused work session",
    detail: "One active record, contextual intent, and exact durable authority without a dashboard shell.",
    entry: "/bench/freelancer/home",
  },
  {
    id: "measure",
    number: "22",
    name: "Measure",
    type: "Grounded",
    thesis: "Coupled delivery instrument",
    detail: "Scope, capacity, time, and quote consequences inhabit one responsive fourteen-week scale.",
    entry: "/measure/freelancer/home",
  },
  {
    id: "crosscheck",
    number: "23",
    name: "Crosscheck",
    type: "Grounded",
    thesis: "Effective-state crosshair",
    detail: "Requirements and versions intersect while both parties’ positions remain attributable.",
    entry: "/crosscheck/client/home",
  },
  {
    id: "orbit",
    number: "24",
    name: "Orbit",
    type: "Bold",
    thesis: "Semantic orbital field",
    detail: "Market, brief, application, authority, and engagement remain spatially related at every depth.",
    entry: "/orbit/freelancer/home",
  },
  {
    id: "weave",
    number: "25",
    name: "Weave",
    type: "Bold",
    thesis: "Inspectable provenance weave",
    detail: "Evidence, promises, versions, authority, and permissions bind only through valid sources.",
    entry: "/weave/client/home",
  },
  {
    id: "current",
    number: "26",
    name: "Current",
    type: "Bold",
    thesis: "Continuous workflow current",
    detail: "Records flow, divert on revision, and enter work atomically while context stays visible.",
    entry: "/current/freelancer/home",
  },
] as const;

const presets = ["baseline", "revision", "invalidated", "expired", "engaged"] as const;

export function Gallery() {
  const { state, dispatch } = useWorkflow();
  return (
    <main id="main-content" className="gallery">
      <header className="gallery__head">
        <div className="gallery__brand"><span>GM</span><b>GigMatch AI</b></div>
        <div className="gallery__state">
          <Check size={15} />
          Shared scenario: {state.applicationStage} · application v{state.applicationVersion}
          <label>State
            <select defaultValue="baseline" onChange={(event) => dispatch({ type: "load-preset", preset: event.target.value as (typeof presets)[number] })}>
              {presets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
            </select>
          </label>
          <button onClick={() => dispatch({ type: "reset" })}><RotateCcw size={14} /> Reset</button>
        </div>
      </header>
      <section className="gallery__intro">
        <p>Concept suite II · 2026</p>
        <h1>Twenty-six different answers<br />to the same marketplace.</h1>
        <div>
          <p>Each direction follows the same client and freelancer journey—from evidence-led discovery to exact-term confirmation and secure engagement.</p>
          <span>9 grounded · 17 bold · no shared shell</span>
        </div>
      </section>
      <section className="gallery__list" aria-label="Concepts">
        {concepts.map((concept, index) => (
          <Fragment key={concept.id}>
            {(index === 0 || index === 5 || index === 10 || index === 15 || index === 20) && <div className="gallery__collection"><b>{index === 0 ? "Original collection" : index === 5 ? "Expansion collection I" : index === 10 ? "Expansion collection II" : index === 15 ? "Hybrid collection" : "Final collection"}</b><span>{index === 0 ? "Directions 01–05" : index === 5 ? "Directions 06–10" : index === 10 ? "Directions 11–15" : index === 15 ? "Directions 16–20 · two clear parents" : "Directions 21–26 · six final operating models"}</span></div>}
            <Link to={concept.entry} className={`gallery__concept gallery__concept--${concept.id} ${index === 5 ? "gallery__concept--new-set" : ""}`}>
              <span className="gallery__number">{concept.number}</span>
              <div className="gallery__name"><small>{concept.type}</small><h2>{concept.name}</h2></div>
              <div className="gallery__description"><b>{concept.thesis}</b><p>{concept.detail}</p>{"parents" in concept && <small>{concept.parents}</small>}</div>
              <span className="gallery__open">Enter <ArrowUpRight size={18} /></span>
            </Link>
          </Fragment>
        ))}
      </section>
      <footer className="gallery__foot">
        <p>Use the role control inside each concept to compare both sides of the same workflow.</p>
        <p>No backend · state persists locally</p>
      </footer>
    </main>
  );
}
