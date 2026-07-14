from __future__ import annotations

import subprocess
import sys
import unittest
from dataclasses import fields
from datetime import datetime, timezone
from decimal import Decimal

from app.marketplace.applications import ApplicationStage
from app.marketplace.effects import (
    ApplicationVersionChangeEffects,
    FailedEngagementReopeningEffects,
    GigCancellationEffects,
    MaterialGigVersionEffects,
    SelectionAcceptanceEffects,
)
from app.marketplace.engagements import EngagementStatus
from app.marketplace.errors import ContractValidationError, PolicyViolationError
from app.marketplace.gigs import ApplicationIntake, OpportunityLifecycle
from app.marketplace.payments import Currency, PaymentStructure
from app.marketplace.policy import MarketplacePolicy
from app.marketplace.ranking import (
    ApplicantListQuery,
    ApplicantSort,
    ApplicantView,
    RankingMetadata,
    RankingMode,
    SemanticStatus,
    SemanticUnavailableReason,
)
from app.marketplace.reasons import (
    EngagementCancellationDetail,
    EngagementCancellationReason,
    GigCancellationDetail,
    GigCancellationReason,
    GigPauseDetail,
    GigPauseReason,
    NotSelectedDecision,
    NotSelectedOrigin,
    NotSelectedReason,
    ReconsiderationDetail,
    ReconsiderationReason,
    SelectionCancellationDetail,
    SelectionCancellationReason,
    SelectionResendDetail,
    SelectionResendReason,
    WithdrawalDetail,
    WithdrawalReason,
    validate_not_selected_for_stage,
)
from app.marketplace.responses import (
    ApplicationStageView,
    CommercialProposalView,
    EngagementParticipantSummary,
    EngagementParticipantRole,
    EngagementSummary,
    RankedApplicantSummary,
    SafeClientSummary,
    SafeFreelancerSummary,
    SelectionRequestSummary,
)
from app.marketplace.selections import SelectionInvalidationReason, SelectionRequestStatus


NOW = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)


class ReasonContractTests(unittest.TestCase):
    def test_other_requires_explanation_for_each_reason_context(self) -> None:
        constructors = (
            lambda: WithdrawalDetail(WithdrawalReason.OTHER),
            lambda: GigPauseDetail(GigPauseReason.OTHER),
            lambda: SelectionCancellationDetail(SelectionCancellationReason.OTHER),
            lambda: EngagementCancellationDetail(EngagementCancellationReason.OTHER),
            lambda: ReconsiderationDetail(ReconsiderationReason.OTHER),
            lambda: SelectionResendDetail(SelectionResendReason.OTHER),
            lambda: NotSelectedDecision(
                NotSelectedReason.OTHER,
                NotSelectedOrigin.CLIENT_DECISION,
            ),
        )
        for constructor in constructors:
            with self.subTest(constructor=constructor), self.assertRaises(ContractValidationError):
                constructor()

    def test_advanced_not_selected_requires_feedback_and_finality(self) -> None:
        decision = NotSelectedDecision(
            NotSelectedReason.EXPERIENCE_LEVEL_MISMATCH,
            NotSelectedOrigin.CLIENT_DECISION,
        )
        validate_not_selected_for_stage(decision, application_is_advanced=False)
        with self.assertRaises(ContractValidationError):
            validate_not_selected_for_stage(decision, application_is_advanced=True)
        complete = NotSelectedDecision(
            NotSelectedReason.EXPERIENCE_LEVEL_MISMATCH,
            NotSelectedOrigin.CLIENT_DECISION,
            feedback_points=("The role requires deeper production operations experience.",),
            finality_confirmed=True,
        )
        validate_not_selected_for_stage(complete, application_is_advanced=True)

    def test_automatic_selection_closure_uses_system_reason_without_fake_feedback(self) -> None:
        automatic = NotSelectedDecision(
            NotSelectedReason.ANOTHER_APPLICANT_SELECTED,
            NotSelectedOrigin.SELECTION_CONFIRMED,
        )
        validate_not_selected_for_stage(automatic, application_is_advanced=True)
        with self.assertRaises(ContractValidationError):
            NotSelectedDecision(
                NotSelectedReason.ANOTHER_APPLICANT_SELECTED,
                NotSelectedOrigin.SELECTION_CONFIRMED,
                feedback_points=("Invented personal feedback",),
            )

    def test_gig_cancellation_requires_explanation_and_explicit_confirmation(self) -> None:
        with self.assertRaises(ContractValidationError):
            GigCancellationDetail(
                GigCancellationReason.BUSINESS_PRIORITIES_CHANGED,
                "Priorities changed.",
                False,
            )
        detail = GigCancellationDetail(
            GigCancellationReason.BUSINESS_PRIORITIES_CHANGED,
            "This opportunity is no longer available.",
            True,
        )
        self.assertTrue(detail.closes_active_records_confirmed)

    def test_gig_pause_or_cancellation_is_not_a_not_selected_reason(self) -> None:
        values = {reason.value for reason in NotSelectedReason}
        self.assertNotIn("gig_paused", values)
        self.assertNotIn("gig_cancelled", values)


