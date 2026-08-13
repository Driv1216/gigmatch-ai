import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isApplicationContext, isApplicationEnvelope, isApplicationResponse, isVersionEnvelope } from "../src/lib/applicationContracts.ts";
import { applicationBlockerMessage, applicationClosureReason, applicationCollectionState, applicationEditMode, applicationRecordErrorMessage, applicationSubmissionErrorMessage, applicationVersionOriginLabel, canReaffirmApplication, contextAction, gigApplicationPanel, sortVersions, validateProposal } from "../src/lib/applicationView.ts";
import { participantStageFourOwnsPath } from "../src/lib/participantNavigation.ts";

const pagination = { page: 1, page_size: 20, total_items: 1, total_pages: 1 };
const context = { gig_id: "g1", can_apply: true, blocker: null, existing_application_id: null, gig: {}, client: {}, material_terms: {}, payment_structure: "fixed_price", currency: "INR", required_proposal_fields: [], application_deadline: "2099-01-01T00:00:00Z", material_gig_version_number: 2, material_terms_token: "a".repeat(64) };
const detail = { application_id: "a1", stage: "under_review", application_version_token: "b".repeat(64), current_application: {}, current_version_number: 2, original_submission: {}, answered_gig_version_number: 1, current_material_gig_version_number: 2, current_material_terms: {}, response_to_updated_gig_required: true, material_terms_token: "c".repeat(64), gig_change_comparison: [], withdrawal_or_closure: {}, version_history_count: 2, compatibility: { can_reaffirm_existing_proposal: true }, allowed_actions: ["reaffirm_updated_gig_terms", "update_for_gig_change"], blockers: [], gig: {}, client: {} };

test("application collection has explicit loading, empty, error, and ready states", () => {
  assert.equal(applicationCollectionState(true, null, 0), "loading");
  assert.equal(applicationCollectionState(false, null, 0), "empty");
  assert.equal(applicationCollectionState(false, "offline", 0), "error");
  assert.equal(applicationCollectionState(false, null, 1), "ready");
});

test("selection confirmation closure has a respectful freelancer-visible reason", () => {
  assert.equal(
    applicationClosureReason("another_applicant_selected"),
    "Another applicant was selected for this gig.",
  );
  assert.equal(applicationClosureReason(null), null);
});

test("context runtime contract and actions cover eligible, existing, and blocked gigs", () => {
  assert.equal(isApplicationContext(context), true);
  assert.deepEqual(contextAction(context), { label: "Apply now", destination: "apply" });
  assert.equal(contextAction({ can_apply: false, blocker: "application_already_exists", existing_application_id: "a/1" }).destination, "/applications/a%2F1");
  assert.equal(contextAction({ can_apply: false, blocker: "gig_paused", existing_application_id: null }).destination, null);
});

test("shared Gig Detail exposes application behavior only to freelancers", () => {
  assert.deepEqual(gigApplicationPanel("client", "ready", context), { kind: "hidden" });
  assert.deepEqual(gigApplicationPanel("admin", "ready", context), { kind: "hidden" });
  assert.equal(gigApplicationPanel("freelancer", "loading", null).kind, "loading");
  assert.equal(gigApplicationPanel("freelancer", "error", null).kind, "error");
  assert.deepEqual(gigApplicationPanel("freelancer", "ready", context), {
    kind: "action", label: "Apply now", destination: "apply",
  });
  assert.equal(gigApplicationPanel("freelancer", "ready", { ...context, can_apply: false, blocker: "gig_paused" }).kind, "blocker");
});

test("fixed-price validation requires an above-budget explanation", () => {
  const base = { cover_note: "Ready", included_work: "API", excluded_work: "Hosting", assumptions: "Access", estimate_change_factors: "Scope", proposal_mode: "exact_total", exact_total: "120", available_from: "2098-01-01", timeline_mode: "exact", timeline_exact: 2 };
  assert.match(validateProposal(base, "fixed_price", 100).join(" "), /above the posted budget/i);
  assert.equal(validateProposal({ ...base, range_explanation: "Expedited delivery" }, "fixed_price", 100).length, 0);
});

