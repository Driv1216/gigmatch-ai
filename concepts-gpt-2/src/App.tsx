import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Gallery } from "./gallery/Gallery";

const Northline = lazy(() => import("./concepts/northline/Northline").then((module) => ({ default: module.Northline })));
const Covenant = lazy(() => import("./concepts/covenant/Covenant").then((module) => ({ default: module.Covenant })));
const Waypoint = lazy(() => import("./concepts/waypoint/Waypoint").then((module) => ({ default: module.Waypoint })));
const Relay = lazy(() => import("./concepts/relay/Relay").then((module) => ({ default: module.Relay })));
const Monument = lazy(() => import("./concepts/monument/Monument").then((module) => ({ default: module.Monument })));
const Tempo = lazy(() => import("./concepts/tempo/Tempo").then((module) => ({ default: module.Tempo })));
const Duet = lazy(() => import("./concepts/duet/Duet").then((module) => ({ default: module.Duet })));
const Aperture = lazy(() => import("./concepts/aperture/Aperture").then((module) => ({ default: module.Aperture })));
const Facet = lazy(() => import("./concepts/facet/Facet").then((module) => ({ default: module.Facet })));
const Fold = lazy(() => import("./concepts/fold/Fold").then((module) => ({ default: module.Fold })));
const Tally = lazy(() => import("./concepts/tally/Tally").then((module) => ({ default: module.Tally })));
const Lane = lazy(() => import("./concepts/lane/Lane").then((module) => ({ default: module.Lane })));
const Command = lazy(() => import("./concepts/command/Command").then((module) => ({ default: module.Command })));
const Proofroom = lazy(() => import("./concepts/proofroom/Proofroom").then((module) => ({ default: module.Proofroom })));
const Trace = lazy(() => import("./concepts/trace/Trace").then((module) => ({ default: module.Trace })));
const Harbor = lazy(() => import("./concepts/harbor/Harbor").then((module) => ({ default: module.Harbor })));
const Accord = lazy(() => import("./concepts/accord/Accord").then((module) => ({ default: module.Accord })));
const Vector = lazy(() => import("./concepts/vector/Vector").then((module) => ({ default: module.Vector })));
const Atelier = lazy(() => import("./concepts/atelier/Atelier").then((module) => ({ default: module.Atelier })));
const Index = lazy(() => import("./concepts/index/Index").then((module) => ({ default: module.Index })));
const Bench = lazy(() => import("./concepts/bench/Bench").then((module) => ({ default: module.Bench })));
const Measure = lazy(() => import("./concepts/measure/Measure").then((module) => ({ default: module.Measure })));
const Crosscheck = lazy(() => import("./concepts/crosscheck/Crosscheck").then((module) => ({ default: module.Crosscheck })));
const Orbit = lazy(() => import("./concepts/orbit/Orbit").then((module) => ({ default: module.Orbit })));
const Weave = lazy(() => import("./concepts/weave/Weave").then((module) => ({ default: module.Weave })));
const Current = lazy(() => import("./concepts/current/Current").then((module) => ({ default: module.Current })));

function pending() {
  return <div className="route-loading" role="status">Preparing concept…</div>;
}

export function App() {
  return (
    <Suspense fallback={pending()}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/northline" element={<Northline />} />
        <Route path="/northline/:role/:view" element={<Northline />} />
        <Route path="/covenant" element={<Covenant />} />
        <Route path="/covenant/:role/:view" element={<Covenant />} />
        <Route path="/waypoint" element={<Waypoint />} />
        <Route path="/waypoint/:role/:view" element={<Waypoint />} />
        <Route path="/relay" element={<Relay />} />
        <Route path="/relay/:role/:view" element={<Relay />} />
        <Route path="/monument" element={<Monument />} />
        <Route path="/monument/:role/:view" element={<Monument />} />
        <Route path="/tempo" element={<Tempo />} />
        <Route path="/tempo/:role/:view" element={<Tempo />} />
        <Route path="/duet" element={<Duet />} />
        <Route path="/duet/:role/:view" element={<Duet />} />
        <Route path="/aperture" element={<Aperture />} />
        <Route path="/aperture/:role/:view" element={<Aperture />} />
        <Route path="/facet" element={<Facet />} />
        <Route path="/facet/:role/:view" element={<Facet />} />
        <Route path="/fold" element={<Fold />} />
        <Route path="/fold/:role/:view" element={<Fold />} />
        <Route path="/tally" element={<Tally />} />
        <Route path="/tally/:role/:view" element={<Tally />} />
        <Route path="/lane" element={<Lane />} />
        <Route path="/lane/:role/:view" element={<Lane />} />
        <Route path="/command" element={<Command />} />
        <Route path="/command/:role/:view" element={<Command />} />
        <Route path="/proofroom" element={<Proofroom />} />
        <Route path="/proofroom/:role/:view" element={<Proofroom />} />
        <Route path="/trace" element={<Trace />} />
        <Route path="/trace/:role/:view" element={<Trace />} />
        <Route path="/harbor" element={<Harbor />} />
        <Route path="/harbor/:role/:view" element={<Harbor />} />
        <Route path="/accord" element={<Accord />} />
        <Route path="/accord/:role/:view" element={<Accord />} />
        <Route path="/vector" element={<Vector />} />
        <Route path="/vector/:role/:view" element={<Vector />} />
        <Route path="/atelier" element={<Atelier />} />
        <Route path="/atelier/:role/:view" element={<Atelier />} />
        <Route path="/index" element={<Index />} />
        <Route path="/index/:role/:view" element={<Index />} />
        <Route path="/bench" element={<Bench />} />
        <Route path="/bench/:role/:view" element={<Bench />} />
        <Route path="/measure" element={<Measure />} />
        <Route path="/measure/:role/:view" element={<Measure />} />
        <Route path="/crosscheck" element={<Crosscheck />} />
        <Route path="/crosscheck/:role/:view" element={<Crosscheck />} />
        <Route path="/orbit" element={<Orbit />} />
        <Route path="/orbit/:role/:view" element={<Orbit />} />
        <Route path="/weave" element={<Weave />} />
        <Route path="/weave/:role/:view" element={<Weave />} />
        <Route path="/current" element={<Current />} />
        <Route path="/current/:role/:view" element={<Current />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
