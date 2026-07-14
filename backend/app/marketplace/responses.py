"""Minimal privacy-safe marketplace response primitives."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum

from app.marketplace.applications import ApplicationStage
from app.marketplace.common import (
    require_aware_datetime,
    require_enum_member,
    require_non_empty,
    require_positive_decimal,
)
from app.marketplace.engagements import EngagementStatus
from app.marketplace.errors import ContractValidationError
from app.marketplace.payments import Currency, PaymentStructure
from app.marketplace.ranking import RankingMetadata
from app.marketplace.selections import SelectionRequestStatus


class EngagementParticipantRole(str, Enum):
    CLIENT = "client"
    FREELANCER = "freelancer"


@dataclass(frozen=True)
class SafeClientSummary:
    client_id: str
    display_name: str
    company_name: str | None = None

    def __post_init__(self) -> None:
        require_non_empty(self.client_id, "client_id")
        require_non_empty(self.display_name, "display_name")
        if self.company_name is not None:
            require_non_empty(self.company_name, "company_name")


@dataclass(frozen=True)
class SafeFreelancerSummary:
    freelancer_id: str
    display_name: str
    headline: str | None = None
    experience_level: str | None = None
    safe_location: str | None = None
    top_skills: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        require_non_empty(self.freelancer_id, "freelancer_id")
        require_non_empty(self.display_name, "display_name")
        if not isinstance(self.top_skills, tuple):
            raise ContractValidationError("top_skills must be a tuple.")
        for skill in self.top_skills:
            require_non_empty(skill, "top skill")


@dataclass(frozen=True)
class CommercialProposalView:
    payment_structure: PaymentStructure
    currency: Currency
    primary_amount: Decimal | None
    secondary_amount: Decimal | None = None
    warning_code: str | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.payment_structure, PaymentStructure, "payment structure")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("currency must be a Currency.")
        if self.primary_amount is not None:
            require_positive_decimal(self.primary_amount, "commercial primary amount")
        if self.secondary_amount is not None:
            require_positive_decimal(self.secondary_amount, "commercial secondary amount")
            if self.primary_amount is None:
                raise ContractValidationError("Commercial secondary amount requires a primary amount.")
            if self.secondary_amount < self.primary_amount:
                raise ContractValidationError("Commercial secondary amount cannot be below primary amount.")
        if self.warning_code is not None:
            require_non_empty(self.warning_code, "commercial warning code")


@dataclass(frozen=True)
class ApplicationStageView:
    application_id: str
    stage: ApplicationStage
    response_to_updated_gig_required: bool
    selection_pending: bool

    def __post_init__(self) -> None:
        require_non_empty(self.application_id, "application_id")
        require_enum_member(self.stage, ApplicationStage, "application stage")
        if not isinstance(self.response_to_updated_gig_required, bool) or not isinstance(self.selection_pending, bool):
            raise ContractValidationError("Derived application-state flags must be booleans.")
        if self.selection_pending and self.stage is not ApplicationStage.ADVANCED:
            raise ContractValidationError("Selection pending is valid only for an advanced application.")
        if self.response_to_updated_gig_required and self.stage not in (
            ApplicationStage.UNDER_REVIEW,
            ApplicationStage.ADVANCED,
        ):
            raise ContractValidationError("Updated-gig response can be required only for an active application.")


@dataclass(frozen=True)
class RankedApplicantSummary:
    freelancer: SafeFreelancerSummary
    ranking: RankingMetadata
    commercial: CommercialProposalView
    application: ApplicationStageView

    def __post_init__(self) -> None:
        if not isinstance(self.freelancer, SafeFreelancerSummary):
            raise ContractValidationError("freelancer must be a SafeFreelancerSummary.")
        if not isinstance(self.ranking, RankingMetadata):
            raise ContractValidationError("ranking must be RankingMetadata.")
        if not isinstance(self.commercial, CommercialProposalView):
            raise ContractValidationError("commercial must be a CommercialProposalView.")
        if not isinstance(self.application, ApplicationStageView):
            raise ContractValidationError("application must be an ApplicationStageView.")


@dataclass(frozen=True)
class SelectionRequestSummary:
    selection_request_id: str
    application_version_id: str
    gig_version_id: str
    status: SelectionRequestStatus
    expires_at: datetime

    def __post_init__(self) -> None:
        require_non_empty(self.selection_request_id, "selection_request_id")
        require_non_empty(self.application_version_id, "application_version_id")
        require_non_empty(self.gig_version_id, "gig_version_id")
        require_enum_member(self.status, SelectionRequestStatus, "selection request status")
        require_aware_datetime(self.expires_at, "expires_at")


@dataclass(frozen=True)
class EngagementParticipantSummary:
    user_id: str
    display_name: str
    role: EngagementParticipantRole

    def __post_init__(self) -> None:
        require_non_empty(self.user_id, "user_id")
        require_non_empty(self.display_name, "display_name")
        require_enum_member(self.role, EngagementParticipantRole, "engagement participant role")


@dataclass(frozen=True)
class EngagementSummary:
    engagement_id: str
    gig_id: str
    status: EngagementStatus
    client: EngagementParticipantSummary
    freelancer: EngagementParticipantSummary
    confirmed_at: datetime

    def __post_init__(self) -> None:
        require_non_empty(self.engagement_id, "engagement_id")
        require_non_empty(self.gig_id, "gig_id")
        require_enum_member(self.status, EngagementStatus, "engagement status")
        if not isinstance(self.client, EngagementParticipantSummary) or self.client.role is not EngagementParticipantRole.CLIENT:
            raise ContractValidationError("client must be a client EngagementParticipantSummary.")
        if not isinstance(self.freelancer, EngagementParticipantSummary) or self.freelancer.role is not EngagementParticipantRole.FREELANCER:
            raise ContractValidationError("freelancer must be a freelancer EngagementParticipantSummary.")
        if self.client.user_id == self.freelancer.user_id:
            raise ContractValidationError("Engagement participant summaries must represent distinct users.")
        require_aware_datetime(self.confirmed_at, "confirmed_at")
