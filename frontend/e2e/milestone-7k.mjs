import { chromium } from "@playwright/test";

const config = JSON.parse(await readStdin());
const {
  frontend_origin: frontendOrigin,
  backend_origin: backendOrigin,
  supabase_origin: supabaseOrigin,
  run_id: runId,
  contact_sentinel: contactSentinel,
  actors,
} = config;

const allowedOrigins = new Set([frontendOrigin, backendOrigin, supabaseOrigin]);
const forbiddenResponseKeys = new Set([
  "access_token",
  "refresh_token",
  "service_role_key",
  "supabase_secret_key",
  "raw_text",
  "raw_resume",
  "raw_resume_text",
  "raw_gig_text",
  "embedding",
  "embeddings",
  "ciphertext",
  "nonce",
  "key_id",
  "source_digest",
  "canonical_value_fingerprint",
  "operation_fingerprint",
  "private_report",
  "report_detail",
]);
const responseAudits = [];
const contexts = [];
const pageFailures = [];
const unexpectedRequests = [];
const expectedFailurePages = new WeakSet();

const mainTitle = `Milestone 7K Main ${runId}`;
const secondTitle = `Milestone 7K Invalidation ${runId}`;
const meetingUrl = `https://meet.example.test/${contactSentinel}`;

const browser = await chromium.launch({ headless: true });

