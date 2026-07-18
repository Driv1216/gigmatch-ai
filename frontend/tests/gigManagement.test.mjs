import assert from "node:assert/strict";
import test from "node:test";

import {
  LATER_MILESTONE_CONTROLS,
  managementActionState,
  materialConfirmationText,
  stableManagementErrorMessage,
} from "../src/lib/gigManagementView.ts";

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
  assert.equal(managementActionState(["reopen_intake"], ["future_deadline_required"]).canReopenIntake, true);
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
