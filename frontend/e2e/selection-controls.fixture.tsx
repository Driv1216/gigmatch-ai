/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChoiceGroup } from "../src/components/ChoiceGroup";
import { GigSelect } from "../src/components/GigSelect";
import "../src/styles.css";

const ordinaryOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

const disabledOptionSet = [
  { value: "available", label: "Available" },
  { value: "restricted", label: "Restricted", disabled: true },
] as const;

const longOptions = Array.from({ length: 18 }, (_, index) => ({
  value: `reason_${index + 1}`,
  label: index === 17 ? "A deliberately long final reason that must wrap without horizontal overflow" : `Reason ${index + 1}`,
}));

function Fixture() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [ordinary, setOrdinary] = useState<"" | (typeof ordinaryOptions)[number]["value"]>("");
  const [clipped, setClipped] = useState("reason_1");
  const [dialogReason, setDialogReason] = useState("reason_1");
  const [collisionReason, setCollisionReason] = useState("reason_1");
  const [disabledOption, setDisabledOption] = useState<(typeof disabledOptionSet)[number]["value"]>("available");
  const [deadline, setDeadline] = useState<24 | 48 | 72>(48);

  return (
    <main className="switchboard-shell" style={{ minHeight: "100vh", padding: 32 }}>
      <h1>Selection controls browser fixture</h1>
      <section>
        <label><span>Difficulty level</span><GigSelect value={ordinary} onValueChange={setOrdinary} options={ordinaryOptions} placeholder="Select difficulty" /></label>
        <output data-testid="ordinary-value">{ordinary || "empty"}</output>
      </section>

      <section style={{ marginTop: 28 }}>
        <ChoiceGroup
          legend="Selection-response deadline"
          name="deadline"
          value={deadline}
          onValueChange={setDeadline}
          options={[24, 48, 72].map((value) => ({ value: value as 24 | 48 | 72, label: `${value} hours` }))}
        />
        <output data-testid="deadline-value">{`${deadline}:${typeof deadline}`}</output>
      </section>

      <section style={{ marginTop: 28 }}>
        <label><span>Invalid example</span><GigSelect value="" onValueChange={() => undefined} options={ordinaryOptions} invalid aria-describedby="invalid-note" /></label>
        <small id="invalid-note">Existing truthful error</small>
        <label><span>Disabled example</span><GigSelect value="available" onValueChange={() => undefined} options={disabledOptionSet} disabled /></label>
        <label><span>Disabled-option example</span><GigSelect value={disabledOption} onValueChange={setDisabledOption} options={disabledOptionSet} /></label>
      </section>

      <section data-testid="clipped-container" style={{ width: 320, height: 82, marginTop: 28, overflow: "hidden", border: "2px solid var(--sw-ink)", padding: 12 }}>
        <label><span>Constrained reason</span><GigSelect value={clipped} onValueChange={setClipped} options={longOptions} /></label>
      </section>

      <button type="button" style={{ marginTop: 28 }} onClick={() => dialogRef.current?.showModal()}>Open native dialog</button>
      <div style={{ position: "fixed", right: 12, bottom: 12, width: 260 }}>
        <label><span>Collision reason</span><GigSelect value={collisionReason} onValueChange={setCollisionReason} options={longOptions} /></label>
      </div>

      <dialog ref={dialogRef} className="application-withdrawal-dialog" onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); dialogRef.current?.close(); } }}>
        <form method="dialog">
          <header><h2>Native dialog proof</h2></header>
          <div className="application-withdrawal-body">
            <label><span>Structured reason</span><GigSelect value={dialogReason} onValueChange={setDialogReason} options={longOptions} /></label>
          </div>
          <footer><button value="close">Close dialog</button></footer>
        </form>
      </dialog>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