test("hourly validation enforces rate, availability range, and date", () => {
  const errors = validateProposal({ cover_note: "Ready", included_work: "API", proposal_mode: "hourly", hourly_rate: 50, weekly_minimum: 30, weekly_maximum: 10, timeline_mode: "requires_discussion" }, "hourly");
  assert.match(errors.join(" "), /weekly availability/i);
  assert.match(errors.join(" "), /available-from/i);
});

test("open proposals require canonical scope lists and a matching pricing variant", () => {
  const invalid = validateProposal({ cover_note: "Ready", included_work: "API", proposal_mode: "phased_estimate", phase_name: "", phase_amount: 0, available_from: "2098-01-01", timeline_mode: "requires_discussion" }, "open_to_proposals");
  assert.match(invalid.join(" "), /excluded work/i);
  assert.match(invalid.join(" "), /pricing phase/i);
});

test("detail action model suppresses incompatible reaffirm and gates edit modes", () => {
  assert.equal(canReaffirmApplication(detail), true);
  assert.equal(canReaffirmApplication({ ...detail, compatibility: { can_reaffirm_existing_proposal: false } }), false);
  assert.equal(applicationEditMode(detail.allowed_actions, "update"), "update");
  assert.equal(applicationEditMode(detail.allowed_actions, null), "unavailable");
  assert.equal(applicationEditMode(["reapply_after_gig_change"], "reapply"), "reapply");
});

test("application detail, list, and immutable history envelopes reject malformed shapes", () => {
  assert.equal(isApplicationResponse(detail), true);
  assert.equal(isApplicationResponse({ ...detail, current_version_number: "2" }), false);
  assert.equal(isApplicationEnvelope({ items: [{ application_id: "a1", stage: "withdrawn", current_version_number: 2, response_to_updated_gig_required: false }], pagination }), true);
  const history = { items: [{ version_token: "t", version_number: 2, origin: "freelancer_edit", created_at: "now", application: {}, answered_gig_version_number: 2, answered_terms: {} }], pagination };
  assert.equal(isVersionEnvelope(history), true);
  assert.deepEqual(sortVersions([{ version_number: 1 }, { version_number: 3 }, { version_number: 2 }]).map((item) => item.version_number), [3, 2, 1]);
});

