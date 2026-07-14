"""Orthogonal gig lifecycle, intake, and operational state machine."""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import Enum

from app.marketplace.common import require_enum_member
from app.marketplace.errors import ContractValidationError, InvalidTransitionError, PolicyViolationError


class OpportunityLifecycle(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    FILLED = "filled"
    CANCELLED = "cancelled"


class ApplicationIntake(str, Enum):
    ACCEPTING = "accepting"
    CLOSED = "closed"


class OperationalState(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"


class GigProductState(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAUSED = "paused"
    CLOSED_TO_NEW_APPLICATIONS = "closed_to_new_applications"
    FILLED = "filled"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class GigState:
    """Pure gig state with no destructive status-before-pause field."""

    lifecycle: OpportunityLifecycle
    intake: ApplicationIntake = ApplicationIntake.CLOSED
    operations: OperationalState = OperationalState.ACTIVE

    def __post_init__(self) -> None:
        require_enum_member(self.lifecycle, OpportunityLifecycle, "opportunity lifecycle")
        require_enum_member(self.intake, ApplicationIntake, "application intake")
        require_enum_member(self.operations, OperationalState, "operational state")
        if self.lifecycle is OpportunityLifecycle.DRAFT:
            if self.intake is not ApplicationIntake.CLOSED or self.operations is not OperationalState.ACTIVE:
                raise ContractValidationError("Draft gigs must have closed intake and active operations.")
        elif self.lifecycle in (OpportunityLifecycle.FILLED, OpportunityLifecycle.CANCELLED):
            if self.intake is not ApplicationIntake.CLOSED or self.operations is not OperationalState.ACTIVE:
                raise ContractValidationError("Filled and cancelled gigs must have closed intake and active operations.")

    @property
    def product_state(self) -> GigProductState:
        if self.lifecycle is OpportunityLifecycle.DRAFT:
            return GigProductState.DRAFT
        if self.lifecycle is OpportunityLifecycle.FILLED:
            return GigProductState.FILLED
        if self.lifecycle is OpportunityLifecycle.CANCELLED:
            return GigProductState.CANCELLED
        if self.operations is OperationalState.PAUSED:
            return GigProductState.PAUSED
        if self.intake is ApplicationIntake.CLOSED:
            return GigProductState.CLOSED_TO_NEW_APPLICATIONS
        return GigProductState.OPEN

    @property
    def accepts_applications(self) -> bool:
        return (
            self.lifecycle is OpportunityLifecycle.ACTIVE
            and self.intake is ApplicationIntake.ACCEPTING
            and self.operations is OperationalState.ACTIVE
        )

    @property
    def allows_review(self) -> bool:
        return self.lifecycle is OpportunityLifecycle.ACTIVE

    @property
    def allows_selection(self) -> bool:
        return (
            self.lifecycle is OpportunityLifecycle.ACTIVE
            and self.operations is OperationalState.ACTIVE
        )


def draft_gig_state() -> GigState:
    return GigState(OpportunityLifecycle.DRAFT)


def publish_gig(state: GigState) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.DRAFT, "publish")
    return GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.ACCEPTING, OperationalState.ACTIVE)


def pause_gig(state: GigState, *, has_pending_selection_request: bool = False) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.ACTIVE, "pause")
    if state.operations is OperationalState.PAUSED:
        raise InvalidTransitionError("Gig is already paused.")
    if has_pending_selection_request:
        raise PolicyViolationError("Pending selection request must end before the gig can be paused.")
    return replace(state, operations=OperationalState.PAUSED)


def resume_gig(state: GigState) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.ACTIVE, "resume")
    if state.operations is not OperationalState.PAUSED:
        raise InvalidTransitionError("Only a paused gig can be resumed.")
    return replace(state, operations=OperationalState.ACTIVE)


def close_applications(state: GigState) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.ACTIVE, "close applications")
    if state.intake is ApplicationIntake.CLOSED:
        raise InvalidTransitionError("Applications are already closed.")
    return replace(state, intake=ApplicationIntake.CLOSED)


def reopen_applications(state: GigState) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.ACTIVE, "reopen applications")
    if state.intake is ApplicationIntake.ACCEPTING:
        raise InvalidTransitionError("Applications are already accepting.")
    return replace(state, intake=ApplicationIntake.ACCEPTING)


def fill_through_accepted_selection(
    state: GigState,
    *,
    selection_request_is_accepted: bool,
) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.ACTIVE, "fill")
    if not state.allows_selection:
        raise InvalidTransitionError("Paused gigs cannot be filled through selection.")
    if not selection_request_is_accepted:
        raise InvalidTransitionError("Gig can be filled only through an accepted selection request.")
    return GigState(OpportunityLifecycle.FILLED)


def cancel_gig(state: GigState) -> GigState:
    if state.lifecycle not in (OpportunityLifecycle.DRAFT, OpportunityLifecycle.ACTIVE):
        raise InvalidTransitionError(f"Cannot cancel gig from {state.lifecycle.value}.")
    return GigState(OpportunityLifecycle.CANCELLED)


def reopen_after_cancelled_engagement(state: GigState, *, engagement_is_cancelled: bool) -> GigState:
    _require_lifecycle(state, OpportunityLifecycle.FILLED, "reopen after failed engagement")
    if not engagement_is_cancelled:
        raise InvalidTransitionError("Gig can reopen only after its engagement is cancelled.")
    return GigState(OpportunityLifecycle.ACTIVE, ApplicationIntake.CLOSED, OperationalState.ACTIVE)


def _require_lifecycle(state: GigState, expected: OpportunityLifecycle, action: str) -> None:
    if state.lifecycle is not expected:
        raise InvalidTransitionError(f"Cannot {action} gig from {state.lifecycle.value}.")