class RankingContractTests(unittest.TestCase):
    def test_honest_hybrid_semantic_and_keyword_contracts(self) -> None:
        hybrid = RankingMetadata(
            RankingMode.HYBRID,
            SemanticStatus.AVAILABLE,
            0.8,
            keyword_score=0.75,
            semantic_score=0.85,
            hybrid_score=0.8,
        )
        semantic = RankingMetadata(
            RankingMode.SEMANTIC,
            SemanticStatus.AVAILABLE,
            0.85,
            semantic_score=0.85,
        )
        keyword = RankingMetadata(
            RankingMode.KEYWORD,
            SemanticStatus.NOT_REQUESTED,
            0.75,
            keyword_score=0.75,
        )
        self.assertEqual(hybrid.ranking_mode, RankingMode.HYBRID)
        self.assertEqual(semantic.semantic_score, 0.85)
        self.assertEqual(keyword.keyword_score, 0.75)

    def test_honest_keyword_fallback_contract(self) -> None:
        fallback = RankingMetadata(
            RankingMode.KEYWORD_FALLBACK,
            SemanticStatus.UNAVAILABLE,
            0.74,
            keyword_score=0.74,
            semantic_unavailable_reason=SemanticUnavailableReason.EMBEDDING_PROVIDER_NOT_CONFIGURED,
        )
        self.assertIsNone(fallback.semantic_score)
        self.assertIsNone(fallback.hybrid_score)

    def test_keyword_fallback_rejects_false_scores_and_missing_reason(self) -> None:
        invalid_kwargs = (
            {"semantic_score": 0.5},
            {"hybrid_score": 0.6},
            {"ranking_score": 0.7},
        )
        for changes in invalid_kwargs:
            kwargs = {
                "ranking_mode": RankingMode.KEYWORD_FALLBACK,
                "semantic_status": SemanticStatus.UNAVAILABLE,
                "ranking_score": 0.8,
                "keyword_score": 0.8,
                "semantic_unavailable_reason": SemanticUnavailableReason.EMBEDDING_PROVIDER_UNAVAILABLE,
                **changes,
            }
            with self.subTest(changes=changes), self.assertRaises(ContractValidationError):
                RankingMetadata(**kwargs)
        with self.assertRaises(ContractValidationError):
            RankingMetadata(
                RankingMode.KEYWORD_FALLBACK,
                SemanticStatus.UNAVAILABLE,
                0.8,
                keyword_score=0.8,
            )

    def test_ranking_score_must_equal_the_selected_mode_score(self) -> None:
        invalid_contracts = (
            {
                "ranking_mode": RankingMode.HYBRID,
                "semantic_status": SemanticStatus.AVAILABLE,
                "ranking_score": 0.1,
                "keyword_score": 0.2,
                "semantic_score": 0.3,
                "hybrid_score": 0.9,
            },
            {
                "ranking_mode": RankingMode.SEMANTIC,
                "semantic_status": SemanticStatus.AVAILABLE,
                "ranking_score": 0.1,
                "semantic_score": 0.9,
            },
            {
                "ranking_mode": RankingMode.KEYWORD,
                "semantic_status": SemanticStatus.NOT_REQUESTED,
                "ranking_score": 0.1,
                "keyword_score": 0.9,
            },
        )
        for contract in invalid_contracts:
            with self.subTest(mode=contract["ranking_mode"]), self.assertRaises(ContractValidationError):
                RankingMetadata(**contract)

    def test_sorting_and_filtering_are_separate(self) -> None:
        query = ApplicantListQuery(ApplicantSort.NEWEST, ApplicantView.INTERNAL_SHORTLIST)
        self.assertEqual(query.sort, ApplicantSort.NEWEST)
        self.assertEqual(query.view, ApplicantView.INTERNAL_SHORTLIST)