try {
  await proveUnauthenticatedDenial();

  const clientA = await actorPage("client_a");
  const clientB = await actorPage("client_b");
  const freelancerA = await actorPage("freelancer_a");
  const freelancerB = await actorPage("freelancer_b");

  await proveWrongRoleRedirects(clientA, freelancerA);

  const mainGigId = await publishAndReviewGig(clientA, mainTitle);
  const mainApplicationA = await apply(
    freelancerA,
    mainGigId,
    "Primary complete proposal from Freelancer A.",
    "Primary scope v1",
    "1450",
  );
  const mainApplicationB = await apply(
    freelancerB,
    mainGigId,
    "Competing complete proposal from Freelancer B.",
    "Competing scope v1",
    "1550",
  );

  const mainApplicantAUrl =
    `${frontendOrigin}/gigs/${mainGigId}/applicants/${mainApplicationA}`;
  await clientA.goto(`${frontendOrigin}/gigs/${mainGigId}/applicants`);
  await settled(clientA, mainTitle);
  await expectText(clientA, "Keyword ranking fallback");
  await expectText(clientA, "Milestone 7K Freelancer A");
  await expectText(clientA, "Milestone 7K Freelancer B");
  await clientA.goto(mainApplicantAUrl);
  await settled(clientA, /Milestone 7K Freelancer A/);
  await expectText(clientA, "Current AI-assisted suitability evidence");
  await expectText(clientA, /Match|Strong|Moderate|Limited/i);
  await clientA.getByRole("button", { name: "Add to shortlist" }).click();
  await expectText(clientA, "Currently on the private internal shortlist.");

  await clientA.getByLabel("Focused plain-text message").fill(
    "Please confirm the FastAPI delivery boundary.",
  );
  await clientA.getByRole("button", { name: "Send question" }).click();
  await expectText(clientA, "Please confirm the FastAPI delivery boundary.");

  await freelancerA.goto(`${frontendOrigin}/applications/${mainApplicationA}`);
  await settled(freelancerA, mainTitle);
  await expectAbsentText(freelancerA, /shortlist/i);
  await freelancerA.getByRole("button", { name: "Answer" }).click();
  await freelancerA.getByLabel("Structured answer").fill(
    "I will deliver the API boundary with contract tests.",
  );
  await freelancerA.getByRole("button", { name: "Confirm" }).click();
  await expectText(freelancerA, "I will deliver the API boundary with contract tests.");

  await clientA.reload();
  await settled(clientA, /Milestone 7K Freelancer A/);
  await expectText(clientA, "I will deliver the API boundary with contract tests.");
  await clientA.getByRole("button", { name: "Advance" }).click();
  await clientA.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expectText(clientA, /Advanced · application v1/i);
  await clientA.reload();
  await settled(clientA, /Advanced · application v1/i);
  await clientA.getByRole("button", { name: "Send revision request" }).click();
  await expectText(clientA, "Open proposal-revision request");

  await freelancerA.reload();
  await settled(freelancerA, mainTitle);
  await freelancerA.getByRole("link", { name: "Open complete proposal update" }).click();
  await settled(freelancerA, "Submit complete proposal revision");
  await freelancerA.getByLabel("Cover note").fill(
    "Primary revised complete proposal from Freelancer A.",
  );
  await freelancerA.getByLabel("Scope notes").fill("Primary scope v2 — clarified");
  const revisionSubmission = freelancerA.waitForResponse(
    (response) => response.url().includes("/submit-update"),
  );
  await freelancerA.getByRole("button", { name: "Submit revised proposal version" }).click();
  await requireSuccessfulResponse(await revisionSubmission, "revision submission");
  await settled(freelancerA, mainTitle);
  await expectText(freelancerA, /application v2/i);
  await expectText(freelancerA, "Version 2");

  await clientA.reload();
  await settled(clientA, /Milestone 7K Freelancer A/);
  await expectText(clientA, /application v2/i);
  await clientA.getByRole("button", { name: "Send selection request" }).click();
  await expectText(clientA, /Pending/i);

  await freelancerA.reload();
  await settled(freelancerA, mainTitle);
  await acceptDialog(
    freelancerA,
    freelancerA.getByRole("button", { name: "Accept Exact Terms" }),
  );
  await expectText(freelancerA, "Engagement confirmed");

  await freelancerB.goto(`${frontendOrigin}/applications/${mainApplicationB}`);
  await settled(freelancerB, mainTitle);
  await expectText(freelancerB, "Not Selected");
  await expectText(freelancerB, "Another applicant was selected for this gig.");
  await expectAbsentText(freelancerB, "Open workspace");
  await expectAbsentText(freelancerB, "Send question");

  const secondGigId = await publishAndReviewGig(clientA, secondTitle);
  const secondApplicationA = await apply(
    freelancerA,
    secondGigId,
    "Invalidation scenario proposal v1.",
    "Invalidation scope v1",
    "1400",
  );
  const secondApplicantUrl =
    `${frontendOrigin}/gigs/${secondGigId}/applicants/${secondApplicationA}`;
  await clientA.goto(secondApplicantUrl);
  await settled(clientA, /Milestone 7K Freelancer A/);
  await clientA.getByRole("button", { name: "Advance" }).click();
  await clientA.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expectText(clientA, /Advanced · application v1/i);
  await clientA.reload();
  await settled(clientA, /Advanced · application v1/i);
  await clientA.getByRole("button", { name: "Send selection request" }).click();
  await expectText(clientA, /Pending/i);

  await freelancerA.goto(`${frontendOrigin}/applications/${secondApplicationA}`);
  await settled(freelancerA, secondTitle);
  await expectVisible(freelancerA.getByRole("button", { name: "Accept Exact Terms" }));
  await freelancerA.getByRole("link", { name: "Edit application" }).click();
  await settled(freelancerA, "Edit application");
  await freelancerA.getByLabel("Cover note").fill("Invalidation scenario proposal v2.");
  await freelancerA.getByLabel("Scope notes").fill("Invalidation scope v2");
  await freelancerA.getByRole("button", { name: "Save new version" }).click();
  await settled(freelancerA, secondTitle);
  await expectText(freelancerA, /application v2/i);
  await expectAbsent(freelancerA.getByRole("button", { name: "Accept Exact Terms" }));
  await expectText(freelancerA, /Invalidated/i);

  await clientA.reload();
  await settled(clientA, /Milestone 7K Freelancer A/);
  await expectText(clientA, /application v2/i);
  await expectText(clientA, /Invalidated/i);
  await clientA.getByRole("button", { name: "Send selection request" }).click();
  await expectText(clientA, /Pending/i);

  await proveIsolation(
    clientB,
    freelancerB,
    mainGigId,
    mainApplicationA,
    mainApplicantAUrl,
  );

  const engagementUrl = await openEngagement(clientA, mainTitle);
  await clientA.getByRole("button", { name: "Prepare for Kickoff" }).click();
  await expectText(clientA, /Kickoff Pending/i);

  await freelancerA.goto(engagementUrl);
  await settled(freelancerA, mainTitle);
  await freelancerA.getByRole("button", { name: "Mark Work Started" }).click();
  await expectText(freelancerA, /In Progress/i);
  await freelancerA.getByRole("button", { name: "Request Completion" }).click();
  await expectText(freelancerA, /Completion Pending/i);

  await clientA.reload();
  await settled(clientA, mainTitle);
  await acceptDialog(
    clientA,
    clientA.getByRole("button", { name: "Confirm Completion" }),
  );
  await expectText(clientA, /Completed/i);
  await clientA.reload();
  await settled(clientA, mainTitle);

  await shareContactMethods(clientA);
  await freelancerA.reload();
  await settled(freelancerA, mainTitle);
  await revealAndHide(freelancerA, "Verified Email", actors.client_a.email);
  await revealAndHide(freelancerA, "Meeting Link", meetingUrl);

  const staleMeeting = contactCard(freelancerA, "Meeting Link");
  const staleReveal = staleMeeting.getByRole("button", { name: "Reveal" });
  await expectVisible(staleReveal);
  await revokeMeeting(clientA);
  const denied = freelancerA.waitForResponse(
    (response) =>
      response.url().includes("/contact-shares/") &&
      response.url().endsWith("/reveal") &&
      response.status() === 409,
  );
  expectedFailurePages.add(freelancerA);
  await staleReveal.click();
  await denied;
  await expectAbsentText(freelancerA, meetingUrl);
  expectedFailurePages.delete(freelancerA);
  await freelancerA.reload();
  await settled(freelancerA, mainTitle);
  await expectAbsentText(freelancerA, meetingUrl);
  await expectAbsent(contactCard(freelancerA, "Meeting Link").getByRole("button", { name: "Reveal" }));

  await proveLogoutBackDenial(clientB);
  await proveLazyFailure();
  await assertNoRetainedSentinel();

  await Promise.all(responseAudits);
  if (pageFailures.length) {
    throw new Error(`uncaught browser errors: ${pageFailures.join(" | ")}`);
  }
  if (unexpectedRequests.length) {
    throw new Error(`unexpected network requests: ${unexpectedRequests.join(", ")}`);
  }
  console.log(
    JSON.stringify({
      status: "pass",
      scenarios: ["primary", "selection_invalidation", "engagement_contact", "auth_isolation"],
      contexts: 4,
      external_requests: 0,
      retained_browser_artifacts: 0,
    }),
  );
} finally {
  await Promise.all(contexts.map((context) => context.close()));
  await browser.close();
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

async function newContext({ tolerateModuleError = false } = {}) {
  const context = await browser.newContext({
    baseURL: frontendOrigin,
    serviceWorkers: "block",
  });
  contexts.push(context);
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) {
      await route.continue();
      return;
    }
    if (!allowedOrigins.has(url.origin)) {
      unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    if (!tolerateModuleError) pageFailures.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (
      tolerateModuleError &&
      /dynamically imported module|failed to fetch|net::ERR_FAILED/i.test(text)
    ) return;
    if (
      expectedFailurePages.has(page) &&
      /Failed to load resource.*(?:404|409|net::ERR_FAILED)/i.test(text)
    ) return;
    pageFailures.push(`console: ${text}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== backendOrigin || !response.ok()) return;
    if (url.pathname.includes("/contact-shares/") && url.pathname.endsWith("/reveal")) return;
    responseAudits.push(auditResponse(response));
  });
  return page;
}

async function actorPage(actorKey) {
  const page = await newContext();
  await login(page, actors[actorKey]);
  return page;
}

async function login(page, actor) {
  await page.goto(`${frontendOrigin}/login`);
  await page.getByLabel("Email").fill(actor.email);
  await page.getByLabel("Password").fill(actor.password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(new RegExp(`/dashboard/${actor.role}`));
  await settled(
    page,
    actor.role === "client"
      ? "Hiring and engagement workflow"
      : "Your marketplace workflow",
  );
}

async function proveUnauthenticatedDenial() {
  const page = await newContext();
  await page.goto(`${frontendOrigin}/gigs/manage`);
  await page.waitForURL(/\/login$/);
  await settled(page, "Login");
  await page.context().close();
  contexts.splice(contexts.indexOf(page.context()), 1);
}

async function proveWrongRoleRedirects(client, freelancer) {
  await client.goto(`${frontendOrigin}/applications`);
  await client.waitForURL(/\/dashboard\/client$/);
  await settled(client, "Hiring and engagement workflow");
  await freelancer.goto(`${frontendOrigin}/gigs/manage`);
  await freelancer.waitForURL(/\/dashboard\/freelancer$/);
  await settled(freelancer, "Your marketplace workflow");
}

async function publishAndReviewGig(page, title) {
  await page.goto(`${frontendOrigin}/gigs/new`);
  await settled(page, "Post a New Gig");
  const applicationDeadline = localDateTime(14);
  const projectDeadline = localDateTime(45);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(
    "Build a React and TypeScript workspace backed by FastAPI and PostgreSQL.",
  );
  await page.getByLabel("Tech Category").fill("full-stack");
  await page.getByLabel("Required Skills").fill("React, TypeScript, FastAPI");
  await page.getByLabel("Preferred Skills").fill("PostgreSQL");
  await page.getByLabel("Budget Min").fill("1200");
  await page.getByLabel("Budget Max").fill("1800");
  await page.getByLabel("Difficulty Level").selectOption("advanced");
  await page.getByLabel("Seniority Needed").selectOption("senior");
  await page.getByLabel("Deliverables").fill("Working application, Contract tests");
  await page.getByLabel("Work Mode").selectOption("remote");
  await page.getByLabel("Application Deadline").fill(applicationDeadline);
  await page.getByLabel("Project Deadline").fill(projectDeadline);
  await page.getByLabel("Location / Timezone Requirements").fill("Remote UTC ± 6");
  await page.getByRole("button", { name: "Publish Gig" }).click();
  await page.waitForURL(/\/gigs\/manage$/);
  await settled(page, title);
  const article = page.getByRole("article").filter({ hasText: title });
  const parseLink = article.getByRole("link", { name: "Parse Requirements" });
  const href = await parseLink.getAttribute("href");
  const match = href?.match(/^\/gigs\/([^/]+)\/parse$/);
  if (!match) throw new Error("published gig id was not exposed by the UI");
  await parseLink.click();
  await settled(page, "Gig Requirement Parser");
  await page.getByRole("button", { name: "Extract Requirements" }).click();
  await expectVisible(page.getByLabel("Required Skills"));
  await page.getByLabel("Required Skills").fill("React, TypeScript, FastAPI");
  await page.getByLabel("Preferred Skills").fill("PostgreSQL");
  await page.getByLabel("Categories").fill("frontend, backend");
  await page.getByLabel("Matched Terms").fill("react, typescript, fastapi, postgresql");
  await page.getByLabel("Seniority Level").selectOption("senior");
  await page.getByLabel("Deliverables").fill("Working application, Contract tests");
  await page.getByRole("button", { name: "Save Reviewed Requirements" }).click();
  await expectText(page, "Reviewed gig parse saved.");
  return match[1];
}

async function apply(page, gigId, cover, scopeNotes, total) {
  await page.goto(`${frontendOrigin}/gigs/${gigId}`);
  await settled(page, /Apply now/i);
  await page.getByRole("link", { name: "Apply now" }).click();
  await settled(page, /Apply to /i);
  await fillApplication(page, cover, scopeNotes, total);
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.waitForURL(/\/applications\/[0-9a-f-]+$/);
  await settled(page, /application v1/i);
  return page.url().split("/").at(-1);
}

async function fillApplication(page, cover, scopeNotes, total) {
  await page.getByLabel("Cover note").fill(cover);
  await page.getByLabel("Proposal type").selectOption("exact_total");
  await page.getByRole("spinbutton", { name: "Exact total", exact: true }).fill(total);
  await page.getByLabel("Timeline shape").selectOption("exact");
  await page.getByLabel("Unit").selectOption("weeks");
  await page.getByRole("spinbutton", { name: "Exact duration", exact: true }).fill("4");
  await page.getByLabel("Available from").fill(futureDate(5));
  await page.getByLabel("Included work (one per line)").fill(
    "Implementation\nContract tests",
  );
  await page.getByLabel("Excluded work (one per line)").fill("Production hosting");
  await page.getByLabel("Assumptions (one per line)").fill("Repository access");
  await page.getByLabel("Estimate-change factors (one per line)").fill("Material scope change");
  await page.getByLabel("Scope notes").fill(scopeNotes);
}

async function proveIsolation(
  clientB,
  freelancerB,
  mainGigId,
  mainApplicationA,
  mainApplicantAUrl,
) {
  expectedFailurePages.add(clientB);
  expectedFailurePages.add(freelancerB);
  try {
    await clientB.goto(`${frontendOrigin}/gigs/${mainGigId}/applicants`);
    await settled(clientB, /Applicant inbox unavailable|not found|could not be found/i);
    await clientB.goto(mainApplicantAUrl);
    await settled(clientB, /Applicant review not found|not found|could not be found/i);
    await clientB.goto(
      `${frontendOrigin}/gigs/00000000-0000-4000-8000-000000000007/applicants`,
    );
    await settled(clientB, /not found|could not be found|unavailable/i);
    await freelancerB.goto(`${frontendOrigin}/applications/${mainApplicationA}`);
    await settled(freelancerB, /application not found/i);
    await freelancerB.goto(
      `${frontendOrigin}/applications/00000000-0000-4000-8000-000000000007`,
    );
    await settled(freelancerB, /application not found/i);
  } finally {
    expectedFailurePages.delete(clientB);
    expectedFailurePages.delete(freelancerB);
  }
}

async function openEngagement(page, title) {
  await page.goto(`${frontendOrigin}/engagements`);
  await settled(page, "Engagements");
  const article = page.getByRole("article").filter({ hasText: title });
  const link = article.getByRole("link", { name: "Open workspace" });
  const href = await link.getAttribute("href");
  if (!href) throw new Error("engagement link missing");
  await link.click();
  await settled(page, title);
  return new URL(href, frontendOrigin).toString();
}

async function shareContactMethods(page) {
  await settled(page, "Secure Contact Exchange");
  const email = page
    .getByText("Verified Email", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-md')][1]");
  await email.getByRole("button", { name: "Share", exact: true }).click();
  await expectText(
    page.getByRole("heading", { name: "Your sharing history" }).locator(".."),
    "Verified Email",
  );
  const meeting = page
    .getByText("Meeting Link", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-md')][1]");
  await meeting.getByLabel("HTTPS URL").fill(meetingUrl);
  await meeting.getByRole("button", { name: "Share Provided URL" }).click();
  await expectText(page, /Meeting Link ·/i);
}

function contactCard(page, method) {
  return page
    .getByRole("heading", { name: "Shared with you" })
    .locator("..")
    .locator("div.rounded-md")
    .filter({ has: page.getByText(method, { exact: true }) });
}

async function revealAndHide(page, method, expectedValue) {
  const card = contactCard(page, method);
  const revealed = page.waitForResponse(
    (response) =>
      response.url().includes("/contact-shares/") &&
      response.url().endsWith("/reveal") &&
      response.status() === 200,
  );
  await card.getByRole("button", { name: "Reveal" }).click();
  const response = await revealed;
  const cacheControl = response.headers()["cache-control"] ?? "";
  const pragma = response.headers().pragma ?? "";
  if (!cacheControl.includes("private") || !cacheControl.includes("no-store")) {
    throw new Error("contact reveal response did not disable caching");
  }
  if (!pragma.toLowerCase().includes("no-cache")) {
    throw new Error("contact reveal response did not include no-cache pragma");
  }
  await expectText(card, expectedValue);
  await card.getByRole("button", { name: "Hide" }).click();
  await expectAbsentText(card, expectedValue);
}

async function revokeMeeting(page) {
  await page.reload();
  await settled(page, "Secure Contact Exchange");
  const history = page.getByRole("heading", { name: "Your sharing history" }).locator("..");
  const meeting = history.locator("div.rounded-md").filter({
    has: page.getByText(/Meeting Link ·/i),
  });
  await acceptDialog(page, meeting.getByRole("button", { name: "Revoke Sharing" }));
  await expectText(meeting, /Revoked/i);
}

async function proveLogoutBackDenial(page) {
  await page.goto(`${frontendOrigin}/dashboard/client`);
  await settled(page, "Hiring and engagement workflow");
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login$/);
  await page.goBack();
  await page.waitForURL(/\/login$/);
  await settled(page, "Login");
}

async function proveLazyFailure() {
  const page = await newContext({ tolerateModuleError: true });
  await page.route("**/src/pages/ManageGigsPage.tsx*", (route) =>
    route.abort("failed"),
  );
  await login(page, actors.client_a);
  await page.goto(`${frontendOrigin}/gigs/manage`);
  await expectText(page, "This page could not be loaded");
  await expectVisible(page.getByRole("button", { name: "Refresh page" }));
  if (!(await page.locator("main").innerText()).trim()) {
    throw new Error("lazy-load failure produced a blank application shell");
  }
}

async function auditResponse(response) {
  const contentType = response.headers()["content-type"] ?? "";
  if (!contentType.includes("application/json")) return;
  let body;
  try {
    body = await response.json();
  } catch {
    return;
  }
  const found = [];
  walkKeys(body, found);
  if (found.length) {
    throw new Error(
      `forbidden response keys from ${new URL(response.url()).pathname}: ${[...new Set(found)].join(", ")}`,
    );
  }
  const serialized = JSON.stringify(body);
  if (serialized.includes(contactSentinel)) {
    throw new Error(
      `contact sentinel leaked through ordinary response ${new URL(response.url()).pathname}`,
    );
  }
  if (/Traceback|sqlstate|postgresql:\/\/|supabase_secret/i.test(serialized)) {
    throw new Error(`internal marker in response from ${new URL(response.url()).pathname}`);
  }
}

async function requireSuccessfulResponse(response, label) {
  if (response.ok()) return;
  let detail = "no safe detail";
  try {
    const body = await response.json();
    detail = typeof body?.detail === "string"
      ? body.detail
      : JSON.stringify(body?.detail ?? "unknown");
  } catch {
    // The status and operation name remain sufficient for a safe failure.
  }
  throw new Error(`${label} returned ${response.status()}: ${detail}`);
}

async function assertNoRetainedSentinel() {
  for (const context of contexts) {
    const cookies = await context.cookies();
    if (JSON.stringify(cookies).includes(contactSentinel)) {
      throw new Error("contact sentinel retained in browser cookies");
    }
    for (const page of context.pages()) {
      if (page.url().includes(contactSentinel)) {
        throw new Error("contact sentinel retained in a browser URL");
      }
      const retained = await page.evaluate(() => ({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }));
      if (JSON.stringify(retained).includes(contactSentinel)) {
        throw new Error("contact sentinel retained in browser storage");
      }
    }
  }
}

function walkKeys(value, found) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, found);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenResponseKeys.has(key.toLowerCase())) found.push(key);
    walkKeys(child, found);
  }
}

async function settled(page, expected) {
  await expectText(page, expected);
  await page.waitForLoadState("domcontentloaded");
  if (!(await page.locator("body").innerText()).trim()) {
    throw new Error(`blank page at ${page.url()}`);
  }
  if (await page.locator("vite-error-overlay").count()) {
    throw new Error(`Vite error overlay at ${page.url()}`);
  }
}

async function expectText(subject, text) {
  const locator =
    typeof text === "string"
      ? subject.getByText(text, { exact: false }).first()
      : subject.getByText(text).first();
  await locator.waitFor({ state: "visible", timeout: 15000 });
}

async function expectAbsentText(subject, text) {
  const locator =
    typeof text === "string"
      ? subject.getByText(text, { exact: false })
      : subject.getByText(text);
  await expectAbsent(locator);
}

async function expectVisible(locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
}

async function expectAbsent(locator) {
  await locator.waitFor({ state: "detached", timeout: 15000 }).catch(async () => {
    if (await locator.count()) {
      const visible = await locator.first().isVisible();
      if (visible) throw new Error("expected element to be absent");
    }
  });
}

async function acceptDialog(page, action) {
  page.once("dialog", (dialog) => dialog.accept());
  await action.click();
}

function localDateTime(days) {
  const date = new Date(Date.now() + days * 86_400_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function futureDate(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
