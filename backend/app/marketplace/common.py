"""Shared value contracts and validation helpers for the marketplace domain."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TypeVar

from app.marketplace.errors import ContractValidationError


EnumValue = TypeVar("EnumValue", bound=Enum)


def require_non_empty(value: str, label: str) -> str:
    """Validate a non-empty canonical string without surrounding whitespace."""

    if not isinstance(value, str) or not value.strip():
        raise ContractValidationError(f"{label} must be a non-empty string.")
    if value != value.strip():
        raise ContractValidationError(f"{label} must not contain leading or trailing whitespace.")
    return value


def require_optional_explanation(value: str | None, label: str, *, required: bool) -> str | None:
    """Validate an optional explanation, requiring meaningful text when requested."""

    if value is None:
        if required:
            raise ContractValidationError(f"{label} is required.")
        return None
    cleaned = require_non_empty(value, label)
    return cleaned


def require_positive_decimal(value: Decimal, label: str) -> Decimal:
    """Validate a finite, strictly-positive Decimal monetary or quantity value."""

    if not isinstance(value, Decimal) or isinstance(value, bool):
        raise ContractValidationError(f"{label} must use Decimal.")
    if not value.is_finite() or value <= Decimal("0"):
        raise ContractValidationError(f"{label} must be a finite positive value.")
    return value


def require_aware_datetime(value: datetime, label: str) -> datetime:
    """Reject naive timestamps and invalid timezone offsets."""

    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ContractValidationError(f"{label} must be timezone-aware.")
    return value


def require_enum_member(value: EnumValue, enum_type: type[EnumValue], label: str) -> EnumValue:
    """Reject raw strings or members from a different enum at domain boundaries."""

    if not isinstance(value, enum_type):
        raise ContractValidationError(f"{label} must be a {enum_type.__name__} value.")
    return value


class DurationUnit(str, Enum):
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"


class DurationMode(str, Enum):
    EXACT = "exact"
    RANGE = "range"
    REQUIRES_DISCUSSION = "requires_discussion"


@dataclass(frozen=True)
class Duration:
    """Exact, ranged, or unresolved duration with an explicit unit."""

    mode: DurationMode
    unit: DurationUnit | None = None
    exact_value: Decimal | None = None
    minimum_value: Decimal | None = None
    maximum_value: Decimal | None = None

    def __post_init__(self) -> None:
        require_enum_member(self.mode, DurationMode, "duration mode")
        if self.unit is not None:
            require_enum_member(self.unit, DurationUnit, "duration unit")
        if self.mode is DurationMode.EXACT:
            if self.unit is None or self.exact_value is None:
                raise ContractValidationError("Exact duration requires a unit and exact value.")
            require_positive_decimal(self.exact_value, "duration exact value")
            if self.minimum_value is not None or self.maximum_value is not None:
                raise ContractValidationError("Exact duration cannot include range values.")
        elif self.mode is DurationMode.RANGE:
            if self.unit is None or self.minimum_value is None or self.maximum_value is None:
                raise ContractValidationError("Duration range requires a unit, minimum, and maximum.")
            require_positive_decimal(self.minimum_value, "duration minimum")
            require_positive_decimal(self.maximum_value, "duration maximum")
            if self.minimum_value > self.maximum_value:
                raise ContractValidationError("Duration minimum cannot exceed maximum.")
            if self.exact_value is not None:
                raise ContractValidationError("Duration range cannot include an exact value.")
        elif self.mode is DurationMode.REQUIRES_DISCUSSION:
            if any(value is not None for value in (self.unit, self.exact_value, self.minimum_value, self.maximum_value)):
                raise ContractValidationError("Discussion-required duration cannot include concrete values.")

    @property
    def is_selection_ready(self) -> bool:
        return self.mode is not DurationMode.REQUIRES_DISCUSSION


@dataclass(frozen=True)
class DecimalRange:
    """A positive decimal range for rates, hours, and monetary sub-values."""

    minimum: Decimal
    maximum: Decimal

    def __post_init__(self) -> None:
        require_positive_decimal(self.minimum, "range minimum")
        require_positive_decimal(self.maximum, "range maximum")
        if self.minimum > self.maximum:
            raise ContractValidationError("Range minimum cannot exceed maximum.")

    def contains(self, value: Decimal) -> bool:
        return self.minimum <= value <= self.maximum


@dataclass(frozen=True)
class Availability:
    """Structured availability attached to an immutable application version."""

    available_from: date
    weekly_hours: DecimalRange | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.available_from, date):
            raise ContractValidationError("available_from must be a date.")
        if self.weekly_hours is not None and not isinstance(self.weekly_hours, DecimalRange):
            raise ContractValidationError("weekly_hours must be a DecimalRange.")


@dataclass(frozen=True)
class ProposalScope:
    """Structured included/excluded work and estimate assumptions."""

    included_work: tuple[str, ...]
    excluded_work: tuple[str, ...]
    assumptions: tuple[str, ...]
    estimate_change_factors: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        for label, values in (
            ("included_work", self.included_work),
            ("excluded_work", self.excluded_work),
            ("assumptions", self.assumptions),
            ("estimate_change_factors", self.estimate_change_factors),
        ):
            if not isinstance(values, tuple):
                raise ContractValidationError(f"{label} must be a tuple.")
            for value in values:
                require_non_empty(value, label)

    @property
    def has_open_proposal_explanations(self) -> bool:
        return bool(
            self.included_work
            and self.excluded_work
            and self.assumptions
            and self.estimate_change_factors
        )