class ProductPolicyTests(unittest.TestCase):
    def test_locked_defaults_and_deadline_options(self) -> None:
        policy = MarketplacePolicy()
        self.assertEqual(policy.current_shortlist_limit, 5)
        self.assertEqual(policy.standard_expanded_shortlist_option, 10)
        self.assertEqual(policy.maximum_active_advanced_applicants, 5)
        self.assertEqual(policy.pre_advancement_clarification_limit, 2)
        self.assertEqual(policy.allowed_selection_deadline_hours, (24, 48, 72))
        self.assertIn(policy.default_selection_deadline_hours, policy.allowed_selection_deadline_hours)
        self.assertEqual((policy.selection_deadline(NOW) - NOW).total_seconds(), 48 * 3600)

    def test_ten_is_not_an_enterprise_maximum(self) -> None:
        policy = MarketplacePolicy()
        self.assertEqual(policy.effective_shortlist_limit(25), 25)
        self.assertNotIn("maximum_shortlist_limit", {field.name for field in fields(MarketplacePolicy)})

    def test_policy_values_validate_and_fixed_invariants_are_not_configurable(self) -> None:
        with self.assertRaises(ContractValidationError):
            MarketplacePolicy(current_shortlist_limit=0)
        with self.assertRaises(ContractValidationError):
            MarketplacePolicy(default_selection_deadline_hours=36)
        with self.assertRaises(PolicyViolationError):
            MarketplacePolicy().selection_deadline(NOW, 36)
        names = {field.name for field in fields(MarketplacePolicy)}
        self.assertTrue(names.isdisjoint({"applications_per_freelancer_per_gig", "active_selections_per_gig", "confirmed_applicants_per_gig"}))


