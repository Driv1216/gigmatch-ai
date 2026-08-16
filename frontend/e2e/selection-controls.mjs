import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";

const externalOrigin = process.env.SELECTION_FIXTURE_ORIGIN;
const origin = externalOrigin ?? "http://127.0.0.1:4174";
const server = externalOrigin ? null : spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4174"], {
  stdio: ["ignore", "pipe", "pipe"],
});
if (server) await waitForServer(server);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(7_500);
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(`${origin}/e2e/selection-controls.fixture.html`);
  await page.getByRole("heading", { name: "Selection controls browser fixture" }).waitFor();

  const ordinary = page.getByRole("combobox", { name: "Difficulty level" });
  await ordinary.focus();
  await page.waitForTimeout(180);
  const focusedBorder = await ordinary.evaluate((element) => getComputedStyle(element).borderColor);
  if (focusedBorder !== "rgb(7, 63, 89)") throw new Error(`valid focus was not Ocean: ${focusedBorder}`);
  await ordinary.press("Enter");
  await page.getByRole("option", { name: "Advanced" }).click();
  if (await page.getByTestId("ordinary-value").textContent() !== "advanced") throw new Error("ordinary value changed contract");
  await ordinary.press("Enter");
  if (await page.getByRole("option", { name: "Advanced" }).getAttribute("data-state") !== "checked") throw new Error("reopening did not retain the current selection");
  await page.keyboard.press("Escape");
  if (!(await ordinary.evaluate((element) => element === document.activeElement))) throw new Error("Escape did not restore trigger focus");
  await ordinary.press(" ");
  await page.getByRole("option", { name: "Intermediate" }).waitFor();
  await page.keyboard.press("Escape");
  await ordinary.click();
  await page.keyboard.press("i");
  await page.waitForTimeout(100);
  if (!(await page.getByRole("option", { name: "Intermediate" }).evaluate((element) => element.hasAttribute("data-highlighted")))) throw new Error("Radix typeahead did not highlight Intermediate");
  await page.keyboard.press("Enter");
  const typeaheadValue = await page.getByTestId("ordinary-value").textContent();
  if (typeaheadValue !== "intermediate") throw new Error(`Radix typeahead did not select the canonical value: ${typeaheadValue}`);
  await ordinary.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
  const arrowValue = await page.getByTestId("ordinary-value").textContent();
  if (arrowValue !== "advanced") throw new Error(`Arrow navigation did not select the next option: ${arrowValue}`);
  await ordinary.press("Enter");
  await page.waitForTimeout(50);
  const headingBox = await page.locator("h1").boundingBox();
  if (!headingBox) throw new Error("outside-pointer target was unavailable");
  await page.mouse.click(headingBox.x + 4, headingBox.y + 4);
  await page.locator(".gig-select-content").waitFor({ state: "detached" });
  process.stdout.write("ordinary Select passed\n");

  await page.getByRole("radio", { name: "72 hours" }).check();
  if (await page.getByTestId("deadline-value").textContent() !== "72:number") throw new Error("numeric ChoiceGroup value became a string");
  await page.getByRole("radio", { name: "72 hours" }).press("Tab");
  if (!(await page.getByRole("combobox", { name: "Invalid example" }).evaluate((element) => element === document.activeElement))) throw new Error("Tab progression did not leave the ChoiceGroup appropriately");
  process.stdout.write("typed ChoiceGroup passed\n");

  const invalid = page.getByRole("combobox", { name: "Invalid example" });
  const invalidBorder = await invalid.evaluate((element) => getComputedStyle(element).borderColor);
  if (invalidBorder !== "rgb(227, 95, 72)") throw new Error(`truthful invalid state was not Coral: ${invalidBorder}`);
  await invalid.focus();
  await page.waitForTimeout(180);
  const focusedInvalid = await invalid.evaluate((element) => ({ border: getComputedStyle(element).borderColor, outline: getComputedStyle(element).outlineColor }));
  if (focusedInvalid.border !== "rgb(227, 95, 72)" || focusedInvalid.outline !== "rgb(7, 63, 89)") throw new Error(`focused-invalid state lost Coral/Ocean distinction: ${JSON.stringify(focusedInvalid)}`);
  if (!(await page.getByRole("combobox", { name: "Disabled example" }).isDisabled())) throw new Error("disabled Select remained interactive");
  const disabledOptionSelect = page.getByRole("combobox", { name: "Disabled-option example" });
  await disabledOptionSelect.click();
  if (!(await page.getByRole("option", { name: "Restricted" }).evaluate((element) => element.hasAttribute("data-disabled")))) throw new Error("disabled option state was not exposed");
  await page.keyboard.press("Escape");

  const constrained = page.getByRole("combobox", { name: "Constrained reason" });
  await constrained.click();
  const constrainedContent = page.locator(".gig-select-content");
  if (!(await constrainedContent.evaluate((element) => Boolean(element.closest(".switchboard-shell")) && !element.closest('[data-testid="clipped-container"]')))) {
    throw new Error("constrained Select did not portal outside its clipping container");
  }
  await page.keyboard.press("Escape");
  process.stdout.write("clipped-container portal passed\n");

  const collision = page.getByRole("combobox", { name: "Collision reason" });
  await collision.click();
  const collisionContent = page.locator(".gig-select-content");
  if (await collisionContent.getAttribute("data-side") !== "top") throw new Error("viewport collision did not flip the listbox above its trigger");
  const viewportMetrics = await collisionContent.locator(".gig-select-viewport").evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
  if (viewportMetrics.scrollHeight <= viewportMetrics.clientHeight) throw new Error("long-list viewport did not become scrollable");
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (await collisionContent.evaluate((element) => getComputedStyle(element).animationName) !== "none") throw new Error("reduced motion did not remove listbox animation");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
  await invalid.focus();
  if (await invalid.evaluate((element) => getComputedStyle(element).outlineStyle) === "none") throw new Error("forced-colors focus outline was not visible");
  await page.emulateMedia({ forcedColors: "none" });

  await page.getByRole("button", { name: "Open native dialog" }).click();
  const dialog = page.getByRole("dialog");
  const dialogSelect = dialog.getByRole("combobox", { name: "Structured reason" });
  await dialogSelect.click();
  const dialogPortalState = await page.locator(".gig-select-content").evaluate((element) => ({
    inOpenDialog: element.closest("dialog")?.open === true,
    parent: element.parentElement?.tagName,
    triggerInOpenDialog: document.querySelector('dialog .gig-select-trigger')?.closest("dialog[open]") !== null,
  }));
  if (!dialogPortalState.inOpenDialog) {
    throw new Error(`dialog Select portal was not hosted in the nearest open dialog: ${JSON.stringify(dialogPortalState)}`);
  }
  await page.keyboard.press("Escape");
  if (!(await dialog.evaluate((element) => element.open))) throw new Error("closing Select also closed its owning dialog");
  if (!(await dialogSelect.evaluate((element) => element === document.activeElement))) throw new Error("dialog Select did not restore focus");
  await dialog.getByRole("button", { name: "Close dialog" }).click();

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.getByRole("heading", { name: "Selection controls browser fixture" }).waitFor();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (horizontalOverflow) throw new Error(`fixture overflowed horizontally at ${width}px`);
    await page.getByRole("combobox", { name: "Constrained reason" }).click();
    const contentOverflow = await page.locator(".gig-select-content").evaluate((element) => element.scrollWidth > element.clientWidth);
    if (contentOverflow) throw new Error(`long Select labels overflowed at ${width}px`);
    await page.keyboard.press("Escape");
  }

  if (errors.length) throw new Error(`browser errors: ${errors.join(" | ")}`);
  process.stdout.write("selection controls browser proof passed\n");
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}

async function waitForServer(child) {
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Vite fixture server exited early:\n${output}`);
    try {
      const response = await fetch(`${origin}/e2e/selection-controls.fixture.html`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill("SIGTERM");
  throw new Error(`Vite fixture server did not become ready:\n${output}`);
}