test("submission keeps stale-term review and idempotent retry safeguards in the Stage 2 composition", () => {
  const applySource = readFileSync(new URL("../src/pages/ApplyToGigPage.tsx", import.meta.url), "utf8");
  const formSource = readFileSync(new URL("../src/components/ApplicationForm.tsx", import.meta.url), "utf8");
  const editSource = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");

  assert.match(applicationSubmissionErrorMessage("stale_gig_terms"), /draft is preserved/i);
  assert.match(applySource, /const \[requestId\] = useState\(\(\) => crypto\.randomUUID\(\)\)/);
  assert.match(applySource, /submission_request_id: requestId/);
  assert.match(applySource, /termsReviewState !== "current"/);
  assert.match(applySource, /I reviewed the refreshed terms/);
  assert.doesNotMatch(applySource, /<ApplicationForm\s+key=/);
  assert.match(applySource, /presentation="switchboard-submission"/);
  assert.match(formSource, /presentation: "switchboard-submission" \| "switchboard-record"/);
  assert.doesNotMatch(formSource, /legacy/);
  assert.match(formSource, /onInput=\{type === "date"/);
  assert.doesNotMatch(editSource, /presentation="switchboard-submission"/);
});

test("Stage 4 route ownership is exact and excludes near-collisions and later client routes", () => {
  assert.equal(participantStageFourOwnsPath("/applications"), true);
  assert.equal(participantStageFourOwnsPath("/applications/a1"), true);
  assert.equal(participantStageFourOwnsPath("/applications/a1/edit"), true);
  assert.equal(participantStageFourOwnsPath("/applications/a1/history"), false);
  assert.equal(participantStageFourOwnsPath("/applications/a1/edit/extra"), false);
  assert.equal(participantStageFourOwnsPath("/applications-extra"), false);
  assert.equal(participantStageFourOwnsPath("/gigs/g1/apply"), false);
  assert.equal(participantStageFourOwnsPath("/gigs/g1/applicants/a1"), false);
  assert.equal(participantStageFourOwnsPath("/engagements/e1"), false);
  assert.equal(participantStageFourOwnsPath("/profile/resume-parse"), false);
});

test("Stage 4 keeps application, proposal-contract, and gig ordinals semantically distinct", () => {
  const source = readFileSync(new URL("../src/components/ApplicationVersionReference.tsx", import.meta.url), "utf8");
  assert.match(source, /Proposal history/);
  assert.match(source, /Proposal schema/);
  assert.match(source, /Answered gig history/);
  assert.match(source, /Current material terms/);
  assert.match(source, /answeredGigVersion !== currentMaterialGigVersion/);
  assert.doesNotMatch(source, /GigVersionReference/);
});

test("immutable history accepts and honestly labels every current version origin", () => {
  const origins = [
    "initial_submission",
    "freelancer_edit",
    "gig_change_terms_reaffirmed",
    "gig_change_proposal_updated",
    "gig_change_reapplication",
    "reconsideration",
    "qa_revision",
    "proposal_revision",
    "future_backend_origin",
  ];
  for (const origin of origins) {
    const history = { items: [{ version_token: "opaque", version_number: 1, origin, created_at: "2099-01-01T00:00:00Z", application: {}, answered_gig_version_number: 1, answered_terms: {} }], pagination };
    assert.equal(isVersionEnvelope(history), true, origin);
    assert.ok(applicationVersionOriginLabel(origin).length > 0, origin);
  }
  assert.equal(applicationVersionOriginLabel("gig_change_reapplication"), "Material-change reapplication");
});

test("Stage 4 uses existing 7D endpoints for edit, reaffirm, update, withdrawal, and same-history reapplication", () => {
  const apiSource = readFileSync(new URL("../src/lib/applications.ts", import.meta.url), "utf8");
  const editSource = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
  assert.match(apiSource, /\/applications\/\$\{encodeURIComponent\(applicationId\)\}\/versions/);
  assert.match(apiSource, /gig-change\/reaffirm/);
  assert.match(apiSource, /gig-change\/update/);
  assert.match(apiSource, /\/withdraw/);
  assert.match(apiSource, /reapply-after-gig-change/);
  assert.match(editSource, /mode === "edit"\) await editApplication/);
  assert.match(editSource, /mode === "update"\) await updateApplicationForGigChange/);
  assert.match(editSource, /mode === "reapply"\) await reapplyApplication/);
  assert.match(detailSource, /reaffirmApplication/);
  assert.match(detailSource, /withdrawApplication/);
  assert.doesNotMatch(editSource, /mode === "reapply"\) await respondToReconsideration/);
});

