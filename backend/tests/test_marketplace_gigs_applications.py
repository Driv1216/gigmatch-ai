from __future__ import annotations

import unittest
from dataclasses import FrozenInstanceError, fields
from datetime import date, datetime, timezone
from decimal import Decimal

from app.marketplace.applications import (
    ApplicationAction,
    ApplicationStage,
    ApplicationState,
    ApplicationVersion,
    ApplicationVersionOrigin,
    InternalShortlistEntry,
    count_active_eligible_shortlist_entries,
    is_shortlist_eligible,
    reaffirm_existing_proposal_for_gig_version,
    reconcile_shortlist_entry,
    response_to_material_gig_version_required,
    transition_application,
    update_proposal_for_gig_version,
    validate_shortlist_capacity,
)
from app.marketplace.common import Availability, Duration, DurationMode, DurationUnit, ProposalScope
from app.marketplace.errors import (
    ContractValidationError,
    InvalidTransitionError,
    PolicyViolationError,
)
from app.marketplace.gigs import (
    ApplicationIntake,
    GigProductState,
    GigState,
    OperationalState,
    OpportunityLifecycle,
    cancel_gig,
    close_applications,
    draft_gig_state,
    fill_through_accepted_selection,
    pause_gig,
    publish_gig,
    reopen_after_cancelled_engagement,
    reopen_applications,
    resume_gig,
)
from app.marketplace.payments import (
    Currency,
    FixedPriceProposal,
    FixedProposalMode,
    PaymentStructure,
)


NOW = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
EARLIER = datetime(2026, 7, 15, 9, 0, tzinfo=timezone.utc)
LATER = datetime(2026, 7, 15, 11, 0, tzinfo=timezone.utc)


def _scope() -> ProposalScope:
    return ProposalScope(
        included_work=("API implementation",),
        excluded_work=("Hosting fees",),
        assumptions=("Client supplies copy",),
        estimate_change_factors=("New integrations",),
    )


def _proposal() -> FixedPriceProposal:
    return FixedPriceProposal(
        payment_structure=PaymentStructure.FIXED_PRICE,
        currency=Currency("INR"),
        mode=FixedProposalMode.EXACT_TOTAL,
        scope=_scope(),
        exact_total=Decimal("50000"),
    )


def _version(**changes: object) -> ApplicationVersion:
    values: dict[str, object] = {
        "application_version_id": "av-1",
        "application_id": "application-1",
        "version_number": 1,
        "gig_version_id": "gv-1",
        "origin": ApplicationVersionOrigin.INITIAL_SUBMISSION,
        "cover_note": "I can deliver this scope.",
        "proposal": _proposal(),
        "timeline": Duration(DurationMode.EXACT, DurationUnit.WEEKS, exact_value=Decimal("4")),
        "availability": Availability(date(2026, 7, 20)),
        "scope": _scope(),
        "scope_notes": "Deployment handoff included.",
        "created_at": NOW,
        "created_by_user_id": "user-freelancer",
    }
    values.update(changes)
    return ApplicationVersion(**values)  # type: ignore[arg-type]


def _application(stage: ApplicationStage = ApplicationStage.UNDER_REVIEW) -> ApplicationState:
    return ApplicationState(
        application_id="application-1",
        gig_id="gig-1",
        freelancer_id="freelancer-1",
        stage=stage,
        current_version_id="av-1",
        submitted_at=NOW,
        last_updated_at=NOW,
    )


