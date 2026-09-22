import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const origin = process.env.AUTH_VISUAL_ORIGIN ?? "http://127.0.0.1:5173";
const outputDirectory = process.env.AUTH_VISUAL_OUTPUT ?? "/private/tmp/gigmatch-auth-visual";
const viewports = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));

    await page.goto(`${origin}/signup`, { waitUntil: "networkidle" });
    check((await page.locator("body").innerText()).trim().length > 0, `${viewport.name}: blank signup page`);
    check(await page.locator("vite-error-overlay, .vite-error-overlay, [data-nextjs-dialog]").count() === 0, `${viewport.name}: framework error overlay`);
    check(await page.getByRole("heading", { name: "Create account" }).count() === 1, `${viewport.name}: signup heading missing`);
    check(await page.getByRole("button", { name: "Continue with Google" }).count() === 1, `${viewport.name}: Google control missing`);
    check(await page.getByText("OR", { exact: true }).count() === 1, `${viewport.name}: OR divider missing`);
    check(await page.locator("#password-rules li").count() === 5, `${viewport.name}: five-rule checklist missing`);
    check(await page.locator("#signup-password-confirmation").count() === 1, `${viewport.name}: confirmation field missing`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${viewport.name}: horizontal overflow of ${overflow}px`);

    const password = page.locator("#signup-password");
    const showPassword = page.getByRole("button", { name: "Show password" });
    await password.fill("Valid9!x");
    await showPassword.click();
    check(await password.getAttribute("type") === "text", `${viewport.name}: show-password control failed`);
    check(await showPassword.getAttribute("aria-pressed") === "true", `${viewport.name}: show-password state not exposed`);

    await page.screenshot({ path: `${outputDirectory}/signup-${viewport.name}.png`, fullPage: true });
    check(errors.length === 0, `${viewport.name}: ${errors.join(" | ")}`);
    await page.close();
  }

  const routePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const routeErrors = [];
  routePage.on("console", (message) => {
    if (message.type() === "error") routeErrors.push(message.text());
  });
  routePage.on("pageerror", (error) => routeErrors.push(error.message));

  await routePage.goto(`${origin}/login`, { waitUntil: "networkidle" });
  check(await routePage.getByRole("heading", { name: "Login", exact: true }).count() === 1, "login page did not render");
  check(await routePage.getByRole("button", { name: "Continue with Google" }).count() === 1, "login Google control missing");

  await routePage.goto(`${origin}/auth/callback#error=access_denied`, { waitUntil: "networkidle" });
  check(await routePage.getByRole("heading", { name: "Unable to continue" }).count() === 1, "provider cancellation state missing");

  await routePage.goto(`${origin}/account/setup`, { waitUntil: "networkidle" });
  check(new URL(routePage.url()).pathname === "/login", "signed-out setup route did not converge to login");

  await routePage.goto(origin, { waitUntil: "networkidle" });
  check(await routePage.getByRole("heading", { name: /Match the work/ }).count() === 1, "landing page did not render");
  check(routeErrors.length === 0, `route verification errors: ${routeErrors.join(" | ")}`);
  await routePage.close();

  console.log(`Auth browser verification passed at ${viewports.map((item) => item.name).join("/")}px.`);
} finally {
  await browser.close();
}