test("Stage 4 represents response requirements, selection blockers, and current stage from DTO fields", () => {
  const listSource = readFileSync(new URL("../src/pages/MyApplicationsPage.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
  assert.match(listSource, /WorkflowStatusBadge status=\{item\.stage\}/);
  assert.match(listSource, /item\.response_to_updated_gig_required/);
  assert.match(listSource, /item\.blockers\.map/);
  assert.match(detailSource, /detail\.allowed_actions\.includes/);
  assert.match(detailSource, /detail\.blockers\.map/);
  assert.match(applicationBlockerMessage("pending_selection_blocks_application_withdrawal"), /selection request blocks withdrawal/i);
});

test("controlled conflicts reload authority, preserve the mounted draft, and require explicit review", () => {
  const editSource = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");
  assert.match(editSource, /reviewConflictCodes/);
  assert.match(editSource, /const \[refreshed, refreshedQa, refreshedInvitation\] = await Promise\.all/);
  assert.match(editSource, /fetchApplication\(applicationId\)/);
  assert.match(editSource, /setAuthorityReviewRequired\(true\)/);
  assert.match(editSource, /your form draft below was not remounted or cleared/i);
  assert.match(editSource, /I reviewed the refreshed version and material-term relationship/);
  assert.doesNotMatch(editSource, /<ApplicationForm\s+key=/);
  assert.match(applicationRecordErrorMessage("gig_terms_changed_again"), /draft is preserved/i);
  assert.match(applicationRecordErrorMessage("stale_application_version"), /reloaded/i);
});

test("withdrawal is an accessible application-specific structured dialog without browser confirm", () => {
  const detailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
  const dialogSource = readFileSync(new URL("../src/components/ApplicationWithdrawalDialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(detailSource, /window\.(confirm|prompt)/);
  assert.match(dialogSource, /<dialog/);
  assert.match(dialogSource, /showModal\(\)/);
  assert.match(dialogSource, /event\.key === "Escape"/);
  assert.match(dialogSource, /returnFocusRef/);
  assert.match(dialogSource, /Structured reason/);
  assert.match(dialogSource, /immutable history/);
  assert.match(dialogSource, /reason === "other"/);
});

test("history is readable without raw JSON or token persistence", () => {
  const detailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
  const snapshotSource = readFileSync(new URL("../src/components/ApplicationProposalSnapshot.tsx", import.meta.url), "utf8");
  const sources = `${detailSource}\n${snapshotSource}`;
  assert.match(detailSource, /ApplicationProposalSnapshot/);
  assert.match(detailSource, /sortVersions/);
  assert.doesNotMatch(detailSource, /JSON\.stringify/);
  assert.doesNotMatch(detailSource, /version\.version_token/);
  assert.doesNotMatch(sources, /(localStorage|sessionStorage)/);
  assert.match(snapshotSource, /Complete canonical snapshot/);
  assert.match(snapshotSource, /Included work/);
  assert.match(snapshotSource, /Estimate-change factors/);
});

test("Stage 6, Stage 7 selection, and first-class Stage 8 reconsideration stay separate", () => {
  const detailSource = readFileSync(new URL("../src/pages/ApplicationDetailPage.tsx", import.meta.url), "utf8");
  assert.match(detailSource, /stage-six-page-region/);
  assert.match(detailSource, /application-later-workflows/);
  assert.match(detailSource, /<StructuredQaPanel/);
  assert.match(detailSource, /<SelectionPanel/);
  assert.match(detailSource, /<ReconsiderationPanel/);
  assert.match(detailSource, /Stage 7 \+ Stage 8 distinct authorities/);
  assert.match(detailSource, /separate sibling records/);
  assert.match(detailSource, /first-class Stage 8 workflow/);
});

test("Stage 2, Stage 4, Stage 6, and Stage 8 form presentations remain narrowly resolved", () => {
  const applySource = readFileSync(new URL("../src/pages/ApplyToGigPage.tsx", import.meta.url), "utf8");
  const editSource = readFileSync(new URL("../src/pages/EditApplicationPage.tsx", import.meta.url), "utf8");
  const formSource = readFileSync(new URL("../src/components/ApplicationForm.tsx", import.meta.url), "utf8");
  assert.match(applySource, /presentation="switchboard-submission"/);
  assert.match(editSource, /mode === "revision" \? "switchboard-revision" : "switchboard-reconsideration"/);
  assert.match(formSource, /"switchboard-record"/);
  assert.match(formSource, /"switchboard-revision"/);
  assert.match(formSource, /"switchboard-reconsideration"/);
  assert.doesNotMatch(formSource + editSource, /presentation\??:.*legacy|presentation\s*=\s*"legacy"|legacy-contained/);
});

test("application routes remain freelancer-protected lazy pages", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const page of ["MyApplicationsPage", "ApplicationDetailPage", "EditApplicationPage"]) {
    assert.match(appSource, new RegExp(`const ${page} = lazy`));
  }
  assert.match(appSource, /path="\/applications"[\s\S]*allowedRole="freelancer"/);
  assert.match(appSource, /path="\/applications\/:applicationId"[\s\S]*allowedRole="freelancer"/);
  assert.match(appSource, /path="\/applications\/:applicationId\/edit"[\s\S]*allowedRole="freelancer"/);
});
