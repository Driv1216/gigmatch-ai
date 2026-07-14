"""Application lifecycle, shortlist eligibility, and immutable version contracts."""

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
from app.marketplace.payments import FixedPriceProposal, FreelancerProposal, HourlyProposal, OpenProposal


class ApplicationStage(str, Enum):
    UNDER_REVIEW = "under_review"
    ADVANCED = "advanced"
    CONFIRMED = "confirmed"
    NOT_SELECTED = "not_selected"
    WITHDRAWN = "withdrawn"
    CLOSED_GIG_CANCELLED = "closed_gig_cancelled"


class ApplicationAction(str, Enum):
    ADVANCE = "advance"
    RETURN_TO_REVIEW = "return_to_review"
    MARK_NOT_SELECTED = "mark_not_selected"
    WITHDRAW = "withdraw"
    ACCEPT_SELECTION = "accept_selection"
    CLOSE_GIG_CANCELLED = "close_gig_cancelled"
    CONTROLLED_REOPEN = "controlled_reopen"
    ACCEPT_RECONSIDERATION = "accept_reconsideration"


ACTIVE_APPLICATION_STAGES = frozenset((ApplicationStage.UNDER_REVIEW, ApplicationStage.ADVANCED))
TERMINAL_APPLICATION_STAGES = frozenset(
    (ApplicationStage.CONFIRMED, ApplicationStage.CLOSED_GIG_CANCELLED)
)


@dataclass(frozen=True)
class ApplicationState:
    application_id: str
    gig_id: str
    freelancer_id: str
    stage: ApplicationStage
    current_version_id: str
    submitted_at: datetime
    last_updated_at: datetime

    def __post_init__(self) -> None:
        for value, label in (
            (self.application_id, "application_id"),
            (self.gig_id, "gig_id"),
            (self.freelancer_id, "freelancer_id"),
            (self.current_version_id, "current_version_id"),
        ):
            require_non_empty(value, label)
        require_enum_member(self.stage, ApplicationStage, "application stage")
        require_aware_datetime(self.submitted_at, "submitted_at")
        require_aware_datetime(self.last_updated_at, "last_updated_at")
        if self.last_updated_at < self.submitted_at:
            raise ContractValidationError("last_updated_at cannot precede submitted_at.")

    @property
    def is_active(self) -> bool:
        return self.stage in ACTIVE_APPLICATION_STAGES


_VALID_APPLICATION_TRANSITIONS: dict[tuple[ApplicationStage, ApplicationAction], ApplicationStage] = {
    (ApplicationStage.UNDER_REVIEW, ApplicationAction.ADVANCE): ApplicationStage.ADVANCED,
    (ApplicationStage.UNDER_REVIEW, ApplicationAction.MARK_NOT_SELECTED): ApplicationStage.NOT_SELECTED,
    (ApplicationStage.UNDER_REVIEW, ApplicationAction.WITHDRAW): ApplicationStage.WITHDRAWN,
    (ApplicationStage.UNDER_REVIEW, ApplicationAction.CLOSE_GIG_CANCELLED): ApplicationStage.CLOSED_GIG_CANCELLED,
    (ApplicationStage.ADVANCED, ApplicationAction.RETURN_TO_REVIEW): ApplicationStage.UNDER_REVIEW,
    (ApplicationStage.ADVANCED, ApplicationAction.MARK_NOT_SELECTED): ApplicationStage.NOT_SELECTED,
    (ApplicationStage.ADVANCED, ApplicationAction.WITHDRAW): ApplicationStage.WITHDRAWN,
    (ApplicationStage.ADVANCED, ApplicationAction.ACCEPT_SELECTION): ApplicationStage.CONFIRMED,
    (ApplicationStage.ADVANCED, ApplicationAction.CLOSE_GIG_CANCELLED): ApplicationStage.CLOSED_GIG_CANCELLED,
    (ApplicationStage.NOT_SELECTED, ApplicationAction.CONTROLLED_REOPEN): ApplicationStage.UNDER_REVIEW,
    (ApplicationStage.WITHDRAWN, ApplicationAction.ACCEPT_RECONSIDERATION): ApplicationStage.UNDER_REVIEW,
}


