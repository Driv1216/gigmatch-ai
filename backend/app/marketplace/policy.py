"""Validated marketplace product-policy values without environment loading."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.marketplace.common import require_aware_datetime
from app.marketplace.errors import ContractValidationError, PolicyViolationError


@dataclass(frozen=True)
class MarketplacePolicy:
    current_shortlist_limit: int = 5
    standard_expanded_shortlist_option: int = 10
    maximum_active_advanced_applicants: int = 5
    pre_advancement_clarification_limit: int = 2
    allowed_selection_deadline_hours: tuple[int, ...] = (24, 48, 72)
    default_selection_deadline_hours: int = 48

    def __post_init__(self) -> None:
        for label, value in (
            ("current_shortlist_limit", self.current_shortlist_limit),
            ("standard_expanded_shortlist_option", self.standard_expanded_shortlist_option),
            ("maximum_active_advanced_applicants", self.maximum_active_advanced_applicants),
        ):
            _require_positive_int(value, label)
        if (
            not isinstance(self.pre_advancement_clarification_limit, int)
            or isinstance(self.pre_advancement_clarification_limit, bool)
            or self.pre_advancement_clarification_limit < 0
        ):
            raise ContractValidationError("pre_advancement_clarification_limit must be non-negative.")
        if self.standard_expanded_shortlist_option < self.current_shortlist_limit:
            raise ContractValidationError("Expanded shortlist option cannot be below the current limit.")
        if not isinstance(self.allowed_selection_deadline_hours, tuple) or not self.allowed_selection_deadline_hours:
            raise ContractValidationError("At least one selection deadline option is required.")
        for value in self.allowed_selection_deadline_hours:
            _require_positive_int(value, "allowed selection deadline")
        if len(set(self.allowed_selection_deadline_hours)) != len(self.allowed_selection_deadline_hours):
            raise ContractValidationError("Selection deadline options must be unique.")
        if self.default_selection_deadline_hours not in self.allowed_selection_deadline_hours:
            raise ContractValidationError("Default selection deadline must be one of the allowed options.")

    def effective_shortlist_limit(self, workspace_policy_limit: int | None = None) -> int:
        """Allow future workspace policies above ten without schema/state changes."""

        if workspace_policy_limit is None:
            return self.current_shortlist_limit
        _require_positive_int(workspace_policy_limit, "workspace shortlist limit")
        return workspace_policy_limit

    def selection_deadline(self, created_at: datetime, hours: int | None = None) -> datetime:
        require_aware_datetime(created_at, "selection creation time")
        selected_hours = self.default_selection_deadline_hours if hours is None else hours
        if selected_hours not in self.allowed_selection_deadline_hours:
            raise PolicyViolationError("Selection deadline is not an allowed product-policy option.")
        return created_at + timedelta(hours=selected_hours)


def _require_positive_int(value: int, label: str) -> None:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ContractValidationError(f"{label} must be a positive integer.")
