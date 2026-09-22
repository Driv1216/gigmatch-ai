import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Info,
  Monitor,
  RotateCcw,
  Smartphone,
  X,
} from "lucide-react";
import { CONCEPTS, GIGS, APPLICANTS } from "./data";
import type { AppState, ConceptId, Role, ViewId } from "./types";
import { Concierge } from "./concepts/Concierge";
import { Ledger } from "./concepts/Ledger";
import { Exchange } from "./concepts/Exchange";
import { Workroom } from "./concepts/Workroom";
import { Pocket } from "./concepts/Pocket";
import { Studio } from "./concepts/Studio";
import { SignalIndex } from "./concepts/SignalIndex";
import { Afterdark } from "./concepts/Afterdark";

const initialState: AppState = {
  applied: true,
  applicationStage: "Selection pending",
  applicationVersion: 2,
  shortlisted: true,
  advanced: true,
  selectionSent: true,
  accepted: false,
};

function readHash(): { concept: ConceptId; role: Role; view: ViewId } {
  const [conceptValue, roleValue, viewValue] = window.location.hash.replace(/^#\/?/, "").split("/");
  const concept = CONCEPTS.some((item) => item.id === conceptValue) ? conceptValue as ConceptId : "concierge";
  const role = roleValue === "client" ? "client" : "freelancer";
  const allowed = ["overview", "market", "proposal", "applications", "review", "engagement"];
  const fallback = "overview";
  const view = allowed.includes(viewValue) ? viewValue as ViewId : fallback;
  return { concept, role, view };
}

function validView(role: Role, view: ViewId): ViewId {
  if (role === "client" && ["market", "proposal", "applications"].includes(view)) return "overview";
  if (role === "freelancer" && view === "review") return "overview";
  return view;
}

export function App() {
  const initial = readHash();
  const [concept, setConcept] = useState<ConceptId>(initial.concept);
  const [role, setRole] = useState<Role>(initial.role);
  const [view, setView] = useState<ViewId>(validView(initial.role, initial.view));
  const [activeGigId, setActiveGigId] = useState(GIGS[0].id);
  const [state, setState] = useState<AppState>(initialState);
  const [toast, setToast] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeGig = useMemo(() => GIGS.find((gig) => gig.id === activeGigId) ?? GIGS[0], [activeGigId]);
  const meta = CONCEPTS.find((item) => item.id === concept)!;

  useEffect(() => {
    const nextHash = `#/${concept}/${role}/${view}`;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  }, [concept, role, view]);

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash();
      setConcept(next.concept);
      setRole(next.role);
      setView(validView(next.role, next.view));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuideOpen(false);
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (next: ViewId) => setView(validView(role, next));
  const switchRole = (next: Role) => {
    setRole(next);
    setView(next === "freelancer" ? "overview" : "overview");
  };

  const shared = {
    role,
    view,
    gigs: GIGS,
    activeGig,
    applicants: APPLICANTS,
    state,
    onNavigate: navigate,
    onSelectGig: setActiveGigId,
    onApply: () => {
      setState((current) => ({
        ...current,
        applied: true,
        applicationStage: "Under review",
        advanced: false,
        shortlisted: false,
        selectionSent: false,
        accepted: false,
      }));
      setToast("Application version recorded");
    },
    onShortlist: () => {
      setState((current) => ({ ...current, shortlisted: !current.shortlisted }));
      setToast(state.shortlisted ? "Removed from private shortlist" : "Saved to private shortlist");
    },
    onAdvance: () => {
      setState((current) => ({
        ...current,
        advanced: !current.advanced,
        applicationStage: current.advanced ? "Under review" : "Advanced",
        selectionSent: current.advanced ? false : current.selectionSent,
      }));
      setToast(state.advanced ? "Returned to general review" : "Applicant formally advanced");
    },
    onSendSelection: () => {
      setState((current) => ({ ...current, selectionSent: true, applicationStage: "Selection pending" }));
      setToast("Version-bound selection request sent");
    },
    onAccept: () => {
      setState((current) => ({ ...current, accepted: true, applicationStage: "Confirmed" }));
      setToast("Exact terms accepted · engagement confirmed");
      window.setTimeout(() => setView("engagement"), 650);
    },
    onToast: setToast,
  };

  return (
    <div className="concept-lab">
      <div className="lab-bar">
        <button className="lab-concept-button" onClick={() => setSwitcherOpen((open) => !open)} aria-expanded={switcherOpen}>
          <span>{meta.number}</span>
          <div><strong>{meta.name}</strong><small>{meta.thesis}</small></div>
          <ChevronDown size={15} />
        </button>
        <div className="lab-role-switch" aria-label="Change product perspective">
          <button className={role === "freelancer" ? "is-active" : ""} onClick={() => switchRole("freelancer")}>Freelancer</button>
          <button className={role === "client" ? "is-active" : ""} onClick={() => switchRole("client")}>Client</button>
        </div>
        <div className="lab-actions">
          <span className="lab-viewport"><Monitor size={14} /><span>Responsive concept</span><Smartphone size={13} /></span>
          <button onClick={() => setGuideOpen(true)}><Info size={15} /> <span>Concept notes</span></button>
          <button aria-label="Reset demo" title="Reset demo" onClick={() => { setState(initialState); setView("overview"); setToast("Demo state reset"); }}><RotateCcw size={15} /></button>
        </div>
      </div>

      {switcherOpen && (
        <div className="concept-switcher-panel">
          <div className="concept-switcher-panel__head"><div><span>Eight product directions</span><strong>Choose a concept</strong></div><button onClick={() => setSwitcherOpen(false)}><X size={18} /></button></div>
          <div className="concept-switcher-grid">
            {CONCEPTS.map((item) => (
              <button key={item.id} className={concept === item.id ? "is-active" : ""} onClick={() => { setConcept(item.id); setSwitcherOpen(false); }}>
                <span>{item.number}</span><div><strong>{item.name}</strong><p>{item.thesis}</p><small>{item.interaction}</small></div>{concept === item.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {concept === "concierge" && <Concierge {...shared} />}
      {concept === "ledger" && <Ledger {...shared} />}
      {concept === "exchange" && <Exchange {...shared} />}
      {concept === "workroom" && <Workroom {...shared} />}
      {concept === "pocket" && <Pocket {...shared} />}
      {concept === "studio" && <Studio {...shared} />}
      {concept === "signal-index" && <SignalIndex {...shared} />}
      {concept === "afterdark" && <Afterdark {...shared} />}

      {guideOpen && (
        <div className="guide-overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title">
          <button className="guide-backdrop" aria-label="Close concept notes" onClick={() => setGuideOpen(false)} />
          <section>
            <header><span>{meta.number}</span><div><small>Concept thesis</small><h2 id="guide-title">{meta.name}</h2></div><button onClick={() => setGuideOpen(false)}><X size={18} /></button></header>
            <p className="guide-thesis">{meta.thesis}</p>
            <dl>
              <div><dt>Primary interaction model</dt><dd>{meta.interaction}</dd></div>
              <div><dt>Shared comparison workflow</dt><dd>Discover → explain match → structured proposal → ranked review → version-bound selection → engagement record.</dd></div>
              <div><dt>Product stance</dt><dd>Suitability evidence stays separate from price. Formal decisions remain explicit and audit-friendly.</dd></div>
            </dl>
            <div className="guide-tip"><Info size={16} /><p>Switch roles in the top bar to see how this direction serves both sides of the marketplace. State is shared across all eight concepts for fair comparison.</p></div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={15} /> {toast}</div>}
    </div>
  );
}