def transition_application(
    application: ApplicationState,
    action: ApplicationAction,
    *,
    acted_at: datetime,
    has_pending_selection_request: bool = False,
) -> ApplicationState:
    """Apply an explicit application transition or fail without changing state."""

    require_aware_datetime(acted_at, "acted_at")
    require_enum_member(action, ApplicationAction, "application action")
    if acted_at < application.last_updated_at:
        raise ContractValidationError("Application transition time cannot move backwards.")
    if has_pending_selection_request and action in (
        ApplicationAction.RETURN_TO_REVIEW,
        ApplicationAction.MARK_NOT_SELECTED,
        ApplicationAction.WITHDRAW,
    ):
        raise PolicyViolationError("Pending selection request must end before this application transition.")
    target = _VALID_APPLICATION_TRANSITIONS.get((application.stage, action))
    if target is None:
        raise InvalidTransitionError(
            f"Cannot {action.value} application from {application.stage.value}."
        )
    return replace(application, stage=target, last_updated_at=acted_at)


@dataclass(frozen=True)
class InternalShortlistEntry:
    """Minimal private client-organisation state, separate from application stage."""

    application_id: str
    is_active: bool

    def __post_init__(self) -> None:
        require_non_empty(self.application_id, "application_id")


def is_shortlist_eligible(stage: ApplicationStage) -> bool:
    return stage in ACTIVE_APPLICATION_STAGES


def reconcile_shortlist_entry(
    entry: InternalShortlistEntry,
    application_stage: ApplicationStage,
) -> InternalShortlistEntry:
    if entry.is_active and not is_shortlist_eligible(application_stage):
        return replace(entry, is_active=False)
    return entry


def count_active_eligible_shortlist_entries(
    entries: tuple[InternalShortlistEntry, ...],
    stages_by_application_id: dict[str, ApplicationStage],
) -> int:
    if not isinstance(entries, tuple):
        raise ContractValidationError("Internal shortlist entries must be a tuple.")
    application_ids = tuple(entry.application_id for entry in entries)
    if len(set(application_ids)) != len(application_ids):
        raise ContractValidationError("Internal shortlist cannot contain duplicate application ids.")
    return sum(
        1
        for entry in entries
        if entry.is_active and is_shortlist_eligible(stages_by_application_id.get(entry.application_id, ApplicationStage.NOT_SELECTED))
    )


def validate_shortlist_capacity(
    entries: tuple[InternalShortlistEntry, ...],
    stages_by_application_id: dict[str, ApplicationStage],
    *,
    effective_limit: int,
) -> int:
    if not isinstance(effective_limit, int) or isinstance(effective_limit, bool) or effective_limit <= 0:
        raise ContractValidationError("Effective shortlist limit must be a positive integer.")
    active_count = count_active_eligible_shortlist_entries(entries, stages_by_application_id)
    if active_count > effective_limit:
        raise PolicyViolationError("Active eligible internal shortlist entries exceed the effective limit.")
    return active_count


class ApplicationVersionOrigin(str, Enum):
    INITIAL_SUBMISSION = "initial_submission"
    FREELANCER_EDIT = "freelancer_edit"
    GIG_CHANGE_TERMS_REAFFIRMED = "gig_change_terms_reaffirmed"
    GIG_CHANGE_PROPOSAL_UPDATED = "gig_change_proposal_updated"
    RECONSIDERATION = "reconsideration"


@dataclass(frozen=True)
class ApplicationVersion:
    """Immutable proposal version; currentness and binding live on parent records."""

    application_version_id: str
    application_id: str
    version_number: int
    gig_version_id: str
    origin: ApplicationVersionOrigin
    cover_note: str
    proposal: FreelancerProposal
    timeline: Duration
    availability: Availability
    scope: ProposalScope
    scope_notes: str | None
    created_at: datetime
    created_by_user_id: str

    def __post_init__(self) -> None:
        for value, label in (
            (self.application_version_id, "application_version_id"),
            (self.application_id, "application_id"),
            (self.gig_version_id, "gig_version_id"),
            (self.cover_note, "cover_note"),
            (self.created_by_user_id, "created_by_user_id"),
        ):
            require_non_empty(value, label)
        if not isinstance(self.version_number, int) or isinstance(self.version_number, bool) or self.version_number <= 0:
            raise ContractValidationError("Application version number must be a positive integer.")
        require_enum_member(self.origin, ApplicationVersionOrigin, "application version origin")
        if not isinstance(self.proposal, (FixedPriceProposal, HourlyProposal, OpenProposal)):
            raise ContractValidationError("Application version requires a structured freelancer proposal.")
        if not isinstance(self.timeline, Duration):
            raise ContractValidationError("Application version timeline must be a Duration.")
        if not isinstance(self.availability, Availability):
            raise ContractValidationError("Application version availability must be an Availability.")
        if not isinstance(self.scope, ProposalScope):
            raise ContractValidationError("Application version scope must be a ProposalScope.")
        if self.scope_notes is not None:
            require_non_empty(self.scope_notes, "scope_notes")
        require_aware_datetime(self.created_at, "created_at")
        if self.proposal.scope != self.scope:
            raise ContractValidationError("Application-version scope must match the structured proposal scope.")


