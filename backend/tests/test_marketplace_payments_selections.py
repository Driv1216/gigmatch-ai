from __future__ import annotations

import unittest
from dataclasses import FrozenInstanceError
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.marketplace.applications import (
    ApplicationStage,
    ApplicationState,
    ApplicationVersion,
    ApplicationVersionOrigin,
)
from app.marketplace.common import (
    Availability,
    DecimalRange,
    Duration,
    DurationMode,
    DurationUnit,
    ProposalScope,
)
from app.marketplace.errors import (
    ContractValidationError,
    InvalidTransitionError,
    PolicyViolationError,
    ProposalCompatibilityError,
    SelectionReadinessError,
)
from app.marketplace.gigs import close_applications, draft_gig_state, pause_gig, publish_gig
from app.marketplace.payments import (
    BudgetFlexibility,
    Currency,
    DiscoveryPhase,
    ExpectedMarketRangeGuidance,
    FinancialGuidanceType,
    FixedPriceClientPayment,
    FixedPriceProposal,
    FixedProposalMode,
    HourlyClientPayment,
    HourlyProposal,
    IndicativeBudgetGuidance,
    MaximumBudgetCeiling,
    MoneyRange,
    NoReliableEstimateGuidance,
    OpenClientPayment,
    OpenProposal,
    OpenProposalMode,
    PaymentStructure,
    PreferredProposalForm,
    PricingPhase,
    RateFlexibility,
    validate_financial_compatibility,
)
from app.marketplace.reasons import (
    SelectionCancellationDetail,
    SelectionCancellationReason,
    SelectionResendDetail,
    SelectionResendReason,
)
from app.marketplace.selections import (
    DeclineDisposition,
    SelectionInvalidationReason,
    SelectionRequest,
    SelectionRequestStatus,
    invalidate_for_application_version_change,
    transition_selection_request,
    validate_no_unchanged_duplicate_request,
    validate_selection_readiness,
)


NOW = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
BEFORE_EXPIRY = datetime(2026, 7, 15, 11, 0, tzinfo=timezone.utc)
EXPIRY = datetime(2026, 7, 17, 10, 0, tzinfo=timezone.utc)
AFTER_EXPIRY = datetime(2026, 7, 17, 10, 1, tzinfo=timezone.utc)
INR = Currency("INR")


def _scope(*, complete_open: bool = True) -> ProposalScope:
    return ProposalScope(
        included_work=("Backend implementation",),
        excluded_work=("Third-party fees",),
        assumptions=("Requirements are approved",),
        estimate_change_factors=("Scope additions",) if complete_open else (),
    )


def _timeline(mode: DurationMode = DurationMode.EXACT) -> Duration:
    if mode is DurationMode.REQUIRES_DISCUSSION:
        return Duration(mode)
    return Duration(mode, DurationUnit.WEEKS, exact_value=Decimal("4"))


def _fixed_client() -> FixedPriceClientPayment:
    return FixedPriceClientPayment(
        PaymentStructure.FIXED_PRICE,
        MoneyRange(INR, Decimal("40000"), Decimal("60000")),
        BudgetFlexibility.STRICT,
    )


def _fixed_proposal(
    *,
    mode: FixedProposalMode = FixedProposalMode.EXACT_TOTAL,
    amount: Decimal | None = Decimal("50000"),
    explanation: str | None = None,
) -> FixedPriceProposal:
    return FixedPriceProposal(
        payment_structure=PaymentStructure.FIXED_PRICE,
        currency=INR,
        mode=mode,
        scope=_scope(),
        exact_total=amount if mode is FixedProposalMode.EXACT_TOTAL else None,
        total_range=(
            MoneyRange(INR, Decimal("45000"), Decimal("55000"))
            if mode is FixedProposalMode.TOTAL_RANGE
            else None
        ),
        above_budget_explanation=explanation,
    )


