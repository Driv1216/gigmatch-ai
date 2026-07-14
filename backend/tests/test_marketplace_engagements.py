from __future__ import annotations

import unittest
from dataclasses import FrozenInstanceError
from datetime import date, datetime, timezone
from decimal import Decimal

from app.marketplace.common import Availability, Duration, DurationMode, DurationUnit, ProposalScope
from app.marketplace.engagements import (
    AcceptedProposalSnapshot,
    EngagementState,
    EngagementStatus,
    acknowledge_engagement_cancellation,
    prepare_kickoff,
    request_completion,
    request_engagement_cancellation,
    resolve_completion,
    start_work,
    withdraw_engagement_cancellation,
)
from app.marketplace.errors import InvalidTransitionError, PolicyViolationError
from app.marketplace.errors import ContractValidationError
from app.marketplace.payments import (
    BudgetFlexibility,
    Currency,
    FixedPriceClientPayment,
    FixedPriceProposal,
    FixedProposalMode,
    FinancialGuidanceType,
    MaximumBudgetCeiling,
    MoneyRange,
    OpenClientPayment,
    OpenProposal,
    OpenProposalMode,
    PaymentStructure,
    PreferredProposalForm,
)
from app.marketplace.reasons import EngagementCancellationDetail, EngagementCancellationReason


NOW = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
LATER = datetime(2026, 7, 15, 11, 0, tzinfo=timezone.utc)
AFTER_START = datetime(2026, 7, 15, 12, 0, tzinfo=timezone.utc)
BETWEEN = datetime(2026, 7, 15, 11, 30, tzinfo=timezone.utc)
CLIENT = "client-user"
FREELANCER = "freelancer-user"


def _scope() -> ProposalScope:
    return ProposalScope(
        included_work=("Implementation",),
        excluded_work=("Cloud charges",),
        assumptions=("Access is supplied",),
        estimate_change_factors=("New scope",),
    )


def _snapshot() -> AcceptedProposalSnapshot:
    scope = _scope()
    proposal = FixedPriceProposal(
        PaymentStructure.FIXED_PRICE,
        Currency("INR"),
        FixedProposalMode.EXACT_TOTAL,
        scope,
        exact_total=Decimal("50000"),
    )
    return AcceptedProposalSnapshot(
        application_version_id="av-1",
        gig_version_id="gv-1",
        client_payment=FixedPriceClientPayment(
            PaymentStructure.FIXED_PRICE,
            MoneyRange(Currency("INR"), Decimal("40000"), Decimal("60000")),
            BudgetFlexibility.STRICT,
        ),
        proposal=proposal,
        timeline=Duration(DurationMode.EXACT, DurationUnit.WEEKS, exact_value=Decimal("4")),
        availability=Availability(date(2026, 7, 20)),
        scope=scope,
        captured_at=NOW,
    )


def _engagement(status: EngagementStatus = EngagementStatus.CONFIRMED) -> EngagementState:
    return EngagementState(
        engagement_id="engagement-1",
        gig_id="gig-1",
        application_id="application-1",
        selection_request_id="selection-1",
        client_participant_user_id=CLIENT,
        freelancer_participant_user_id=FREELANCER,
        accepted_terms=_snapshot(),
        status=status,
        confirmed_at=NOW,
    )


def _cancellation_detail() -> EngagementCancellationDetail:
    return EngagementCancellationDetail(EngagementCancellationReason.MUTUAL_DECISION)