def response_to_material_gig_version_required(
    current_version: ApplicationVersion,
    latest_material_gig_version_id: str,
) -> bool:
    require_non_empty(latest_material_gig_version_id, "latest_material_gig_version_id")
    return current_version.gig_version_id != latest_material_gig_version_id


def reaffirm_existing_proposal_for_gig_version(
    current_version: ApplicationVersion,
    *,
    new_application_version_id: str,
    new_version_number: int,
    new_gig_version_id: str,
    created_at: datetime,
    created_by_user_id: str,
) -> ApplicationVersion:
    """Copy unchanged terms into a new version bound to the new gig version."""

    _validate_next_version_identity(
        current_version,
        new_application_version_id,
        new_version_number,
        new_gig_version_id,
        created_at,
    )
    return ApplicationVersion(
        application_version_id=new_application_version_id,
        application_id=current_version.application_id,
        version_number=new_version_number,
        gig_version_id=new_gig_version_id,
        origin=ApplicationVersionOrigin.GIG_CHANGE_TERMS_REAFFIRMED,
        cover_note=current_version.cover_note,
        proposal=current_version.proposal,
        timeline=current_version.timeline,
        availability=current_version.availability,
        scope=current_version.scope,
        scope_notes=current_version.scope_notes,
        created_at=created_at,
        created_by_user_id=created_by_user_id,
    )


def update_proposal_for_gig_version(
    current_version: ApplicationVersion,
    *,
    new_application_version_id: str,
    new_version_number: int,
    new_gig_version_id: str,
    proposal: FreelancerProposal,
    timeline: Duration,
    availability: Availability,
    scope: ProposalScope,
    scope_notes: str | None,
    cover_note: str,
    created_at: datetime,
    created_by_user_id: str,
) -> ApplicationVersion:
    """Create updated immutable terms responding to a new material gig version."""

    _validate_next_version_identity(
        current_version,
        new_application_version_id,
        new_version_number,
        new_gig_version_id,
        created_at,
    )
    return ApplicationVersion(
        application_version_id=new_application_version_id,
        application_id=current_version.application_id,
        version_number=new_version_number,
        gig_version_id=new_gig_version_id,
        origin=ApplicationVersionOrigin.GIG_CHANGE_PROPOSAL_UPDATED,
        cover_note=cover_note,
        proposal=proposal,
        timeline=timeline,
        availability=availability,
        scope=scope,
        scope_notes=scope_notes,
        created_at=created_at,
        created_by_user_id=created_by_user_id,
    )


def _validate_next_version_identity(
    current_version: ApplicationVersion,
    new_application_version_id: str,
    new_version_number: int,
    new_gig_version_id: str,
    created_at: datetime,
) -> None:
    require_non_empty(new_application_version_id, "new_application_version_id")
    require_non_empty(new_gig_version_id, "new_gig_version_id")
    if new_application_version_id == current_version.application_version_id:
        raise ContractValidationError("A new application version requires a new id.")
    if new_version_number != current_version.version_number + 1:
        raise ContractValidationError("A new application version number must increment by one.")
    if new_gig_version_id == current_version.gig_version_id:
        raise ContractValidationError("Material gig response must reference the new gig version.")
    require_aware_datetime(created_at, "new application version created_at")
    if created_at < current_version.created_at:
        raise ContractValidationError("New application version cannot predate the current version.")
