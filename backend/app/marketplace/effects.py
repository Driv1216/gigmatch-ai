"""Narrow cross-aggregate outcomes for later transactional milestones."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.marketplace.applications import ApplicationStage
from app.marketplace.common import require_non_empty
from app.marketplace.errors import ContractValidationError
from app.marketplace.engagements import EngagementStatus
from app.marketplace.gigs import ApplicationIntake, GigState, OpportunityLifecycle, OperationalState
from app.marketplace.reasons import NotSelectedOrigin, NotSelectedReason
from app.marketplace.selections import SelectionInvalidationReason, SelectionRequestStatus


@dataclass(frozen=True)
class SelectionAcceptanceEffects:
    selected_application_id: str
    other_active_application_ids: tuple[str, ...]
    selection_request_status: SelectionRequestStatus = field(default=SelectionRequestStatus.ACCEPTED, init=False)
    selected_application_stage: ApplicationStage = field(default=ApplicationStage.CONFIRMED, init=False)
    gig_lifecycle: OpportunityLifecycle = field(default=OpportunityLifecycle.FILLED, init=False)
    engagement_status: EngagementStatus = field(default=EngagementStatus.CONFIRMED, init=False)
    other_active_application_stage: ApplicationStage = field(default=ApplicationStage.NOT_SELECTED, init=False)
    other_application_not_selected_origin: NotSelectedOrigin = field(
        default=NotSelectedOrigin.SELECTION_CONFIRMED,
        init=False,
    )
    other_application_not_selected_reason: NotSelectedReason = field(
        default=NotSelectedReason.ANOTHER_APPLICANT_SELECTED,
        init=False,
    )
    engagement_creation_required: bool = field(default=True, init=False)

    def __post_init__(self) -> None:
        require_non_empty(self.selected_application_id, "selected_application_id")
        _validate_ids(self.other_active_application_ids, "other_active_application_ids")
        if self.selected_application_id in self.other_active_application_ids:
            raise ContractValidationError("Selected application cannot also be an other active application.")


@dataclass(frozen=True)
class GigCancellationEffects:
    active_application_ids: tuple[str, ...]
    active_selection_request_id: str | None
    gig_lifecycle: OpportunityLifecycle = field(default=OpportunityLifecycle.CANCELLED, init=False)
    active_application_stage: ApplicationStage = field(default=ApplicationStage.CLOSED_GIG_CANCELLED, init=False)
    active_selection_status: SelectionRequestStatus = field(default=SelectionRequestStatus.CANCELLED, init=False)
    preserve_history: bool = field(default=True, init=False)

    def __post_init__(self) -> None:
        _validate_ids(self.active_application_ids, "active_application_ids")
        if self.active_selection_request_id is not None:
            require_non_empty(self.active_selection_request_id, "active_selection_request_id")


@dataclass(frozen=True)
class ApplicationVersionChangeEffects:
    new_application_version_id: str
    previous_application_version_id: str
    pending_selection_request_id: str | None
    current_version_id_moves_to_new_version: bool = field(default=True, init=False)
    pending_selection_status: SelectionRequestStatus = field(default=SelectionRequestStatus.INVALIDATED, init=False)
    invalidation_reason: SelectionInvalidationReason = field(
        default=SelectionInvalidationReason.APPLICATION_VERSION_CHANGED,
        init=False,
    )
    fresh_client_review_required: bool = field(default=True, init=False)

    def __post_init__(self) -> None:
        require_non_empty(self.new_application_version_id, "new_application_version_id")
        require_non_empty(self.previous_application_version_id, "previous_application_version_id")
        if self.new_application_version_id == self.previous_application_version_id:
            raise ContractValidationError("New and previous application version ids must differ.")
        if self.pending_selection_request_id is not None:
            require_non_empty(self.pending_selection_request_id, "pending_selection_request_id")


@dataclass(frozen=True)
class MaterialGigVersionEffects:
    new_gig_version_id: str
    affected_application_ids: tuple[str, ...]
    pending_selection_request_ids: tuple[str, ...]
    response_required_is_derived_from_version_linkage: bool = field(default=True, init=False)
    pending_selection_status: SelectionRequestStatus = field(default=SelectionRequestStatus.INVALIDATED, init=False)
    invalidation_reason: SelectionInvalidationReason = field(
        default=SelectionInvalidationReason.GIG_VERSION_CHANGED,
        init=False,
    )

    def __post_init__(self) -> None:
        require_non_empty(self.new_gig_version_id, "new_gig_version_id")
        _validate_ids(self.affected_application_ids, "affected_application_ids")
        _validate_ids(self.pending_selection_request_ids, "pending_selection_request_ids")


@dataclass(frozen=True)
class FailedEngagementReopeningEffects:
    previous_application_ids: tuple[str, ...]
    reopened_gig_state: GigState = field(
        default_factory=lambda: GigState(
            OpportunityLifecycle.ACTIVE,
            ApplicationIntake.CLOSED,
            OperationalState.ACTIVE,
        ),
        init=False,
    )
    engagement_status: EngagementStatus = field(default=EngagementStatus.CANCELLED, init=False)
    previous_applications_reactivated: bool = field(default=False, init=False)
    controlled_reconsideration_allowed: bool = field(default=True, init=False)

    def __post_init__(self) -> None:
        _validate_ids(self.previous_application_ids, "previous_application_ids")


def _validate_ids(values: tuple[str, ...], label: str) -> None:
    if not isinstance(values, tuple):
        raise ContractValidationError(f"{label} must be a tuple.")
    for value in values:
        require_non_empty(value, label)
    if len(set(values)) != len(values):
        raise ContractValidationError(f"{label} must not contain duplicate ids.")
