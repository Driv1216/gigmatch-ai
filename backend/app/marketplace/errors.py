"""Explicit errors raised by the pure marketplace domain layer."""

from __future__ import annotations


class MarketplaceDomainError(Exception):
    """Base error for marketplace domain failures."""


class ContractValidationError(MarketplaceDomainError, ValueError):
    """Raised when a domain contract contains an invalid value."""


class InvalidTransitionError(MarketplaceDomainError):
    """Raised when a state-machine action is invalid from the current state."""


class ProposalCompatibilityError(MarketplaceDomainError):
    """Raised when a proposal is structurally incompatible with posted terms."""


class SelectionReadinessError(MarketplaceDomainError):
    """Raised when a proposal cannot be bound to a final selection request."""

    def __init__(self, issues: tuple[str, ...]) -> None:
        self.issues = issues
        super().__init__("Selection is not ready: " + ", ".join(issues))


class PolicyViolationError(MarketplaceDomainError):
    """Raised when a configurable or fixed marketplace policy is violated."""
