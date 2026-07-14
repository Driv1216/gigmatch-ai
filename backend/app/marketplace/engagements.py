"""Pure two-party engagement lifecycle and accepted-proposal snapshot."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from enum import Enum

from app.marketplace.common import (
    Availability,
    Duration,
    ProposalScope,
    require_aware_datetime,
    require_enum_member,
    require_non_empty,
)
from app.marketplace.errors import ContractValidationError, InvalidTransitionError, PolicyViolationError
from app.marketplace.payments import (
    ClientPayment,
    FixedPriceClientPayment,
    FixedPriceProposal,
    FreelancerProposal,
    HourlyClientPayment,
    HourlyProposal,
    OpenClientPayment,
    OpenProposal,
    validate_financial_compatibility,
)
from app.marketplace.reasons import EngagementCancellationDetail


class EngagementStatus(str, Enum):
    CONFIRMED = "confirmed"
    KICKOFF_PENDING = "kickoff_pending"
    IN_PROGRESS = "in_progress"
    COMPLETION_PENDING = "completion_pending"
    COMPLETED = "completed"
    CANCELLATION_PENDING = "cancellation_pending"
    CANCELLED = "cancelled"


TERMINAL_ENGAGEMENT_STATUSES = frozenset((EngagementStatus.COMPLETED, EngagementStatus.CANCELLED))
ACTIVE_ENGAGEMENT_STATUSES = frozenset(
    (
        EngagementStatus.CONFIRMED,
        EngagementStatus.KICKOFF_PENDING,
        EngagementStatus.IN_PROGRESS,
        EngagementStatus.COMPLETION_PENDING,
    )
)


@dataclass(frozen=True)
class AcceptedProposalSnapshot:
    """Controlled immutable duplication of the exact accepted terms."""

    application_version_id: str
    gig_version_id: str
    client_payment: ClientPayment
    proposal: FreelancerProposal
    timeline: Duration
    availability: Availability
    scope: ProposalScope
    captured_at: datetime
    out_of_range_acknowledged: bool = False

    def __post_init__(self) -> None:
        require_non_empty(self.application_version_id, "application_version_id")
        require_non_empty(self.gig_version_id, "gig_version_id")
        require_aware_datetime(self.captured_at, "captured_at")
        if not isinstance(self.proposal, (FixedPriceProposal, HourlyProposal, OpenProposal)):
            raise ContractValidationError("Accepted snapshot requires a structured freelancer proposal.")
        if not isinstance(self.client_payment, (FixedPriceClientPayment, HourlyClientPayment, OpenClientPayment)):
            raise ContractValidationError("Accepted snapshot requires structured client payment terms.")
        if not isinstance(self.timeline, Duration):
            raise ContractValidationError("Accepted snapshot timeline must be a Duration.")
        if not isinstance(self.availability, Availability):
            raise ContractValidationError("Accepted snapshot availability must be an Availability.")
        if not isinstance(self.scope, ProposalScope):
            raise ContractValidationError("Accepted snapshot scope must be a ProposalScope.")
        if not isinstance(self.out_of_range_acknowledged, bool):
            raise ContractValidationError("Commercial acknowledgement flag must be a boolean.")
        if not self.timeline.is_selection_ready:
            raise ContractValidationError("Accepted proposal snapshot requires a concrete timeline.")
        if self.proposal.scope != self.scope:
            raise ContractValidationError("Accepted snapshot scope must match the accepted proposal scope.")
        compatibility = validate_financial_compatibility(self.client_payment, self.proposal)
        if compatibility.requires_client_acknowledgement and not self.out_of_range_acknowledged:
            raise ContractValidationError(
                "Accepted snapshot requires acknowledgement of unresolved or out-of-range commercial terms."
            )


@dataclass(frozen=True)
class EngagementState:
    engagement_id: str
    gig_id: str
    application_id: str
    selection_request_id: str
    client_participant_user_id: str
    freelancer_participant_user_id: str
    accepted_terms: AcceptedProposalSnapshot
    status: EngagementStatus
    confirmed_at: datetime
    work_started_by_user_id: str | None = None
    work_started_at: datetime | None = None
    completion_requested_by_user_id: str | None = None
    completion_requested_at: datetime | None = None
    cancellation_requested_by_user_id: str | None = None
    cancellation_requested_at: datetime | None = None
    cancellation_detail: EngagementCancellationDetail | None = None
    previous_active_status: EngagementStatus | None = None

    def __post_init__(self) -> None:
        for value, label in (
            (self.engagement_id, "engagement_id"),
            (self.gig_id, "gig_id"),
            (self.application_id, "application_id"),
            (self.selection_request_id, "selection_request_id"),
            (self.client_participant_user_id, "client participant user id"),
            (self.freelancer_participant_user_id, "freelancer participant user id"),
        ):
            require_non_empty(value, label)
        require_enum_member(self.status, EngagementStatus, "engagement status")
        if not isinstance(self.accepted_terms, AcceptedProposalSnapshot):
            raise ContractValidationError("Engagement requires an AcceptedProposalSnapshot.")
        if self.previous_active_status is not None:
            require_enum_member(self.previous_active_status, EngagementStatus, "previous active status")
        if self.cancellation_detail is not None and not isinstance(
            self.cancellation_detail, EngagementCancellationDetail
        ):
            raise ContractValidationError("cancellation_detail must be an EngagementCancellationDetail.")
        if self.client_participant_user_id == self.freelancer_participant_user_id:
            raise ContractValidationError("Engagement participants must be distinct users.")
        require_aware_datetime(self.confirmed_at, "confirmed_at")
        _validate_paired_metadata(
            self.work_started_by_user_id,
            self.work_started_at,
            "work-start",
        )
        _validate_paired_metadata(
            self.completion_requested_by_user_id,
            self.completion_requested_at,
            "completion-request",
        )
        _validate_paired_metadata(
            self.cancellation_requested_by_user_id,
            self.cancellation_requested_at,
            "cancellation-request",
        )
        if self.work_started_at is not None and self.work_started_at < self.confirmed_at:
            raise ContractValidationError("Work-start time cannot precede engagement confirmation.")
        if self.completion_requested_at is not None:
            completion_floor = self.work_started_at or self.confirmed_at
            if self.completion_requested_at < completion_floor:
                raise ContractValidationError("Completion request cannot precede work start.")
        if self.cancellation_requested_at is not None:
            cancellation_floor = self.completion_requested_at or self.work_started_at or self.confirmed_at
            if self.cancellation_requested_at < cancellation_floor:
                raise ContractValidationError("Cancellation request cannot precede the latest engagement action.")
        for actor in (
            self.work_started_by_user_id,
            self.completion_requested_by_user_id,
            self.cancellation_requested_by_user_id,
        ):
            if actor is not None and actor not in self.participant_user_ids:
                raise ContractValidationError("Engagement action actor must be a participant.")

        completion_metadata_required = self.status in (
            EngagementStatus.COMPLETION_PENDING,
            EngagementStatus.COMPLETED,
        ) or (
            self.status in (EngagementStatus.CANCELLATION_PENDING, EngagementStatus.CANCELLED)
            and self.previous_active_status is EngagementStatus.COMPLETION_PENDING
        )
        if completion_metadata_required != (self.completion_requested_by_user_id is not None):
            raise ContractValidationError("Completion-request metadata does not match engagement status.")

        cancellation_metadata_present = self.cancellation_requested_by_user_id is not None
        if self.status in (EngagementStatus.CANCELLATION_PENDING, EngagementStatus.CANCELLED):
            if not cancellation_metadata_present or self.cancellation_detail is None:
                raise ContractValidationError("Cancellation state requires requester, time, and reason metadata.")
        elif cancellation_metadata_present or self.cancellation_detail is not None or self.previous_active_status is not None:
            raise ContractValidationError("Cancellation metadata belongs only to cancellation states.")
        if self.status is EngagementStatus.CANCELLATION_PENDING:
            if self.previous_active_status not in ACTIVE_ENGAGEMENT_STATUSES:
                raise ContractValidationError("Cancellation pending requires a prior active engagement state.")
        elif self.status is EngagementStatus.CANCELLED and self.previous_active_status not in ACTIVE_ENGAGEMENT_STATUSES:
            raise ContractValidationError("Cancelled engagement must preserve its prior active state.")

    @property
    def participant_user_ids(self) -> frozenset[str]:
        return frozenset((self.client_participant_user_id, self.freelancer_participant_user_id))


def prepare_kickoff(engagement: EngagementState, *, acting_user_id: str) -> EngagementState:
    _require_participant(engagement, acting_user_id)
    _require_status(engagement, EngagementStatus.CONFIRMED, "prepare kickoff")
    return replace(engagement, status=EngagementStatus.KICKOFF_PENDING)


def start_work(
    engagement: EngagementState,
    *,
    acting_user_id: str,
    acted_at: datetime,
) -> EngagementState:
    _require_participant(engagement, acting_user_id)
    if engagement.status not in (EngagementStatus.CONFIRMED, EngagementStatus.KICKOFF_PENDING):
        raise InvalidTransitionError(f"Cannot start work from {engagement.status.value}.")
    _require_action_time(engagement, acted_at)
    return replace(
        engagement,
        status=EngagementStatus.IN_PROGRESS,
        work_started_by_user_id=acting_user_id,
        work_started_at=acted_at,
    )


def request_completion(
    engagement: EngagementState,
    *,
    requesting_user_id: str,
    requested_at: datetime,
) -> EngagementState:
    _require_participant(engagement, requesting_user_id)
    _require_status(engagement, EngagementStatus.IN_PROGRESS, "request completion")
    _require_action_time(engagement, requested_at)
    return replace(
        engagement,
        status=EngagementStatus.COMPLETION_PENDING,
        completion_requested_by_user_id=requesting_user_id,
        completion_requested_at=requested_at,
    )


def resolve_completion(
    engagement: EngagementState,
    *,
    acting_user_id: str,
    confirmed: bool,
) -> EngagementState:
    _require_participant(engagement, acting_user_id)
    _require_status(engagement, EngagementStatus.COMPLETION_PENDING, "resolve completion")
    if acting_user_id == engagement.completion_requested_by_user_id:
        raise PolicyViolationError("Completion requester cannot resolve their own request.")
    if confirmed:
        return replace(engagement, status=EngagementStatus.COMPLETED)
    return replace(
        engagement,
        status=EngagementStatus.IN_PROGRESS,
        completion_requested_by_user_id=None,
        completion_requested_at=None,
    )


def request_engagement_cancellation(
    engagement: EngagementState,
    *,
    requesting_user_id: str,
    requested_at: datetime,
    detail: EngagementCancellationDetail,
) -> EngagementState:
    _require_participant(engagement, requesting_user_id)
    if engagement.status not in ACTIVE_ENGAGEMENT_STATUSES:
        raise InvalidTransitionError(f"Cannot request cancellation from {engagement.status.value}.")
    _require_action_time(engagement, requested_at)
    return replace(
        engagement,
        status=EngagementStatus.CANCELLATION_PENDING,
        cancellation_requested_by_user_id=requesting_user_id,
        cancellation_requested_at=requested_at,
        cancellation_detail=detail,
        previous_active_status=engagement.status,
    )


def acknowledge_engagement_cancellation(
    engagement: EngagementState,
    *,
    acting_user_id: str,
) -> EngagementState:
    _require_participant(engagement, acting_user_id)
    _require_status(engagement, EngagementStatus.CANCELLATION_PENDING, "acknowledge cancellation")
    if acting_user_id == engagement.cancellation_requested_by_user_id:
        raise PolicyViolationError("Cancellation requester cannot acknowledge their own request.")
    return replace(engagement, status=EngagementStatus.CANCELLED)


def withdraw_engagement_cancellation(
    engagement: EngagementState,
    *,
    acting_user_id: str,
) -> EngagementState:
    _require_participant(engagement, acting_user_id)
    _require_status(engagement, EngagementStatus.CANCELLATION_PENDING, "withdraw cancellation")
    if acting_user_id != engagement.cancellation_requested_by_user_id:
        raise PolicyViolationError("Only the cancellation requester may withdraw the request.")
    restored_status = engagement.previous_active_status
    if restored_status is None:
        raise ContractValidationError("Cancellation request does not preserve a prior active state.")
    return replace(
        engagement,
        status=restored_status,
        cancellation_requested_by_user_id=None,
        cancellation_requested_at=None,
        cancellation_detail=None,
        previous_active_status=None,
    )


def _require_participant(engagement: EngagementState, user_id: str) -> None:
    require_non_empty(user_id, "acting user id")
    if user_id not in engagement.participant_user_ids:
        raise PolicyViolationError("Acting user is not an engagement participant.")


def _require_status(engagement: EngagementState, expected: EngagementStatus, action: str) -> None:
    if engagement.status is not expected:
        raise InvalidTransitionError(f"Cannot {action} from {engagement.status.value}.")


def _require_action_time(engagement: EngagementState, acted_at: datetime) -> None:
    require_aware_datetime(acted_at, "engagement action time")
    latest_action_time = (
        engagement.cancellation_requested_at
        or engagement.completion_requested_at
        or engagement.work_started_at
        or engagement.confirmed_at
    )
    if acted_at < latest_action_time:
        raise ContractValidationError("Engagement action time cannot move backwards.")


def _validate_paired_metadata(user_id: str | None, timestamp: datetime | None, label: str) -> None:
    if (user_id is None) != (timestamp is None):
        raise ContractValidationError(f"{label} user and timestamp must be set together.")
    if user_id is not None:
        require_non_empty(user_id, f"{label} user id")
        require_aware_datetime(timestamp, f"{label} timestamp")  # type: ignore[arg-type]
