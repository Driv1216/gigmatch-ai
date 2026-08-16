import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const landingSource = read("../src/pages/LandingPage.tsx");
const shellSource = read("../src/components/ParticipantShell.tsx");
const commandSource = read("../src/components/ParticipantCommandSurface.tsx");
const dashboardShellSource = read("../src/components/DashboardPageShell.tsx");
const freelancerDashboardSource = read("../src/pages/FreelancerDashboardPage.tsx");
const clientDashboardSource = read("../src/pages/ClientDashboardPage.tsx");
const contextSource = read("../src/context/ParticipantHeaderContext.tsx");
const dismissalSource = read("../src/lib/useDismissibleLayer.ts");
const stylesSource = read("../src/styles.css");

test("landing lanes are one-open semantic disclosures with the approved copy", () => {
  assert.match(landingSource, /useState<string \| null>\(null\)/);
  assert.match(landingSource, /current === laneId \? null : laneId/);
  assert.match(landingSource, /aria-expanded=\{isOpen\}/);
  assert.match(landingSource, /aria-controls=\{panelId\}/);
  assert.match(landingSource, /role="region"/);
  assert.match(landingSource, /aria-labelledby=\{triggerId\}/);
  assert.match(landingSource, /switchboard-landing-lanes\$\{openLane \? " has-open-lane" : ""\}/);
  assert.doesNotMatch(landingSource, /<b aria-hidden="true">↗<\/b>/);
  assert.equal((landingSource.match(/copy: "/g) ?? []).length, 4);
  assert.match(stylesSource, /\.switchboard-landing-lanes \{[\s\S]*height: clamp\(/);
  assert.match(stylesSource, /\.switchboard-landing-lanes article \{[\s\S]*flex: 1 1 0;/);
  assert.match(stylesSource, /\.switchboard-landing-lanes:not\(\.has-open-lane\) article:focus-within \{ flex-grow: 1\.12; \}/);
  assert.match(stylesSource, /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.switchboard-landing-lanes:not\(\.has-open-lane\) article:hover \{ flex-grow: 1\.12; \}\s*\}/);
  assert.match(stylesSource, /@media \(max-width: 520px\)[\s\S]*\.switchboard-landing-lanes \{ height: auto;/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.switchboard-public-shell \*[\s\S]*transition-duration: \.001ms !important/);
});

test("participant identity preserves GigMatch AI and exposes only profile and logout actions", () => {
  assert.match(shellSource, /aria-label="GigMatch AI dashboard"/);
  assert.match(shellSource, /<strong>GigMatch AI<\/strong>/);
  assert.doesNotMatch(shellSource, /<small>Switchboard<\/small>/);
  const disclosure = shellSource.slice(shellSource.indexOf('id="participant-account-disclosure"'));
  assert.match(disclosure, />Profile<\/Link>/);
  assert.match(disclosure, />Logout<\/button>/);
  assert.doesNotMatch(disclosure, /Settings|Billing|Admin|switchRole/);
});

test("dashboard-only header context is lifecycle-safe and display-only", () => {
  assert.match(dashboardShellSource, /useParticipantHeaderContextRegistration\(headerContext\)/);
  assert.match(freelancerDashboardSource, /dashboardHeaderContext\("freelancer", state, dashboard\.data\)/);
  assert.match(clientDashboardSource, /dashboardHeaderContext\("client", state, dashboard\.data\)/);
  assert.match(contextSource, /current\?\.id === id \? null : current/);
  assert.match(shellSource, /contextResetKey/);
  const valueType = contextSource.slice(
    contextSource.indexOf("export type ParticipantHeaderContextValue"),
    contextSource.indexOf("type Registration"),
  );
  assert.doesNotMatch(contextSource, /localStorage|sessionStorage|contact|action_token/i);
  assert.doesNotMatch(valueType, /ReactNode|unknown|any/);
});

test("command and account share outside-pointer and Escape dismissal without mouseleave", () => {
  assert.match(commandSource, /useDismissibleLayer/);
  assert.match(shellSource, /useDismissibleLayer/);
  assert.match(dismissalSource, /event\.composedPath\(\)\.includes\(layer\)/);
  assert.match(dismissalSource, /dialog\[open\], \[role='dialog'\]\[aria-modal='true'\]/);
  assert.match(dismissalSource, /addEventListener\("pointerdown"/);
  assert.doesNotMatch(commandSource + shellSource + dismissalSource, /mouseleave|onMouseLeave/);
  assert.match(commandSource, /closeCommand\(reason === "escape"\)/);
});

test("valid focused textareas avoid Coral while truthful invalid textareas retain it", () => {
  assert.match(stylesSource, /Shared active-editing and truthful field-error language/);
  assert.match(stylesSource, /:focus \{[\s\S]*border-color: var\(--sw-ocean\)[\s\S]*var\(--sw-glass\)/);
  assert.match(stylesSource, /\[aria-invalid="true"\][\s\S]*border-color: var\(--sw-coral\)/);
  assert.match(stylesSource, /\.switchboard-auth-panel form :is\(input, select, textarea\):user-invalid/);
  assert.match(stylesSource, /\.switchboard-shell \.gig-form :is\(input, select, textarea\):user-invalid/);
  assert.doesNotMatch(stylesSource, /\.switchboard-shell :is\(input, select, textarea\):user-invalid/);
  assert.match(stylesSource, /\.switchboard-command-form input:focus-visible[\s\S]*box-shadow: inset 0 -2px 0 var\(--sw-glass\)/);

  const coralFocusRules = [...stylesSource.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^{}]*var\(--sw-coral\)[^{}]*)\}/g)];
  for (const [, selector] of coralFocusRules) {
    if (/(?:^|[\s,(>])(?:input|select|textarea)(?=[:.\[\s,)])/.test(selector)) {
      assert.match(selector, /aria-invalid|user-invalid/);
    }
  }

  assert.doesNotMatch(
    stylesSource,
    /\.switchboard-shell :is\(a, button, input, select, textarea, \[tabindex\]\):focus-visible/,
  );
  assert.doesNotMatch(
    stylesSource,
    /\.stage-two-page :is\(a, button, input, select, textarea\):focus-visible/,
  );
  assert.doesNotMatch(
    stylesSource,
    /\.stage-six-workspace :is\(button, input, select, textarea\):focus-visible/,
  );
  assert.doesNotMatch(
    stylesSource,
    /\.selection-(?:workspace|dialog) :is\(button, select, textarea, input\):focus-visible/,
  );
});