def _application(stage: ApplicationStage = ApplicationStage.ADVANCED, version_id: str = "av-1") -> ApplicationState:
    return ApplicationState(
        application_id="application-1",
        gig_id="gig-1",
        freelancer_id="freelancer-1",
        stage=stage,
        current_version_id=version_id,
        submitted_at=NOW,
        last_updated_at=NOW,
    )


def _version(
    *,
    proposal: FixedPriceProposal | HourlyProposal | OpenProposal | None = None,
    timeline: Duration | None = None,
    version_id: str = "av-1",
    gig_version_id: str = "gv-1",
) -> ApplicationVersion:
    resolved_proposal = proposal or _fixed_proposal()
    return ApplicationVersion(
        application_version_id=version_id,
        application_id="application-1",
        version_number=1,
        gig_version_id=gig_version_id,
        origin=ApplicationVersionOrigin.INITIAL_SUBMISSION,
        cover_note="I can deliver these terms.",
        proposal=resolved_proposal,
        timeline=timeline or _timeline(),
        availability=Availability(date(2026, 7, 20)),
        scope=resolved_proposal.scope,
        scope_notes=None,
        created_at=NOW,
        created_by_user_id="freelancer-user",
    )


def _selection_request(**changes: object) -> SelectionRequest:
    values: dict[str, object] = {
        "selection_request_id": "selection-1",
        "gig_id": "gig-1",
        "application_id": "application-1",
        "application_version_id": "av-1",
        "gig_version_id": "gv-1",
        "created_by_user_id": "client-user",
        "created_at": NOW,
        "expires_at": EXPIRY,
    }
    values.update(changes)
    return SelectionRequest(**values)  # type: ignore[arg-type]


class PaymentValueContractTests(unittest.TestCase):
    def test_money_uses_positive_decimal_and_ordered_ranges(self) -> None:
        with self.assertRaises(ContractValidationError):
            MoneyRange(INR, Decimal("0"), Decimal("1"))
        with self.assertRaises(ContractValidationError):
            MoneyRange(INR, Decimal("2"), Decimal("1"))
        with self.assertRaises(ContractValidationError):
            MoneyRange(INR, 1.0, 2.0)  # type: ignore[arg-type]

    def test_currency_is_structured_and_strict(self) -> None:
        for code in ("inr", "RUPEE", "₹₹₹"):
            with self.subTest(code=code), self.assertRaises(ContractValidationError):
                Currency(code)

    def test_duration_requires_unit_and_valid_values(self) -> None:
        with self.assertRaises(ContractValidationError):
            Duration(DurationMode.EXACT, exact_value=Decimal("2"))
        with self.assertRaises(ContractValidationError):
            Duration(
                DurationMode.RANGE,
                DurationUnit.WEEKS,
                minimum_value=Decimal("5"),
                maximum_value=Decimal("2"),
            )
        self.assertFalse(Duration(DurationMode.REQUIRES_DISCUSSION).is_selection_ready)

    def test_fixed_contract_rejects_mixed_mode_fields(self) -> None:
        with self.assertRaises(ContractValidationError):
            FixedPriceProposal(
                PaymentStructure.FIXED_PRICE,
                INR,
                FixedProposalMode.EXACT_TOTAL,
                _scope(),
                exact_total=Decimal("50000"),
                total_range=MoneyRange(INR, Decimal("1"), Decimal("2")),
            )

    def test_hourly_contract_validates_rate_and_client_ranges(self) -> None:
        client = HourlyClientPayment(
            PaymentStructure.HOURLY,
            MoneyRange(INR, Decimal("500"), Decimal("1000")),
            DecimalRange(Decimal("20"), Decimal("40")),
            Duration(DurationMode.RANGE, DurationUnit.MONTHS, minimum_value=Decimal("3"), maximum_value=Decimal("6")),
        )
        proposal = HourlyProposal(
            PaymentStructure.HOURLY,
            INR,
            Decimal("800"),
            DecimalRange(Decimal("25"), Decimal("35")),
            date(2026, 7, 20),
            RateFlexibility.NEGOTIABLE,
            _scope(),
        )
        self.assertFalse(validate_financial_compatibility(client, proposal).outside_posted_range)

    def test_open_no_estimate_requires_explanation(self) -> None:
        with self.assertRaises(ContractValidationError):
            NoReliableEstimateGuidance(FinancialGuidanceType.NO_RELIABLE_ESTIMATE, INR, "")

    def test_open_proposal_requires_all_explanations_and_one_pricing_variant(self) -> None:
        with self.assertRaises(ContractValidationError):
            OpenProposal(
                PaymentStructure.OPEN_TO_PROPOSALS,
                INR,
                OpenProposalMode.PROPOSED_HOURLY_RATE,
                _scope(complete_open=False),
                hourly_rate=Decimal("900"),
            )
        with self.assertRaises(ContractValidationError):
            OpenProposal(
                PaymentStructure.OPEN_TO_PROPOSALS,
                INR,
                OpenProposalMode.PROPOSED_HOURLY_RATE,
                _scope(),
                hourly_rate=Decimal("900"),
                fixed_price_range=MoneyRange(INR, Decimal("1"), Decimal("2")),
            )

    def test_phased_and_discovery_estimates_require_concrete_terms(self) -> None:
        with self.assertRaises(ContractValidationError):
            OpenProposal(
                PaymentStructure.OPEN_TO_PROPOSALS,
                INR,
                OpenProposalMode.PHASED_ESTIMATE,
                _scope(),
            )
        with self.assertRaises(ContractValidationError):
            DiscoveryPhase("Discovery", Decimal("10000"), Duration(DurationMode.REQUIRES_DISCUSSION))
        phase = PricingPhase("Build", Decimal("30000"), _timeline())
        proposal = OpenProposal(
            PaymentStructure.OPEN_TO_PROPOSALS,
            INR,
            OpenProposalMode.PHASED_ESTIMATE,
            _scope(),
            phases=(phase,),
        )
        self.assertTrue(proposal.is_selection_ready)


