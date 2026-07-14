"""Context-specific reason vocabularies and validation contracts."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.marketplace.common import require_enum_member, require_non_empty, require_optional_explanation
from app.marketplace.errors import ContractValidationError


class NotSelectedReason(str, Enum):
    REQUIRED_SKILLS_MISMATCH = "required_skills_mismatch"
    EXPERIENCE_LEVEL_MISMATCH = "experience_level_mismatch"
    PROPOSAL_EXCEEDED_BUDGET = "proposal_exceeded_budget"
    TIMELINE_OR_AVAILABILITY_MISMATCH = "timeline_or_availability_mismatch"
    STRONGER_OVERALL_MATCH = "stronger_overall_match"
    GIG_REQUIREMENTS_CHANGED = "gig_requirements_changed"
    ANOTHER_APPLICANT_SELECTED = "another_applicant_selected"
    OTHER = "other"


class NotSelectedOrigin(str, Enum):
    CLIENT_DECISION = "client_decision"
    SELECTION_CONFIRMED = "selection_confirmed"


@dataclass(frozen=True)
class NotSelectedDecision:
    reason: NotSelectedReason
    origin: NotSelectedOrigin
    feedback_points: tuple[str, ...] = ()
    finality_confirmed: bool = False
    respectful_note: str | None = None
    other_explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, NotSelectedReason, "Not Selected reason")
        require_enum_member(self.origin, NotSelectedOrigin, "Not Selected origin")
        _validate_other(self.reason, self.other_explanation, "Not Selected reason")
        for point in self.feedback_points:
            require_non_empty(point, "feedback point")
        if self.respectful_note is not None:
            require_non_empty(self.respectful_note, "respectful note")
        if self.origin is NotSelectedOrigin.SELECTION_CONFIRMED:
            if self.reason is not NotSelectedReason.ANOTHER_APPLICANT_SELECTED:
                raise ContractValidationError("Automatic selection closure must use another-applicant-selected.")
            if self.feedback_points:
                raise ContractValidationError("Automatic selection closure must not fabricate personalised feedback.")
        elif self.reason is NotSelectedReason.ANOTHER_APPLICANT_SELECTED:
            raise ContractValidationError("Another-applicant-selected is reserved for automatic closure.")


def validate_not_selected_for_stage(decision: NotSelectedDecision, *, application_is_advanced: bool) -> None:
    if decision.origin is NotSelectedOrigin.SELECTION_CONFIRMED:
        return
    if application_is_advanced and (not decision.feedback_points or not decision.finality_confirmed):
        raise ContractValidationError(
            "Advanced Not Selected decisions require feedback and explicit finality confirmation."
        )


class WithdrawalReason(str, Enum):
    ACCEPTED_ANOTHER_OPPORTUNITY = "accepted_another_opportunity"
    NO_LONGER_AVAILABLE = "no_longer_available"
    SCOPE_OR_TERMS_NO_LONGER_FIT = "scope_or_terms_no_longer_fit"
    TIMELINE_CHANGED = "timeline_changed"
    BUDGET_EXPECTATIONS_MISMATCH = "budget_expectations_mismatch"
    GIG_CHANGED_MATERIALLY = "gig_changed_materially"
    PERSONAL_CIRCUMSTANCES = "personal_circumstances"
    OTHER = "other"


@dataclass(frozen=True)
class WithdrawalDetail:
    reason: WithdrawalReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, WithdrawalReason, "withdrawal reason")
        _validate_other(self.reason, self.explanation, "withdrawal reason")


class GigPauseReason(str, Enum):
    INTERNAL_APPROVAL_PENDING = "internal_approval_pending"
    BUDGET_TEMPORARILY_UNAVAILABLE = "budget_temporarily_unavailable"
    REQUIREMENTS_UNDER_REVISION = "requirements_under_revision"
    HIRING_PAUSED = "hiring_paused"
    BUSINESS_DELAY = "business_delay"
    OTHER = "other"


@dataclass(frozen=True)
class GigPauseDetail:
    reason: GigPauseReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, GigPauseReason, "gig pause reason")
        _validate_other(self.reason, self.explanation, "gig pause reason")


class GigCancellationReason(str, Enum):
    OPPORTUNITY_NO_LONGER_REQUIRED = "opportunity_no_longer_required"
    BUDGET_NO_LONGER_AVAILABLE = "budget_no_longer_available"
    BUSINESS_PRIORITIES_CHANGED = "business_priorities_changed"
    REQUIREMENTS_CANNOT_BE_FINALISED = "requirements_cannot_be_finalised"
    POSTED_IN_ERROR = "posted_in_error"
    OTHER = "other"


@dataclass(frozen=True)
class GigCancellationDetail:
    reason: GigCancellationReason
    applicant_facing_explanation: str
    closes_active_records_confirmed: bool
    other_explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, GigCancellationReason, "gig cancellation reason")
        _validate_other(self.reason, self.other_explanation, "gig cancellation reason")
        require_non_empty(self.applicant_facing_explanation, "applicant-facing cancellation explanation")
        if not self.closes_active_records_confirmed:
            raise ContractValidationError("Gig cancellation must confirm active applications and requests will close.")


class SelectionCancellationReason(str, Enum):
    TERMS_REQUIRE_REVIEW = "terms_require_review"
    GIG_BEING_PAUSED = "gig_being_paused"
    CLIENT_WITHDREW_REQUEST = "client_withdrew_request"
    GIG_CANCELLED = "gig_cancelled"
    OTHER = "other"


@dataclass(frozen=True)
class SelectionCancellationDetail:
    reason: SelectionCancellationReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, SelectionCancellationReason, "selection cancellation reason")
        _validate_other(self.reason, self.explanation, "selection cancellation reason")


class EngagementCancellationReason(str, Enum):
    SCOPE_COULD_NOT_BE_AGREED = "scope_could_not_be_agreed"
    AVAILABILITY_CHANGED = "availability_changed"
    BUSINESS_NEEDS_CHANGED = "business_needs_changed"
    MUTUAL_DECISION = "mutual_decision"
    SAFETY_OR_POLICY_CONCERN = "safety_or_policy_concern"
    OTHER = "other"


@dataclass(frozen=True)
class EngagementCancellationDetail:
    reason: EngagementCancellationReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, EngagementCancellationReason, "engagement cancellation reason")
        _validate_other(self.reason, self.explanation, "engagement cancellation reason")


class ReconsiderationReason(str, Enum):
    GIG_MATERIALLY_CHANGED = "gig_materially_changed"
    FAILED_ENGAGEMENT_REOPENED = "failed_engagement_reopened"
    CLIENT_RECONSIDERATION = "client_reconsideration"
    FREELANCER_INVITED_BACK = "freelancer_invited_back"
    OTHER = "other"


@dataclass(frozen=True)
class ReconsiderationDetail:
    reason: ReconsiderationReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, ReconsiderationReason, "reconsideration reason")
        _validate_other(self.reason, self.explanation, "reconsideration reason")


class SelectionResendReason(str, Enum):
    PREVIOUS_REQUEST_EXPIRED = "previous_request_expired"
    FREELANCER_REMAINED_INTERESTED = "freelancer_remained_interested"
    TERMS_RECONFIRMED = "terms_reconfirmed"
    OTHER = "other"


@dataclass(frozen=True)
class SelectionResendDetail:
    reason: SelectionResendReason
    explanation: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.reason, SelectionResendReason, "selection resend reason")
        _validate_other(self.reason, self.explanation, "selection resend reason")


def _validate_other(reason: Enum, explanation: str | None, label: str) -> None:
    require_optional_explanation(explanation, f"{label} explanation", required=reason.value == "other")