class PrivacyAndEffectContractTests(unittest.TestCase):
    def test_sanitised_primitives_exclude_forbidden_fields(self) -> None:
        model_types = (
            SafeClientSummary,
            SafeFreelancerSummary,
            CommercialProposalView,
            ApplicationStageView,
            RankedApplicantSummary,
            SelectionRequestSummary,
            EngagementParticipantSummary,
            EngagementSummary,
        )
        forbidden = {
            "email",
            "phone",
            "phone_number",
            "whatsapp_number",
            "meeting_link",
            "professional_profile_url",
            "raw_resume_text",
            "raw_gig_parse_text",
            "raw_parse_rows",
            "auth_metadata",
            "access_token",
            "service_role",
            "embedding_vector",
            "raw_semantic_text",
            "backend_secret",
            "internal_shortlist",
        }
        for model_type in model_types:
            with self.subTest(model_type=model_type.__name__):
                self.assertTrue({field.name for field in fields(model_type)}.isdisjoint(forbidden))

    def test_sanitised_dataclasses_reject_unknown_fields(self) -> None:
        with self.assertRaises(TypeError):
            SafeClientSummary(client_id="c-1", display_name="Client", email="private@example.com")  # type: ignore[call-arg]

    def test_response_contracts_reject_impossible_derived_states_and_mutable_skills(self) -> None:
        with self.assertRaises(ContractValidationError):
            ApplicationStageView("a-1", ApplicationStage.CONFIRMED, False, True)
        with self.assertRaises(ContractValidationError):
            ApplicationStageView("a-1", ApplicationStage.CONFIRMED, True, False)
        with self.assertRaises(ContractValidationError):
            SafeFreelancerSummary("f-1", "Freelancer", top_skills=["Python"])  # type: ignore[arg-type]
        with self.assertRaises(ContractValidationError):
            CommercialProposalView(
                PaymentStructure.FIXED_PRICE,
                Currency("INR"),
                Decimal("50000"),
                Decimal("40000"),
            )

    def test_engagement_response_participants_must_be_distinct(self) -> None:
        client = EngagementParticipantSummary("same-user", "Client", EngagementParticipantRole.CLIENT)
        freelancer = EngagementParticipantSummary(
            "same-user",
            "Freelancer",
            EngagementParticipantRole.FREELANCER,
        )
        with self.assertRaises(ContractValidationError):
            EngagementSummary(
                "engagement-1",
                "gig-1",
                EngagementStatus.CONFIRMED,
                client,
                freelancer,
                NOW,
            )

    def test_cross_aggregate_effects_are_narrow_and_explicit(self) -> None:
        accepted = SelectionAcceptanceEffects("a-selected", ("a-other",))
        self.assertEqual(accepted.selection_request_status, SelectionRequestStatus.ACCEPTED)
        self.assertEqual(accepted.selected_application_stage, ApplicationStage.CONFIRMED)
        self.assertEqual(accepted.other_active_application_stage, ApplicationStage.NOT_SELECTED)
        self.assertEqual(accepted.other_application_not_selected_origin, NotSelectedOrigin.SELECTION_CONFIRMED)
        self.assertEqual(
            accepted.other_application_not_selected_reason,
            NotSelectedReason.ANOTHER_APPLICANT_SELECTED,
        )
        self.assertTrue(accepted.engagement_creation_required)

        cancelled = GigCancellationEffects(("a-1",), "selection-1")
        self.assertEqual(cancelled.gig_lifecycle, OpportunityLifecycle.CANCELLED)
        self.assertEqual(cancelled.active_application_stage, ApplicationStage.CLOSED_GIG_CANCELLED)
        self.assertTrue(cancelled.preserve_history)

        edited = ApplicationVersionChangeEffects("av-2", "av-1", "selection-1")
        self.assertEqual(edited.invalidation_reason, SelectionInvalidationReason.APPLICATION_VERSION_CHANGED)
        self.assertTrue(edited.fresh_client_review_required)

        material = MaterialGigVersionEffects("gv-2", ("a-1",), ("selection-1",))
        self.assertEqual(material.invalidation_reason, SelectionInvalidationReason.GIG_VERSION_CHANGED)
        self.assertTrue(material.response_required_is_derived_from_version_linkage)

        reopened = FailedEngagementReopeningEffects(("a-1", "a-2"))
        self.assertEqual(reopened.engagement_status, EngagementStatus.CANCELLED)
        self.assertEqual(reopened.reopened_gig_state.lifecycle, OpportunityLifecycle.ACTIVE)
        self.assertEqual(reopened.reopened_gig_state.intake, ApplicationIntake.CLOSED)
        self.assertFalse(reopened.previous_applications_reactivated)

    def test_marketplace_modules_import_without_framework_or_persistence_dependencies(self) -> None:
        command = (
            "import sys; "
            "from app.marketplace import applications, common, effects, engagements, errors, gigs, payments, "
            "policy, ranking, reasons, responses, selections; "
            "blocked={'fastapi','pydantic','supabase'}; "
            "print(','.join(sorted(blocked.intersection(sys.modules))))"
        )
        result = subprocess.run(
            [sys.executable, "-S", "-c", command],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.stdout.strip(), "")


if __name__ == "__main__":
    unittest.main()
