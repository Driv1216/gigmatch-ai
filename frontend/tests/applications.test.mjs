import assert from "node:assert/strict";
import test from "node:test";

import { isApplicationContext, isApplicationEnvelope, isApplicationResponse, isVersionEnvelope } from "../src/lib/applicationContracts.ts";
import { applicationClosureReason, applicationCollectionState, applicationEditMode, canReaffirmApplication, contextAction, sortVersions, validateProposal } from "../src/lib/applicationView.ts";

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