class FinancialCompatibilityTests(unittest.TestCase):
    def test_proposal_currency_and_structure_must_match(self) -> None:
        wrong_currency = FixedPriceProposal(
            PaymentStructure.FIXED_PRICE,
            Currency("USD"),
            FixedProposalMode.EXACT_TOTAL,
            _scope(),
            exact_total=Decimal("500"),
        )
        with self.assertRaises(ProposalCompatibilityError):
            validate_financial_compatibility(_fixed_client(), wrong_currency)

    def test_fixed_above_budget_is_allowed_with_explanation_and_acknowledgement(self) -> None:
        proposal = _fixed_proposal(amount=Decimal("70000"), explanation="Additional integration work is included.")
        compatibility = validate_financial_compatibility(_fixed_client(), proposal)
        self.assertTrue(compatibility.outside_posted_range)
        self.assertTrue(compatibility.requires_client_acknowledgement)
        with self.assertRaises(ContractValidationError):
            validate_financial_compatibility(_fixed_client(), _fixed_proposal(amount=Decimal("70000")))

    def test_hourly_outside_range_requires_explanation(self) -> None:
        client = HourlyClientPayment(
            PaymentStructure.HOURLY,
            MoneyRange(INR, Decimal("500"), Decimal("1000")),
            DecimalRange(Decimal("20"), Decimal("40")),
            _timeline(),
        )
        proposal = HourlyProposal(
            PaymentStructure.HOURLY,
            INR,
            Decimal("1200"),
            DecimalRange(Decimal("20"), Decimal("30")),
            date(2026, 7, 20),
            RateFlexibility.FIXED,
            _scope(),
            out_of_range_explanation="Specialist rate.",
        )
        self.assertTrue(validate_financial_compatibility(client, proposal).requires_client_acknowledgement)

    def test_explicit_open_ceiling_cannot_be_exceeded(self) -> None:
        client = OpenClientPayment(
            PaymentStructure.OPEN_TO_PROPOSALS,
            MaximumBudgetCeiling(FinancialGuidanceType.MAXIMUM_BUDGET_CEILING, INR, Decimal("50000")),
            PreferredProposalForm.PHASED_PRICING,
        )
        proposal = OpenProposal(
            PaymentStructure.OPEN_TO_PROPOSALS,
            INR,
            OpenProposalMode.PHASED_ESTIMATE,
            _scope(),
            phases=(
                PricingPhase("One", Decimal("30000"), _timeline()),
                PricingPhase("Two", Decimal("25000"), _timeline()),
            ),
        )
        with self.assertRaises(ProposalCompatibilityError):
            validate_financial_compatibility(client, proposal)

    def test_total_open_ceiling_does_not_compare_directly_to_hourly_rate(self) -> None:
        client = OpenClientPayment(
            PaymentStructure.OPEN_TO_PROPOSALS,
            MaximumBudgetCeiling(FinancialGuidanceType.MAXIMUM_BUDGET_CEILING, INR, Decimal("100000")),
            PreferredProposalForm.HOURLY_PROPOSAL,
        )
        proposal = OpenProposal(
            PaymentStructure.OPEN_TO_PROPOSALS,
            INR,
            OpenProposalMode.PROPOSED_HOURLY_RATE,
            _scope(),
            hourly_rate=Decimal("2000"),
        )
        compatibility = validate_financial_compatibility(client, proposal)
        self.assertFalse(compatibility.outside_posted_range)
        self.assertTrue(compatibility.requires_client_acknowledgement)
        self.assertEqual(
            compatibility.warning_code,
            "total_ceiling_not_calculable_for_hourly_proposal",
        )

    def test_other_open_guidance_variants_are_structured(self) -> None:
        indicative = IndicativeBudgetGuidance(
            FinancialGuidanceType.INDICATIVE_BUDGET_RANGE,
            MoneyRange(INR, Decimal("10000"), Decimal("20000")),
        )
        market = ExpectedMarketRangeGuidance(
            FinancialGuidanceType.EXPECTED_MARKET_RANGE,
            MoneyRange(INR, Decimal("15000"), Decimal("25000")),
        )
        self.assertEqual(indicative.budget.currency, INR)
        self.assertEqual(market.market_range.currency, INR)