class GigStateMachineTests(unittest.TestCase):
    def test_product_states_derive_from_orthogonal_state(self) -> None:
        states = {
            draft_gig_state(): GigProductState.DRAFT,
            GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.ACCEPTING, OperationalState.ACTIVE): GigProductState.OPEN,
            GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.ACCEPTING, OperationalState.PAUSED): GigProductState.PAUSED,
            GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.CLOSED, OperationalState.ACTIVE): GigProductState.CLOSED_TO_NEW_APPLICATIONS,
            GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.CLOSED, OperationalState.PAUSED): GigProductState.PAUSED,
            GigState(OpportunityLifecycle.FILLED): GigProductState.FILLED,
            GigState(OpportunityLifecycle.CANCELLED): GigProductState.CANCELLED,
        }
        for state, expected in states.items():
            with self.subTest(expected=expected):
                self.assertEqual(state.product_state, expected)
        self.assertEqual(len(GigProductState), 6)

    def test_publish_pause_resume_preserves_accepting_intake(self) -> None:
        opened = publish_gig(draft_gig_state())
        paused = pause_gig(opened)
        self.assertFalse(paused.accepts_applications)
        self.assertEqual(paused.intake, ApplicationIntake.ACCEPTING)
        self.assertEqual(resume_gig(paused), opened)

    def test_pause_resume_preserves_closed_intake(self) -> None:
        closed = close_applications(publish_gig(draft_gig_state()))
        paused = pause_gig(closed)
        self.assertEqual(paused.product_state, GigProductState.PAUSED)
        self.assertEqual(paused.intake, ApplicationIntake.CLOSED)
        self.assertEqual(resume_gig(paused).product_state, GigProductState.CLOSED_TO_NEW_APPLICATIONS)

    def test_close_and_reopen_applications_preserve_operational_state(self) -> None:
        paused = pause_gig(publish_gig(draft_gig_state()))
        paused_closed = close_applications(paused)
        self.assertEqual(paused_closed.operations, OperationalState.PAUSED)
        self.assertEqual(reopen_applications(paused_closed), paused)

    def test_draft_paused_closed_filled_and_cancelled_do_not_accept_applications(self) -> None:
        states = (
            draft_gig_state(),
            pause_gig(publish_gig(draft_gig_state())),
            close_applications(publish_gig(draft_gig_state())),
            GigState(OpportunityLifecycle.FILLED),
            GigState(OpportunityLifecycle.CANCELLED),
        )
        self.assertTrue(all(not state.accepts_applications for state in states))

    def test_closed_gig_allows_review_and_selection(self) -> None:
        state = close_applications(publish_gig(draft_gig_state()))
        self.assertTrue(state.allows_review)
        self.assertTrue(state.allows_selection)

    def test_paused_gig_blocks_selection_and_cannot_pause_with_pending_request(self) -> None:
        open_state = publish_gig(draft_gig_state())
        with self.assertRaises(PolicyViolationError):
            pause_gig(open_state, has_pending_selection_request=True)
        paused = pause_gig(open_state)
        self.assertFalse(paused.allows_selection)
        with self.assertRaises(InvalidTransitionError):
            fill_through_accepted_selection(paused, selection_request_is_accepted=True)

    def test_filling_requires_accepted_selection(self) -> None:
        open_state = publish_gig(draft_gig_state())
        with self.assertRaises(InvalidTransitionError):
            fill_through_accepted_selection(open_state, selection_request_is_accepted=False)
        filled = fill_through_accepted_selection(open_state, selection_request_is_accepted=True)
        self.assertEqual(filled.lifecycle, OpportunityLifecycle.FILLED)

    def test_cancelled_is_terminal(self) -> None:
        cancelled = cancel_gig(publish_gig(draft_gig_state()))
        for action in (publish_gig, pause_gig, close_applications, reopen_applications, cancel_gig):
            with self.subTest(action=action.__name__), self.assertRaises(InvalidTransitionError):
                action(cancelled)

    def test_failed_engagement_reopens_closed_not_publicly_open(self) -> None:
        filled = GigState(OpportunityLifecycle.FILLED)
        with self.assertRaises(InvalidTransitionError):
            reopen_after_cancelled_engagement(filled, engagement_is_cancelled=False)
        reopened = reopen_after_cancelled_engagement(filled, engagement_is_cancelled=True)
        self.assertEqual(reopened.lifecycle, OpportunityLifecycle.ACTIVE)
        self.assertEqual(reopened.intake, ApplicationIntake.CLOSED)
        self.assertFalse(reopened.accepts_applications)

    def test_invalid_composite_states_are_rejected(self) -> None:
        with self.assertRaises(ContractValidationError):
            GigState(OpportunityLifecycle.DRAFT, ApplicationIntake.ACCEPTING)
        with self.assertRaises(ContractValidationError):
            GigState(OpportunityLifecycle.CANCELLED, operations=OperationalState.PAUSED)