class EngagementStateMachineTests(unittest.TestCase):
    def test_confirmed_can_prepare_kickoff_start_work_or_request_cancellation(self) -> None:
        confirmed = _engagement()
        self.assertEqual(prepare_kickoff(confirmed, acting_user_id=CLIENT).status, EngagementStatus.KICKOFF_PENDING)
        self.assertEqual(
            start_work(confirmed, acting_user_id=FREELANCER, acted_at=LATER).status,
            EngagementStatus.IN_PROGRESS,
        )
        self.assertEqual(
            request_engagement_cancellation(
                confirmed,
                requesting_user_id=CLIENT,
                requested_at=LATER,
                detail=_cancellation_detail(),
            ).status,
            EngagementStatus.CANCELLATION_PENDING,
        )

    def test_kickoff_can_start_work_or_request_cancellation(self) -> None:
        kickoff = prepare_kickoff(_engagement(), acting_user_id=CLIENT)
        self.assertEqual(
            start_work(kickoff, acting_user_id=FREELANCER, acted_at=LATER).status,
            EngagementStatus.IN_PROGRESS,
        )
        self.assertEqual(
            request_engagement_cancellation(
                kickoff,
                requesting_user_id=FREELANCER,
                requested_at=LATER,
                detail=_cancellation_detail(),
            ).previous_active_status,
            EngagementStatus.KICKOFF_PENDING,
        )

    def test_in_progress_can_request_completion_or_cancellation(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        completion = request_completion(
            in_progress,
            requesting_user_id=CLIENT,
            requested_at=LATER,
        )
        self.assertEqual(completion.status, EngagementStatus.COMPLETION_PENDING)
        cancellation = request_engagement_cancellation(
            in_progress,
            requesting_user_id=FREELANCER,
            requested_at=LATER,
            detail=_cancellation_detail(),
        )
        self.assertEqual(cancellation.status, EngagementStatus.CANCELLATION_PENDING)

    def test_other_party_confirms_or_declines_completion(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        pending = request_completion(in_progress, requesting_user_id=CLIENT, requested_at=LATER)
        self.assertEqual(
            resolve_completion(pending, acting_user_id=FREELANCER, confirmed=True).status,
            EngagementStatus.COMPLETED,
        )
        declined = resolve_completion(pending, acting_user_id=FREELANCER, confirmed=False)
        self.assertEqual(declined.status, EngagementStatus.IN_PROGRESS)
        self.assertIsNone(declined.completion_requested_by_user_id)

    def test_completion_requester_cannot_confirm_own_request(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        pending = request_completion(in_progress, requesting_user_id=CLIENT, requested_at=LATER)
        with self.assertRaises(PolicyViolationError):
            resolve_completion(pending, acting_user_id=CLIENT, confirmed=True)

    def test_completion_pending_can_request_cancellation_and_restore_exact_state(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        completion = request_completion(in_progress, requesting_user_id=CLIENT, requested_at=LATER)
        cancellation = request_engagement_cancellation(
            completion,
            requesting_user_id=FREELANCER,
            requested_at=LATER,
            detail=_cancellation_detail(),
        )
        self.assertEqual(cancellation.previous_active_status, EngagementStatus.COMPLETION_PENDING)
        restored = withdraw_engagement_cancellation(cancellation, acting_user_id=FREELANCER)
        self.assertEqual(restored.status, EngagementStatus.COMPLETION_PENDING)
        self.assertEqual(restored.completion_requested_by_user_id, CLIENT)

    def test_other_party_acknowledges_cancellation(self) -> None:
        pending = request_engagement_cancellation(
            _engagement(),
            requesting_user_id=CLIENT,
            requested_at=LATER,
            detail=_cancellation_detail(),
        )
        cancelled = acknowledge_engagement_cancellation(pending, acting_user_id=FREELANCER)
        self.assertEqual(cancelled.status, EngagementStatus.CANCELLED)
        self.assertEqual(cancelled.previous_active_status, EngagementStatus.CONFIRMED)

    def test_cancellation_requester_cannot_acknowledge_and_other_party_cannot_withdraw(self) -> None:
        pending = request_engagement_cancellation(
            _engagement(),
            requesting_user_id=CLIENT,
            requested_at=LATER,
            detail=_cancellation_detail(),
        )
        with self.assertRaises(PolicyViolationError):
            acknowledge_engagement_cancellation(pending, acting_user_id=CLIENT)
        with self.assertRaises(PolicyViolationError):
            withdraw_engagement_cancellation(pending, acting_user_id=FREELANCER)

    def test_completed_and_cancelled_are_terminal(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        completion = request_completion(in_progress, requesting_user_id=CLIENT, requested_at=LATER)
        completed = resolve_completion(completion, acting_user_id=FREELANCER, confirmed=True)
        cancellation = request_engagement_cancellation(
            _engagement(),
            requesting_user_id=CLIENT,
            requested_at=LATER,
            detail=_cancellation_detail(),
        )
        cancelled = acknowledge_engagement_cancellation(cancellation, acting_user_id=FREELANCER)
        for terminal in (completed, cancelled):
            with self.subTest(status=terminal.status):
                with self.assertRaises(InvalidTransitionError):
                    prepare_kickoff(terminal, acting_user_id=CLIENT)
                with self.assertRaises(InvalidTransitionError):
                    request_engagement_cancellation(
                        terminal,
                        requesting_user_id=CLIENT,
                        requested_at=LATER,
                        detail=_cancellation_detail(),
                    )

    def test_non_participant_cannot_act(self) -> None:
        with self.assertRaises(PolicyViolationError):
            prepare_kickoff(_engagement(), acting_user_id="outsider")

    def test_snapshot_and_engagement_are_frozen(self) -> None:
        snapshot = _snapshot()
        with self.assertRaises(FrozenInstanceError):
            snapshot.gig_version_id = "changed"  # type: ignore[misc]
        engagement = _engagement()
        with self.assertRaises(FrozenInstanceError):
            engagement.status = EngagementStatus.IN_PROGRESS  # type: ignore[misc]

    def test_accepted_snapshot_preserves_client_payment_terms(self) -> None:
        snapshot = _snapshot()
        self.assertEqual(snapshot.client_payment.budget.minimum, Decimal("40000"))
        self.assertEqual(snapshot.client_payment.budget.maximum, Decimal("60000"))

    def test_comfortable_within_budget_snapshot_is_independently_interpretable(self) -> None:
        scope = _scope()
        client_payment = FixedPriceClientPayment(
            PaymentStructure.FIXED_PRICE,
            MoneyRange(Currency("INR"), Decimal("40000"), Decimal("60000")),
            BudgetFlexibility.STRICT,
        )
        proposal = FixedPriceProposal(
            PaymentStructure.FIXED_PRICE,
            Currency("INR"),
            FixedProposalMode.COMFORTABLE_WITHIN_POSTED_BUDGET,
            scope,
        )
        snapshot = AcceptedProposalSnapshot(
            application_version_id="av-1",
            gig_version_id="gv-1",
            client_payment=client_payment,
            proposal=proposal,
            timeline=Duration(DurationMode.EXACT, DurationUnit.WEEKS, exact_value=Decimal("4")),
            availability=Availability(date(2026, 7, 20)),
            scope=scope,
            captured_at=NOW,
        )
        self.assertIsNone(snapshot.proposal.exact_total)
        self.assertEqual(snapshot.client_payment.budget.maximum, Decimal("60000"))

    def test_engagement_action_timestamps_cannot_move_backwards(self) -> None:
        in_progress = start_work(_engagement(), acting_user_id=CLIENT, acted_at=LATER)
        with self.assertRaises(ContractValidationError):
            request_completion(
                in_progress,
                requesting_user_id=CLIENT,
                requested_at=datetime(2026, 7, 15, 10, 30, tzinfo=timezone.utc),
            )

        completion = request_completion(
            in_progress,
            requesting_user_id=CLIENT,
            requested_at=AFTER_START,
        )
        with self.assertRaises(ContractValidationError):
            request_engagement_cancellation(
                completion,
                requesting_user_id=FREELANCER,
                requested_at=BETWEEN,
                detail=_cancellation_detail(),
            )

    def test_snapshot_requires_acknowledgement_when_total_ceiling_cannot_validate_hourly_rate(self) -> None:
        scope = _scope()
        client_payment = OpenClientPayment(
            PaymentStructure.OPEN_TO_PROPOSALS,
            MaximumBudgetCeiling(
                FinancialGuidanceType.MAXIMUM_BUDGET_CEILING,
                Currency("INR"),
                Decimal("100000"),
            ),
            PreferredProposalForm.HOURLY_PROPOSAL,
        )
        proposal = OpenProposal(
            PaymentStructure.OPEN_TO_PROPOSALS,
            Currency("INR"),
            OpenProposalMode.PROPOSED_HOURLY_RATE,
            scope,
            hourly_rate=Decimal("2000"),
        )
        values = {
            "application_version_id": "av-1",
            "gig_version_id": "gv-1",
            "client_payment": client_payment,
            "proposal": proposal,
            "timeline": Duration(DurationMode.EXACT, DurationUnit.WEEKS, exact_value=Decimal("4")),
            "availability": Availability(date(2026, 7, 20)),
            "scope": scope,
            "captured_at": NOW,
        }
        with self.assertRaises(ContractValidationError):
            AcceptedProposalSnapshot(**values)
        acknowledged = AcceptedProposalSnapshot(**values, out_of_range_acknowledged=True)
        self.assertTrue(acknowledged.out_of_range_acknowledged)


if __name__ == "__main__":
    unittest.main()