class SelectionRequestStateMachineTests(unittest.TestCase):
    def test_every_pending_transition_and_status_metadata(self) -> None:
        cancellation = SelectionCancellationDetail(SelectionCancellationReason.CLIENT_WITHDREW_REQUEST)
        cases = (
            (SelectionRequestStatus.ACCEPTED, BEFORE_EXPIRY, {}),
            (SelectionRequestStatus.DECLINED, BEFORE_EXPIRY, {"decline_disposition": DeclineDisposition.REMAIN_INTERESTED}),
            (SelectionRequestStatus.REVISION_REQUESTED, BEFORE_EXPIRY, {}),
            (SelectionRequestStatus.EXPIRED, AFTER_EXPIRY, {}),
            (SelectionRequestStatus.CANCELLED, BEFORE_EXPIRY, {"cancellation_detail": cancellation}),
            (
                SelectionRequestStatus.INVALIDATED,
                BEFORE_EXPIRY,
                {"invalidation_reason": SelectionInvalidationReason.GIG_VERSION_CHANGED},
            ),
        )
        for status, acted_at, metadata in cases:
            with self.subTest(status=status):
                transitioned = transition_selection_request(
                    _selection_request(),
                    status,
                    acted_at=acted_at,
                    **metadata,
                )
                self.assertEqual(transitioned.status, status)
                self.assertFalse(transitioned.is_active)

    def test_terminal_request_cannot_transition_again(self) -> None:
        accepted = transition_selection_request(
            _selection_request(), SelectionRequestStatus.ACCEPTED, acted_at=BEFORE_EXPIRY
        )
        with self.assertRaises(InvalidTransitionError):
            transition_selection_request(accepted, SelectionRequestStatus.DECLINED, acted_at=BEFORE_EXPIRY)

    def test_expiry_validation_rejects_naive_and_non_future_deadlines(self) -> None:
        with self.assertRaises(ContractValidationError):
            _selection_request(expires_at=datetime(2026, 7, 16, 10, 0))
        with self.assertRaises(ContractValidationError):
            _selection_request(expires_at=NOW)
        with self.assertRaises(InvalidTransitionError):
            transition_selection_request(_selection_request(), SelectionRequestStatus.EXPIRED, acted_at=BEFORE_EXPIRY)

    def test_request_is_frozen_and_requires_exact_version_references(self) -> None:
        request = _selection_request()
        with self.assertRaises(FrozenInstanceError):
            request.status = SelectionRequestStatus.ACCEPTED  # type: ignore[misc]
        with self.assertRaises(ContractValidationError):
            _selection_request(application_version_id="")

    def test_application_edit_invalidates_pending_request(self) -> None:
        invalidated = invalidate_for_application_version_change(_selection_request(), acted_at=BEFORE_EXPIRY)
        self.assertEqual(invalidated.status, SelectionRequestStatus.INVALIDATED)
        self.assertEqual(
            invalidated.invalidation_reason,
            SelectionInvalidationReason.APPLICATION_VERSION_CHANGED,
        )

    def test_unchanged_duplicate_requires_structured_reason(self) -> None:
        request = transition_selection_request(
            _selection_request(), SelectionRequestStatus.DECLINED, acted_at=BEFORE_EXPIRY,
            decline_disposition=DeclineDisposition.REMAIN_INTERESTED,
        )
        with self.assertRaises(PolicyViolationError):
            validate_no_unchanged_duplicate_request(
                previous_request=request,
                application_id="application-1",
                application_version_id="av-1",
                gig_version_id="gv-1",
                resend_detail=None,
            )
        validate_no_unchanged_duplicate_request(
            previous_request=request,
            application_id="application-1",
            application_version_id="av-1",
            gig_version_id="gv-1",
            resend_detail=SelectionResendDetail(SelectionResendReason.FREELANCER_REMAINED_INTERESTED),
        )

    def test_pending_request_always_blocks_duplicate_even_with_resend_reason(self) -> None:
        with self.assertRaises(PolicyViolationError):
            validate_no_unchanged_duplicate_request(
                previous_request=_selection_request(),
                application_id="application-1",
                application_version_id="av-1",
                gig_version_id="gv-1",
                resend_detail=SelectionResendDetail(SelectionResendReason.TERMS_RECONFIRMED),
            )

    def test_unchanged_resend_is_restricted_by_terminal_outcome(self) -> None:
        accepted = transition_selection_request(
            _selection_request(),
            SelectionRequestStatus.ACCEPTED,
            acted_at=BEFORE_EXPIRY,
        )
        with self.assertRaises(PolicyViolationError):
            validate_no_unchanged_duplicate_request(
                previous_request=accepted,
                application_id="application-1",
                application_version_id="av-1",
                gig_version_id="gv-1",
                resend_detail=SelectionResendDetail(SelectionResendReason.TERMS_RECONFIRMED),
            )

        withdrawn = transition_selection_request(
            _selection_request(),
            SelectionRequestStatus.DECLINED,
            acted_at=BEFORE_EXPIRY,
            decline_disposition=DeclineDisposition.WITHDRAW_COMPLETELY,
        )
        with self.assertRaises(PolicyViolationError):
            validate_no_unchanged_duplicate_request(
                previous_request=withdrawn,
                application_id="application-1",
                application_version_id="av-1",
                gig_version_id="gv-1",
                resend_detail=SelectionResendDetail(SelectionResendReason.FREELANCER_REMAINED_INTERESTED),
            )