class ApplicationStateMachineTests(unittest.TestCase):
    def test_every_valid_application_transition(self) -> None:
        cases = (
            (ApplicationStage.UNDER_REVIEW, ApplicationAction.ADVANCE, ApplicationStage.ADVANCED),
            (ApplicationStage.UNDER_REVIEW, ApplicationAction.MARK_NOT_SELECTED, ApplicationStage.NOT_SELECTED),
            (ApplicationStage.UNDER_REVIEW, ApplicationAction.WITHDRAW, ApplicationStage.WITHDRAWN),
            (ApplicationStage.UNDER_REVIEW, ApplicationAction.CLOSE_GIG_CANCELLED, ApplicationStage.CLOSED_GIG_CANCELLED),
            (ApplicationStage.ADVANCED, ApplicationAction.RETURN_TO_REVIEW, ApplicationStage.UNDER_REVIEW),
            (ApplicationStage.ADVANCED, ApplicationAction.MARK_NOT_SELECTED, ApplicationStage.NOT_SELECTED),
            (ApplicationStage.ADVANCED, ApplicationAction.WITHDRAW, ApplicationStage.WITHDRAWN),
            (ApplicationStage.ADVANCED, ApplicationAction.ACCEPT_SELECTION, ApplicationStage.CONFIRMED),
            (ApplicationStage.ADVANCED, ApplicationAction.CLOSE_GIG_CANCELLED, ApplicationStage.CLOSED_GIG_CANCELLED),
            (ApplicationStage.NOT_SELECTED, ApplicationAction.CONTROLLED_REOPEN, ApplicationStage.UNDER_REVIEW),
            (ApplicationStage.WITHDRAWN, ApplicationAction.ACCEPT_RECONSIDERATION, ApplicationStage.UNDER_REVIEW),
        )
        for source, action, target in cases:
            with self.subTest(source=source, action=action):
                self.assertEqual(transition_application(_application(source), action, acted_at=LATER).stage, target)

    def test_under_review_cannot_confirm_and_advancement_is_required(self) -> None:
        with self.assertRaises(InvalidTransitionError):
            transition_application(_application(), ApplicationAction.ACCEPT_SELECTION, acted_at=LATER)

    def test_terminal_application_stages_cannot_transition(self) -> None:
        for stage in (ApplicationStage.CONFIRMED, ApplicationStage.CLOSED_GIG_CANCELLED):
            for action in ApplicationAction:
                with self.subTest(stage=stage, action=action), self.assertRaises(InvalidTransitionError):
                    transition_application(_application(stage), action, acted_at=LATER)

    def test_pending_selection_guards_review_not_selected_and_withdraw(self) -> None:
        for action in (
            ApplicationAction.RETURN_TO_REVIEW,
            ApplicationAction.MARK_NOT_SELECTED,
            ApplicationAction.WITHDRAW,
        ):
            with self.subTest(action=action), self.assertRaises(PolicyViolationError):
                transition_application(
                    _application(ApplicationStage.ADVANCED),
                    action,
                    acted_at=LATER,
                    has_pending_selection_request=True,
                )

    def test_no_selection_pending_or_internal_shortlist_stage_exists(self) -> None:
        stage_names = {stage.name for stage in ApplicationStage}
        self.assertNotIn("SELECTION_PENDING", stage_names)
        self.assertNotIn("INTERNAL_SHORTLIST", stage_names)

    def test_identity_strings_reject_surrounding_whitespace(self) -> None:
        with self.assertRaises(ContractValidationError):
            ApplicationState(
                application_id=" application-1 ",
                gig_id="gig-1",
                freelancer_id="freelancer-1",
                stage=ApplicationStage.UNDER_REVIEW,
                current_version_id="av-1",
                submitted_at=NOW,
                last_updated_at=NOW,
            )


