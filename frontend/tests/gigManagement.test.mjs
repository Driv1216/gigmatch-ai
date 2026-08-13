import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LATER_MILESTONE_CONTROLS,
  managementActionState,
  materialConfirmationText,
  latestMaterialChangedFields,
  stableManagementErrorMessage,
  versionRelationship,
} from "../src/lib/gigManagementView.ts";
import { isManagedGig } from "../src/lib/gigManagementContract.ts";

const ownerGig = {
  gig_id: "gig-1",
  terms: { title: "Supported gig" },
  lifecycle: "active",
  intake: "accepting",
  operations: "active",
  product_state: "open",
  accepting_applications: true,
  deadline_status: "future",
  terms_contract_version: 1,
  upgrade_required: false,
  current_display_version_id: "display-2",
  current_display_version_number: 2,
  current_material_version_id: "material-1",
  current_material_version_number: 1,
  optimistic_concurrency_token: "display-2",
  allowed_actions: ["edit_published", "close_intake", "pause", "cancel"],
  blocking_reason_codes: [],
  active_application_count: 2,
  effectively_active_selection_request: false,
  latest_material_change_summary: { changed_fields: ["client_payment"] },
  engagement_state: "none",
};

test("owner DTO guard accepts complete authority and rejects missing action projections", () => {
  assert.equal(isManagedGig(ownerGig), true);
  assert.equal(isManagedGig({ ...ownerGig, allowed_actions: null }), false);
});

test("upgrade-required management state exposes upgrade without later workflow controls", () => {
  const state = managementActionState(["upgrade"], ["unsupported_contract_upgrade_required"]);
  assert.equal(state.canUpgrade, true);
  assert.equal(state.canEdit, false);
  assert.deepEqual(LATER_MILESTONE_CONTROLS, ["submit_application", "advance_applicant", "send_selection_request", "accept_selection", "decline_selection"]);
});

test("backend-provided pause and resume actions preserve orthogonal rendering", () => {
  assert.equal(managementActionState(["pause", "close_intake", "cancel"], []).canPause, true);
  const paused = managementActionState(["resume", "close_intake", "cancel"], []);
  assert.equal(paused.canResume, true);
  assert.equal(paused.canCloseIntake, true);
});

test("pending selection warning disables pause even if action is present", () => {
  const state = managementActionState(["pause"], ["pending_selection_blocks_pause"]);
  assert.equal(state.pendingSelectionWarning, true);
  assert.equal(state.canPause, false);
});

test("close and reopen are distinct backend-provided intake actions", () => {
  assert.equal(managementActionState(["close_intake"], []).canCloseIntake, true);
  assert.equal(managementActionState(["reopen_intake"], []).canReopenIntake, true);
  assert.equal(managementActionState(["reopen_intake"], ["future_deadline_required"]).canReopenIntake, false);
});

test("material preview text includes changed fields, refreshed count, and selection effect", () => {
  assert.equal(
    materialConfirmationText(["client_payment", "application_deadline"], 3, "will_be_invalidated"),
    "client_payment, application_deadline · 3 active applications · will be invalidated",
  );
});

test("stale version and lifecycle blocks use stable client messages", () => {
  assert.match(stableManagementErrorMessage("stale_gig_version"), /another tab/i);
  assert.match(stableManagementErrorMessage("pending_selection_blocks_pause"), /selection request/i);
  assert.match(stableManagementErrorMessage("legacy_dependency_reconciliation_required"), /reconciliation/i);
});

test("terminal cancellation is a dedicated destructive action", () => {
  const state = managementActionState(["edit_published", "cancel"], []);
  assert.equal(state.canCancel, true);
  assert.equal(state.canPublish, false);
});

test("display and material ordinals remain distinct from the terms contract", () => {
  assert.equal(versionRelationship(8, 8), "aligned");
  assert.equal(versionRelationship(9, 8), "display_only_correction");
  assert.deepEqual(latestMaterialChangedFields({ version_number: 8, changed_fields: ["client_payment", 42] }), ["client_payment"]);
});

test("Stage 3 uses native gig-specific dialogs and removes browser prompts", () => {
  const manage = readFileSync(new URL("../src/pages/ManageGigsPage.tsx", import.meta.url), "utf8");
  const lifecycleDialog = readFileSync(new URL("../src/components/GigLifecycleDialog.tsx", import.meta.url), "utf8");
  const previewDialog = readFileSync(new URL("../src/components/GigEditPreviewDialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(manage, /window\.(prompt|confirm)/);
  assert.match(lifecycleDialog, /<dialog/);
  assert.match(lifecycleDialog, /showModal\(\)/);
  assert.match(lifecycleDialog, /requestAnimationFrame/);
  assert.match(previewDialog, /Authoritative edit preview/);
});

test("draft publication retry reuses one direct-created owned draft", () => {
  const source = readFileSync(new URL("../src/pages/NewGigPage.tsx", import.meta.url), "utf8");
  const formSource = readFileSync(new URL("../src/components/GigForm.tsx", import.meta.url), "utf8");
  assert.match(source, /savedDraft \?\? await createGig/);
  assert.match(source, /setSavedDraft\(draft\)/);
  assert.match(source, /publishManagedGig\(draft\.id, draft\.current_gig_version_id/);
  assert.match(formSource, /type="datetime-local"[^>]+onInput=/);
});

test("stale and changed consequences refetch and repreview the preserved candidate", () => {
  const source = readFileSync(new URL("../src/pages/EditGigPage.tsx", import.meta.url), "utf8");
  assert.match(source, /stale_gig_version/);
  assert.match(source, /material_change_consequences_changed/);
  assert.match(source, /fetchManagedGig\(id\)/);
  assert.match(source, /previewManagedGigEdit\(id, latest\.optimistic_concurrency_token, snapshot\)/);
  assert.doesNotMatch(source, /<GigForm key=/);
});

test("applicant/parser destinations stay contained while the narrow Stage 8 engagement region is explicit", () => {
  const source = readFileSync(new URL("../src/pages/ManageGigsPage.tsx", import.meta.url), "utf8");
  assert.match(source, /Later-stage destinations/);
  assert.match(source, /\/applicants/);
  assert.match(source, /\/parse/);
  assert.match(source, /Stage 8 engagement authority/);
  assert.match(source, /ordinary intake controls do not/);
  assert.doesNotMatch(source, /onAction\("reopen_gig"\)/);
});