class SelectionReadinessTests(unittest.TestCase):
    def test_advanced_current_concrete_version_on_closed_gig_is_ready(self) -> None:
        closed_gig = close_applications(publish_gig(draft_gig_state()))
        result = validate_selection_readiness(
            application=_application(),
            gig_state=closed_gig,
            current_version=_version(),
            latest_material_gig_version_id="gv-1",
            client_payment=_fixed_client(),
            has_other_active_selection_for_gig=False,
            out_of_range_acknowledged=False,
        )
        self.assertEqual(result.application_version_id, "av-1")

    def test_only_advanced_active_application_is_ready(self) -> None:
        for stage in (ApplicationStage.UNDER_REVIEW, ApplicationStage.NOT_SELECTED):
            with self.subTest(stage=stage), self.assertRaises(SelectionReadinessError) as caught:
                validate_selection_readiness(
                    application=_application(stage),
                    gig_state=publish_gig(draft_gig_state()),
                    current_version=_version(),
                    latest_material_gig_version_id="gv-1",
                    client_payment=_fixed_client(),
                    has_other_active_selection_for_gig=False,
                    out_of_range_acknowledged=False,
                )
            self.assertIn("application_not_advanced", caught.exception.issues)

    def test_paused_stale_unresolved_or_second_active_selection_is_not_ready(self) -> None:
        with self.assertRaises(SelectionReadinessError) as caught:
            validate_selection_readiness(
                application=_application(version_id="different-version"),
                gig_state=pause_gig(publish_gig(draft_gig_state())),
                current_version=_version(
                    proposal=_fixed_proposal(
                        mode=FixedProposalMode.REQUIRES_SCOPE_CLARIFICATION,
                        amount=None,
                    ),
                    timeline=_timeline(DurationMode.REQUIRES_DISCUSSION),
                    gig_version_id="gv-old",
                ),
                latest_material_gig_version_id="gv-latest",
                client_payment=_fixed_client(),
                has_other_active_selection_for_gig=True,
                out_of_range_acknowledged=False,
            )
        self.assertTrue(
            {
                "gig_not_selectable",
                "active_selection_exists",
                "current_version_mismatch",
                "stale_gig_version_response",
                "proposal_not_concrete",
                "timeline_not_concrete",
            }.issubset(set(caught.exception.issues))
        )

    def test_out_of_range_selection_requires_client_acknowledgement(self) -> None:
        above = _fixed_proposal(amount=Decimal("70000"), explanation="Expanded scope.")
        kwargs = {
            "application": _application(),
            "gig_state": publish_gig(draft_gig_state()),
            "current_version": _version(proposal=above),
            "latest_material_gig_version_id": "gv-1",
            "client_payment": _fixed_client(),
            "has_other_active_selection_for_gig": False,
        }
        with self.assertRaises(SelectionReadinessError) as caught:
            validate_selection_readiness(**kwargs, out_of_range_acknowledged=False)
        self.assertIn("out_of_range_acknowledgement_required", caught.exception.issues)
        validate_selection_readiness(**kwargs, out_of_range_acknowledged=True)

    def test_hourly_open_proposal_against_total_ceiling_requires_acknowledgement(self) -> None:
        client = OpenClientPayment(
            PaymentStructure.OPEN_TO_PROPOSALS,
            MaximumBudgetCeiling(FinancialGuidanceType.MAXIMUM_BUDGET_CEILING, INR, Decimal("100000")),
            PreferredProposalForm.HOURLY_PROPOSAL,
        )
        proposal = OpenProposal(
            PaymentStructure.OPEN_TO_PROPOSALS,
            INR,
            OpenProposalMode.PROPOSED_HOURLY_RATE,
            _scope(),
            hourly_rate=Decimal("2000"),
        )
        kwargs = {
            "application": _application(),
            "gig_state": publish_gig(draft_gig_state()),
            "current_version": _version(proposal=proposal),
            "latest_material_gig_version_id": "gv-1",
            "client_payment": client,
            "has_other_active_selection_for_gig": False,
        }
        with self.assertRaises(SelectionReadinessError) as caught:
            validate_selection_readiness(**kwargs, out_of_range_acknowledged=False)
        self.assertIn("out_of_range_acknowledgement_required", caught.exception.issues)
        validate_selection_readiness(**kwargs, out_of_range_acknowledged=True)


if __name__ == "__main__":
    unittest.main()