class ShortlistAndVersionTests(unittest.TestCase):
    def test_shortlist_eligibility_and_terminal_deactivation(self) -> None:
        self.assertTrue(is_shortlist_eligible(ApplicationStage.UNDER_REVIEW))
        self.assertTrue(is_shortlist_eligible(ApplicationStage.ADVANCED))
        for stage in (
            ApplicationStage.NOT_SELECTED,
            ApplicationStage.WITHDRAWN,
            ApplicationStage.CONFIRMED,
            ApplicationStage.CLOSED_GIG_CANCELLED,
        ):
            with self.subTest(stage=stage):
                self.assertFalse(is_shortlist_eligible(stage))
                entry = reconcile_shortlist_entry(InternalShortlistEntry("application-1", True), stage)
                self.assertFalse(entry.is_active)

    def test_only_active_eligible_shortlist_entries_count(self) -> None:
        entries = (
            InternalShortlistEntry("a-1", True),
            InternalShortlistEntry("a-2", True),
            InternalShortlistEntry("a-3", False),
        )
        stages = {
            "a-1": ApplicationStage.ADVANCED,
            "a-2": ApplicationStage.NOT_SELECTED,
            "a-3": ApplicationStage.UNDER_REVIEW,
        }
        self.assertEqual(count_active_eligible_shortlist_entries(entries, stages), 1)
        self.assertEqual(validate_shortlist_capacity(entries, stages, effective_limit=1), 1)
        with self.assertRaises(PolicyViolationError):
            validate_shortlist_capacity(entries, {**stages, "a-2": ApplicationStage.UNDER_REVIEW}, effective_limit=1)

    def test_duplicate_shortlist_application_ids_are_rejected(self) -> None:
        entries = (
            InternalShortlistEntry("a-1", True),
            InternalShortlistEntry("a-1", True),
        )
        with self.assertRaises(ContractValidationError):
            count_active_eligible_shortlist_entries(entries, {"a-1": ApplicationStage.ADVANCED})

    def test_application_version_is_positive_frozen_and_has_no_state_flags(self) -> None:
        with self.assertRaises(ContractValidationError):
            _version(version_number=0)
        version = _version()
        with self.assertRaises(FrozenInstanceError):
            version.cover_note = "Changed"  # type: ignore[misc]
        names = {item.name for item in fields(ApplicationVersion)}
        self.assertTrue({"application_id", "gig_version_id", "version_number"}.issubset(names))
        self.assertTrue(names.isdisjoint({"status", "is_current", "is_frozen", "is_selected", "is_accepted", "updated_at"}))

    def test_application_version_rejects_unknown_fields(self) -> None:
        with self.assertRaises(TypeError):
            ApplicationVersion(unknown=True)  # type: ignore[call-arg]

    def test_material_gig_response_is_derived_and_reaffirmation_copies_terms(self) -> None:
        previous = _version()
        self.assertTrue(response_to_material_gig_version_required(previous, "gv-2"))
        next_version = reaffirm_existing_proposal_for_gig_version(
            previous,
            new_application_version_id="av-2",
            new_version_number=2,
            new_gig_version_id="gv-2",
            created_at=LATER,
            created_by_user_id="user-freelancer",
        )
        self.assertEqual(next_version.origin, ApplicationVersionOrigin.GIG_CHANGE_TERMS_REAFFIRMED)
        self.assertEqual(next_version.proposal, previous.proposal)
        self.assertEqual(next_version.gig_version_id, "gv-2")
        self.assertFalse(response_to_material_gig_version_required(next_version, "gv-2"))

    def test_material_gig_response_can_create_updated_proposal_version(self) -> None:
        previous = _version()
        updated_proposal = FixedPriceProposal(
            payment_structure=PaymentStructure.FIXED_PRICE,
            currency=Currency("INR"),
            mode=FixedProposalMode.EXACT_TOTAL,
            scope=_scope(),
            exact_total=Decimal("55000"),
        )
        updated = update_proposal_for_gig_version(
            previous,
            new_application_version_id="av-2",
            new_version_number=2,
            new_gig_version_id="gv-2",
            proposal=updated_proposal,
            timeline=previous.timeline,
            availability=previous.availability,
            scope=updated_proposal.scope,
            scope_notes="Updated commercial terms.",
            cover_note=previous.cover_note,
            created_at=LATER,
            created_by_user_id="user-freelancer",
        )
        self.assertEqual(updated.origin, ApplicationVersionOrigin.GIG_CHANGE_PROPOSAL_UPDATED)
        self.assertEqual(updated.proposal.exact_total, Decimal("55000"))
        self.assertEqual(updated.gig_version_id, "gv-2")

    def test_material_response_helper_requires_new_identity_and_next_number(self) -> None:
        previous = _version()
        with self.assertRaises(ContractValidationError):
            reaffirm_existing_proposal_for_gig_version(
                previous,
                new_application_version_id="av-1",
                new_version_number=3,
                new_gig_version_id="gv-1",
                created_at=LATER,
                created_by_user_id="user-freelancer",
            )

    def test_new_application_version_cannot_predate_current_version(self) -> None:
        with self.assertRaises(ContractValidationError):
            reaffirm_existing_proposal_for_gig_version(
                _version(),
                new_application_version_id="av-2",
                new_version_number=2,
                new_gig_version_id="gv-2",
                created_at=EARLIER,
                created_by_user_id="user-freelancer",
            )


if __name__ == "__main__":
    unittest.main()
