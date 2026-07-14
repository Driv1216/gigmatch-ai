"""Selection-request lifecycle, guards, and final-readiness validation."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import Enum

from app.marketplace.applications import ApplicationStage, ApplicationState, ApplicationVersion
from app.marketplace.common import require_aware_datetime, require_enum_member, require_non_empty
from app.marketplace.errors import (
    ContractValidationError,
    InvalidTransitionError,
    PolicyViolationError,
    ProposalCompatibilityError,
    SelectionReadinessError,
)
from app.marketplace.gigs import GigState
from app.marketplace.payments import (
    ClientPayment,
    FixedPriceProposal,
    FreelancerProposal,
    HourlyProposal,
    OpenProposal,
    validate_financial_compatibility,
)
from app.marketplace.reasons import (
    SelectionCancellationDetail,
    SelectionCancellationReason,
    SelectionResendDetail,
    SelectionResendReason,
)


class SelectionRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    REVISION_REQUESTED = "revision_requested"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    INVALIDATED = "invalidated"


class DeclineDisposition(str, Enum):
    REMAIN_INTERESTED = "remain_interested"
    WITHDRAW_COMPLETELY = "withdraw_completely"


class SelectionInvalidationReason(str, Enum):
    APPLICATION_VERSION_CHANGED = "application_version_changed"
    GIG_VERSION_CHANGED = "gig_version_changed"


TERMINAL_SELECTION_STATUSES = frozenset(status for status in SelectionRequestStatus if status is not SelectionRequestStatus.PENDING)


@dataclass(frozen=True)
class SelectionRequest:
    selection_request_id: str
    gig_id: str
    application_id: str
    application_version_id: str
    gig_version_id: str
    created_by_user_id: str
    created_at: datetime
    expires_at: datetime
    status: SelectionRequestStatus = SelectionRequestStatus.PENDING
    terminal_at: datetime | None = None
    decline_disposition: DeclineDisposition | None = None
    cancellation_detail: SelectionCancellationDetail | None = None
    invalidation_reason: SelectionInvalidationReason | None = None

    def __post_init__(self) -> None:
        for value, label in (
            (self.selection_request_id, "selection_request_id"),
            (self.gig_id, "gig_id"),
            (self.application_id, "application_id"),
            (self.application_version_id, "application_version_id"),
            (self.gig_version_id, "gig_version_id"),
            (self.created_by_user_id, "created_by_user_id"),
        ):
            require_non_empty(value, label)
        require_enum_member(self.status, SelectionRequestStatus, "selection request status")
        if self.decline_disposition is not None:
            require_enum_member(self.decline_disposition, DeclineDisposition, "decline disposition")
        if self.invalidation_reason is not None:
            require_enum_member(self.invalidation_reason, SelectionInvalidationReason, "selection invalidation reason")
        if self.cancellation_detail is not None and not isinstance(
            self.cancellation_detail, SelectionCancellationDetail
        ):
            raise ContractValidationError("cancellation_detail must be a SelectionCancellationDetail.")
        require_aware_datetime(self.created_at, "created_at")
        require_aware_datetime(self.expires_at, "expires_at")
        if self.expires_at <= self.created_at:
            raise ContractValidationError("Selection expiry must be later than creation time.")

        terminal_details = (
            self.decline_disposition,
            self.cancellation_detail,
            self.invalidation_reason,
        )
        if self.status is SelectionRequestStatus.PENDING:
            if self.terminal_at is not None or any(value is not None for value in terminal_details):
                raise ContractValidationError("Pending selection request cannot contain terminal metadata.")
        else:
            if self.terminal_at is None:
                raise ContractValidationError("Terminal selection request requires terminal_at.")
            require_aware_datetime(self.terminal_at, "terminal_at")
            if self.terminal_at < self.created_at:
                raise ContractValidationError("Selection terminal time cannot precede creation time.")
            if self.status is SelectionRequestStatus.DECLINED and self.decline_disposition is None:
                raise ContractValidationError("Declined selection request requires a decline disposition.")
            if self.status is SelectionRequestStatus.CANCELLED and self.cancellation_detail is None:
                raise ContractValidationError("Cancelled selection request requires cancellation detail.")
            if self.status is SelectionRequestStatus.INVALIDATED and self.invalidation_reason is None:
                raise ContractValidationError("Invalidated selection request requires an invalidation reason.")
            if self.status is not SelectionRequestStatus.DECLINED and self.decline_disposition is not None:
                raise ContractValidationError("Decline disposition belongs only to declined requests.")
            if self.status is not SelectionRequestStatus.CANCELLED and self.cancellation_detail is not None:
                raise ContractValidationError("Cancellation detail belongs only to cancelled requests.")
            if self.status is not SelectionRequestStatus.INVALIDATED and self.invalidation_reason is not None:
                raise ContractValidationError("Invalidation reason belongs only to invalidated requests.")

    @property
    def is_active(self) -> bool:
        return self.status is SelectionRequestStatus.PENDING


def transition_selection_request(
    request: SelectionRequest,
    target_status: SelectionRequestStatus,
    *,
    acted_at: datetime,
    decline_disposition: DeclineDisposition | None = None,
    cancellation_detail: SelectionCancellationDetail | None = None,
    invalidation_reason: SelectionInvalidationReason | None = None,
) -> SelectionRequest:
    """Allow only PENDING to one terminal status, with status-specific metadata."""

    require_aware_datetime(acted_at, "acted_at")
    require_enum_member(target_status, SelectionRequestStatus, "selection target status")
    if request.status is not SelectionRequestStatus.PENDING:
        raise InvalidTransitionError("Terminal selection requests cannot transition again.")
    if target_status is SelectionRequestStatus.PENDING:
        raise InvalidTransitionError("Selection request transition target must be terminal.")
    if acted_at < request.created_at:
        raise ContractValidationError("Selection transition time cannot precede creation time.")
    if target_status is SelectionRequestStatus.EXPIRED:
        if acted_at < request.expires_at:
            raise InvalidTransitionError("Selection request cannot expire before its deadline.")
    elif acted_at >= request.expires_at:
        raise InvalidTransitionError("Expired selection request must transition to expired before another response.")

    return replace(
        request,
        status=target_status,
        terminal_at=acted_at,
        decline_disposition=decline_disposition,
        cancellation_detail=cancellation_detail,
        invalidation_reason=invalidation_reason,
    )


def invalidate_for_application_version_change(
    request: SelectionRequest,
    *,
    acted_at: datetime,
) -> SelectionRequest:
    return transition_selection_request(
        request,
        SelectionRequestStatus.INVALIDATED,
        acted_at=acted_at,
        invalidation_reason=SelectionInvalidationReason.APPLICATION_VERSION_CHANGED,
    )


def invalidate_for_gig_version_change(
    request: SelectionRequest,
    *,
    acted_at: datetime,
) -> SelectionRequest:
    return transition_selection_request(
        request,
        SelectionRequestStatus.INVALIDATED,
        acted_at=acted_at,
        invalidation_reason=SelectionInvalidationReason.GIG_VERSION_CHANGED,
    )


class SelectionReadinessIssue(str, Enum):
    APPLICATION_NOT_ADVANCED = "application_not_advanced"
    APPLICATION_NOT_ACTIVE = "application_not_active"
    GIG_NOT_SELECTABLE = "gig_not_selectable"
    CURRENT_VERSION_MISSING = "current_version_missing"
    CURRENT_VERSION_MISMATCH = "current_version_mismatch"
    STALE_GIG_VERSION_RESPONSE = "stale_gig_version_response"
    PROPOSAL_NOT_CONCRETE = "proposal_not_concrete"
    TIMELINE_NOT_CONCRETE = "timeline_not_concrete"
    PROPOSAL_INCOMPATIBLE = "proposal_incompatible"
    ACTIVE_SELECTION_EXISTS = "active_selection_exists"
    OUT_OF_RANGE_ACKNOWLEDGEMENT_REQUIRED = "out_of_range_acknowledgement_required"


@dataclass(frozen=True)
class SelectionReadiness:
    application_version_id: str
    gig_version_id: str
    proposal: FreelancerProposal


def validate_selection_readiness(
    *,
    application: ApplicationState,
    gig_state: GigState,
    current_version: ApplicationVersion | None,
    latest_material_gig_version_id: str,
    client_payment: ClientPayment,
    has_other_active_selection_for_gig: bool,
    out_of_range_acknowledged: bool,
) -> SelectionReadiness:
    """Validate every pure precondition for sending a selection request."""

    require_non_empty(latest_material_gig_version_id, "latest_material_gig_version_id")
    issues: list[str] = []
    if application.stage is not ApplicationStage.ADVANCED:
        issues.append(SelectionReadinessIssue.APPLICATION_NOT_ADVANCED.value)
    if not application.is_active:
        issues.append(SelectionReadinessIssue.APPLICATION_NOT_ACTIVE.value)
    if not gig_state.allows_selection:
        issues.append(SelectionReadinessIssue.GIG_NOT_SELECTABLE.value)
    if has_other_active_selection_for_gig:
        issues.append(SelectionReadinessIssue.ACTIVE_SELECTION_EXISTS.value)
    if current_version is None:
        issues.append(SelectionReadinessIssue.CURRENT_VERSION_MISSING.value)
        raise SelectionReadinessError(tuple(issues))
    if current_version.application_id != application.application_id or current_version.application_version_id != application.current_version_id:
        issues.append(SelectionReadinessIssue.CURRENT_VERSION_MISMATCH.value)
    if current_version.gig_version_id != latest_material_gig_version_id:
        issues.append(SelectionReadinessIssue.STALE_GIG_VERSION_RESPONSE.value)
    if not _proposal_is_selection_ready(current_version.proposal):
        issues.append(SelectionReadinessIssue.PROPOSAL_NOT_CONCRETE.value)
    if not current_version.timeline.is_selection_ready:
        issues.append(SelectionReadinessIssue.TIMELINE_NOT_CONCRETE.value)

    compatibility = None
    try:
        compatibility = validate_financial_compatibility(client_payment, current_version.proposal)
    except (ProposalCompatibilityError, ContractValidationError):
        issues.append(SelectionReadinessIssue.PROPOSAL_INCOMPATIBLE.value)
    if compatibility is not None and compatibility.requires_client_acknowledgement and not out_of_range_acknowledged:
        issues.append(SelectionReadinessIssue.OUT_OF_RANGE_ACKNOWLEDGEMENT_REQUIRED.value)
    if issues:
        raise SelectionReadinessError(tuple(dict.fromkeys(issues)))
    return SelectionReadiness(
        application_version_id=current_version.application_version_id,
        gig_version_id=current_version.gig_version_id,
        proposal=current_version.proposal,
    )


def validate_no_unchanged_duplicate_request(
    *,
    previous_request: SelectionRequest | None,
    application_id: str,
    application_version_id: str,
    gig_version_id: str,
    resend_detail: SelectionResendDetail | None,
) -> None:
    """Forbid unchanged repeat requests unless a structured resend reason exists."""

    require_non_empty(application_id, "application_id")
    require_non_empty(application_version_id, "application_version_id")
    require_non_empty(gig_version_id, "gig_version_id")
    if resend_detail is not None and not isinstance(resend_detail, SelectionResendDetail):
        raise ContractValidationError("resend_detail must be a SelectionResendDetail.")
    if previous_request is None:
        return
    if previous_request.status is SelectionRequestStatus.PENDING:
        raise PolicyViolationError("A second selection request is forbidden while the previous request is pending.")
    unchanged = (
        previous_request.application_id == application_id
        and previous_request.application_version_id == application_version_id
        and previous_request.gig_version_id == gig_version_id
    )
    if not unchanged:
        return
    if resend_detail is None:
        raise PolicyViolationError("An unchanged selection request requires a valid structured resend reason.")

    if previous_request.status is SelectionRequestStatus.EXPIRED:
        if resend_detail.reason is not SelectionResendReason.PREVIOUS_REQUEST_EXPIRED:
            raise PolicyViolationError("Expired requests may be resent only with the expired-request reason.")
        return
    if previous_request.status is SelectionRequestStatus.DECLINED:
        if previous_request.decline_disposition is not DeclineDisposition.REMAIN_INTERESTED:
            raise PolicyViolationError("A request declined with full withdrawal cannot be resent unchanged.")
        if resend_detail.reason is not SelectionResendReason.FREELANCER_REMAINED_INTERESTED:
            raise PolicyViolationError("Interested decline resends require the remained-interested reason.")
        return
    if previous_request.status is SelectionRequestStatus.CANCELLED:
        if (
            previous_request.cancellation_detail is None
            or previous_request.cancellation_detail.reason is SelectionCancellationReason.GIG_CANCELLED
        ):
            raise PolicyViolationError("A request cancelled with its gig cannot be resent.")
        if resend_detail.reason is not SelectionResendReason.TERMS_RECONFIRMED:
            raise PolicyViolationError("Cancelled unchanged requests require reconfirmed terms before resend.")
        return
    raise PolicyViolationError(
        f"A {previous_request.status.value} selection request cannot be resent with unchanged versions."
    )


def _proposal_is_selection_ready(proposal: FreelancerProposal) -> bool:
    if isinstance(proposal, (FixedPriceProposal, HourlyProposal, OpenProposal)):
        return proposal.is_selection_ready
    return False
