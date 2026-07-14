"""Structured client payment and freelancer proposal contracts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from enum import Enum

from app.marketplace.common import (
    DecimalRange,
    Duration,
    ProposalScope,
    require_enum_member,
    require_non_empty,
    require_optional_explanation,
    require_positive_decimal,
)
from app.marketplace.errors import ContractValidationError, ProposalCompatibilityError


@dataclass(frozen=True)
class Currency:
    """An uppercase ISO-style three-letter currency code."""

    code: str

    def __post_init__(self) -> None:
        code = require_non_empty(self.code, "currency code")
        if len(code) != 3 or not code.isascii() or not code.isalpha() or code != code.upper():
            raise ContractValidationError("Currency code must be three uppercase ASCII letters.")


@dataclass(frozen=True)
class MoneyRange:
    currency: Currency
    minimum: Decimal
    maximum: Decimal

    def __post_init__(self) -> None:
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("Money range currency must be a Currency.")
        require_positive_decimal(self.minimum, "money range minimum")
        require_positive_decimal(self.maximum, "money range maximum")
        if self.minimum > self.maximum:
            raise ContractValidationError("Money range minimum cannot exceed maximum.")


class PaymentStructure(str, Enum):
    FIXED_PRICE = "fixed_price"
    HOURLY = "hourly"
    OPEN_TO_PROPOSALS = "open_to_proposals"


class BudgetFlexibility(str, Enum):
    STRICT = "strict"
    SLIGHTLY_FLEXIBLE = "slightly_flexible"
    FLEXIBLE_FOR_RIGHT_APPLICANT = "flexible_for_right_applicant"


class PreferredProposalForm(str, Enum):
    TOTAL_PROJECT_QUOTE = "total_project_quote"
    PHASED_PRICING = "phased_pricing"
    HOURLY_PROPOSAL = "hourly_proposal"
    FREELANCER_RECOMMENDATION = "freelancer_recommendation"


@dataclass(frozen=True)
class FixedPriceClientPayment:
    payment_structure: PaymentStructure
    budget: MoneyRange
    flexibility: BudgetFlexibility

    def __post_init__(self) -> None:
        if not isinstance(self.budget, MoneyRange):
            raise ContractValidationError("Fixed-price budget must be a MoneyRange.")
        require_enum_member(self.flexibility, BudgetFlexibility, "budget flexibility")
        if self.payment_structure is not PaymentStructure.FIXED_PRICE:
            raise ContractValidationError("Fixed-price client terms require the fixed-price discriminator.")


@dataclass(frozen=True)
class HourlyClientPayment:
    payment_structure: PaymentStructure
    hourly_rate: MoneyRange
    weekly_commitment_hours: DecimalRange
    engagement_duration: Duration

    def __post_init__(self) -> None:
        if self.payment_structure is not PaymentStructure.HOURLY:
            raise ContractValidationError("Hourly client terms require the hourly discriminator.")
        if not isinstance(self.hourly_rate, MoneyRange):
            raise ContractValidationError("Hourly-rate guidance must be a MoneyRange.")
        if not isinstance(self.weekly_commitment_hours, DecimalRange):
            raise ContractValidationError("Weekly commitment must be a DecimalRange.")
        if not isinstance(self.engagement_duration, Duration):
            raise ContractValidationError("Engagement duration must be a Duration.")
        if not self.engagement_duration.is_selection_ready:
            raise ContractValidationError("Client hourly engagement duration must be concrete.")


class FinancialGuidanceType(str, Enum):
    INDICATIVE_BUDGET_RANGE = "indicative_budget_range"
    MAXIMUM_BUDGET_CEILING = "maximum_budget_ceiling"
    EXPECTED_MARKET_RANGE = "expected_market_range"
    NO_RELIABLE_ESTIMATE = "no_reliable_estimate"


@dataclass(frozen=True)
class IndicativeBudgetGuidance:
    guidance_type: FinancialGuidanceType
    budget: MoneyRange

    def __post_init__(self) -> None:
        if self.guidance_type is not FinancialGuidanceType.INDICATIVE_BUDGET_RANGE:
            raise ContractValidationError("Indicative guidance requires its matching discriminator.")
        if not isinstance(self.budget, MoneyRange):
            raise ContractValidationError("Indicative budget must be a MoneyRange.")


@dataclass(frozen=True)
class MaximumBudgetCeiling:
    guidance_type: FinancialGuidanceType
    currency: Currency
    maximum: Decimal

    def __post_init__(self) -> None:
        if self.guidance_type is not FinancialGuidanceType.MAXIMUM_BUDGET_CEILING:
            raise ContractValidationError("Maximum ceiling requires its matching discriminator.")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("Maximum ceiling currency must be a Currency.")
        require_positive_decimal(self.maximum, "maximum budget ceiling")


@dataclass(frozen=True)
class ExpectedMarketRangeGuidance:
    guidance_type: FinancialGuidanceType
    market_range: MoneyRange

    def __post_init__(self) -> None:
        if self.guidance_type is not FinancialGuidanceType.EXPECTED_MARKET_RANGE:
            raise ContractValidationError("Market-range guidance requires its matching discriminator.")
        if not isinstance(self.market_range, MoneyRange):
            raise ContractValidationError("Expected market range must be a MoneyRange.")


@dataclass(frozen=True)
class NoReliableEstimateGuidance:
    guidance_type: FinancialGuidanceType
    currency: Currency
    explanation: str

    def __post_init__(self) -> None:
        if self.guidance_type is not FinancialGuidanceType.NO_RELIABLE_ESTIMATE:
            raise ContractValidationError("No-estimate guidance requires its matching discriminator.")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("No-estimate currency must be a Currency.")
        require_non_empty(self.explanation, "no reliable estimate explanation")


OpenFinancialGuidance = (
    IndicativeBudgetGuidance
    | MaximumBudgetCeiling
    | ExpectedMarketRangeGuidance
    | NoReliableEstimateGuidance
)


@dataclass(frozen=True)
class OpenClientPayment:
    payment_structure: PaymentStructure
    guidance: OpenFinancialGuidance
    preferred_proposal_form: PreferredProposalForm

    def __post_init__(self) -> None:
        if self.payment_structure is not PaymentStructure.OPEN_TO_PROPOSALS:
            raise ContractValidationError("Open client terms require the open-proposal discriminator.")
        if not isinstance(
            self.guidance,
            (IndicativeBudgetGuidance, MaximumBudgetCeiling, ExpectedMarketRangeGuidance, NoReliableEstimateGuidance),
        ):
            raise ContractValidationError("Open client terms require structured financial guidance.")
        require_enum_member(self.preferred_proposal_form, PreferredProposalForm, "preferred proposal form")


ClientPayment = FixedPriceClientPayment | HourlyClientPayment | OpenClientPayment


class FixedProposalMode(str, Enum):
    COMFORTABLE_WITHIN_POSTED_BUDGET = "comfortable_within_posted_budget"
    EXACT_TOTAL = "exact_total"
    TOTAL_RANGE = "total_range"
    REQUIRES_SCOPE_CLARIFICATION = "requires_scope_clarification"


@dataclass(frozen=True)
class FixedPriceProposal:
    payment_structure: PaymentStructure
    currency: Currency
    mode: FixedProposalMode
    scope: ProposalScope
    exact_total: Decimal | None = None
    total_range: MoneyRange | None = None
    above_budget_explanation: str | None = None

    def __post_init__(self) -> None:
        if self.payment_structure is not PaymentStructure.FIXED_PRICE:
            raise ContractValidationError("Fixed proposal requires the fixed-price discriminator.")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("Fixed proposal currency must be a Currency.")
        require_enum_member(self.mode, FixedProposalMode, "fixed proposal mode")
        if not isinstance(self.scope, ProposalScope):
            raise ContractValidationError("Fixed proposal scope must be a ProposalScope.")
        if self.total_range is not None and self.total_range.currency != self.currency:
            raise ContractValidationError("Fixed proposal range currency must match proposal currency.")
        if self.mode is FixedProposalMode.EXACT_TOTAL:
            if self.exact_total is None or self.total_range is not None:
                raise ContractValidationError("Exact-total proposal requires only exact_total.")
            require_positive_decimal(self.exact_total, "exact proposal total")
        elif self.mode is FixedProposalMode.TOTAL_RANGE:
            if self.total_range is None or self.exact_total is not None:
                raise ContractValidationError("Total-range proposal requires only total_range.")
        elif self.mode in (
            FixedProposalMode.COMFORTABLE_WITHIN_POSTED_BUDGET,
            FixedProposalMode.REQUIRES_SCOPE_CLARIFICATION,
        ):
            if self.exact_total is not None or self.total_range is not None:
                raise ContractValidationError("This fixed proposal mode cannot include a total value.")

    @property
    def is_selection_ready(self) -> bool:
        return self.mode is not FixedProposalMode.REQUIRES_SCOPE_CLARIFICATION


class RateFlexibility(str, Enum):
    FIXED = "fixed"
    NEGOTIABLE = "negotiable"
    DEPENDS_ON_WEEKLY_COMMITMENT = "depends_on_weekly_commitment"


@dataclass(frozen=True)
class HourlyProposal:
    payment_structure: PaymentStructure
    currency: Currency
    requested_hourly_rate: Decimal
    weekly_availability_hours: DecimalRange
    available_from: date
    rate_flexibility: RateFlexibility
    scope: ProposalScope
    out_of_range_explanation: str | None = None

    def __post_init__(self) -> None:
        if self.payment_structure is not PaymentStructure.HOURLY:
            raise ContractValidationError("Hourly proposal requires the hourly discriminator.")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("Hourly proposal currency must be a Currency.")
        if not isinstance(self.weekly_availability_hours, DecimalRange):
            raise ContractValidationError("Weekly availability must be a DecimalRange.")
        require_enum_member(self.rate_flexibility, RateFlexibility, "rate flexibility")
        if not isinstance(self.scope, ProposalScope):
            raise ContractValidationError("Hourly proposal scope must be a ProposalScope.")
        require_positive_decimal(self.requested_hourly_rate, "requested hourly rate")
        if not isinstance(self.available_from, date):
            raise ContractValidationError("available_from must be a date.")

    @property
    def is_selection_ready(self) -> bool:
        return True


class OpenProposalMode(str, Enum):
    ESTIMATED_FIXED_PRICE_RANGE = "estimated_fixed_price_range"
    PROPOSED_HOURLY_RATE = "proposed_hourly_rate"
    PHASED_ESTIMATE = "phased_estimate"
    INITIAL_DISCOVERY_PHASE = "initial_discovery_phase"


@dataclass(frozen=True)
class PricingPhase:
    name: str
    amount: Decimal
    duration: Duration

    def __post_init__(self) -> None:
        require_non_empty(self.name, "pricing phase name")
        require_positive_decimal(self.amount, "pricing phase amount")
        if not isinstance(self.duration, Duration):
            raise ContractValidationError("Pricing phase duration must be a Duration.")
        if not self.duration.is_selection_ready:
            raise ContractValidationError("Pricing phase duration must be concrete.")


@dataclass(frozen=True)
class DiscoveryPhase:
    scope: str
    amount: Decimal
    duration: Duration

    def __post_init__(self) -> None:
        require_non_empty(self.scope, "discovery phase scope")
        require_positive_decimal(self.amount, "discovery phase amount")
        if not isinstance(self.duration, Duration):
            raise ContractValidationError("Discovery phase duration must be a Duration.")
        if not self.duration.is_selection_ready:
            raise ContractValidationError("Discovery phase duration must be concrete.")


@dataclass(frozen=True)
class OpenProposal:
    payment_structure: PaymentStructure
    currency: Currency
    mode: OpenProposalMode
    scope: ProposalScope
    fixed_price_range: MoneyRange | None = None
    hourly_rate: Decimal | None = None
    phases: tuple[PricingPhase, ...] = ()
    discovery_phase: DiscoveryPhase | None = None

    def __post_init__(self) -> None:
        if self.payment_structure is not PaymentStructure.OPEN_TO_PROPOSALS:
            raise ContractValidationError("Open proposal requires the open-proposal discriminator.")
        if not isinstance(self.currency, Currency):
            raise ContractValidationError("Open proposal currency must be a Currency.")
        require_enum_member(self.mode, OpenProposalMode, "open proposal mode")
        if not isinstance(self.scope, ProposalScope):
            raise ContractValidationError("Open proposal scope must be a ProposalScope.")
        if not self.scope.has_open_proposal_explanations:
            raise ContractValidationError(
                "Open proposals require included work, excluded work, assumptions, and estimate-change factors."
            )
        if self.fixed_price_range is not None and self.fixed_price_range.currency != self.currency:
            raise ContractValidationError("Open fixed-price range currency must match proposal currency.")

        populated = sum(
            (
                self.fixed_price_range is not None,
                self.hourly_rate is not None,
                bool(self.phases),
                self.discovery_phase is not None,
            )
        )
        if populated != 1:
            raise ContractValidationError("Open proposal must populate exactly one mode-specific pricing value.")
        if self.mode is OpenProposalMode.ESTIMATED_FIXED_PRICE_RANGE and self.fixed_price_range is None:
            raise ContractValidationError("Estimated fixed-price proposal requires a price range.")
        if self.mode is OpenProposalMode.PROPOSED_HOURLY_RATE:
            if self.hourly_rate is None:
                raise ContractValidationError("Hourly open proposal requires an hourly rate.")
            require_positive_decimal(self.hourly_rate, "open proposal hourly rate")
        if self.mode is OpenProposalMode.PHASED_ESTIMATE and not self.phases:
            raise ContractValidationError("Phased estimate requires at least one pricing phase.")
        if self.mode is OpenProposalMode.INITIAL_DISCOVERY_PHASE and self.discovery_phase is None:
            raise ContractValidationError("Initial discovery proposal requires concrete discovery terms.")

    @property
    def is_selection_ready(self) -> bool:
        return True


FreelancerProposal = FixedPriceProposal | HourlyProposal | OpenProposal


@dataclass(frozen=True)
class ProposalCompatibility:
    """Commercial warning outcome; it never changes suitability ranking."""

    outside_posted_range: bool
    requires_client_acknowledgement: bool
    warning_code: str | None = None


def proposal_currency(proposal: FreelancerProposal) -> Currency:
    return proposal.currency


def client_currency(payment: ClientPayment) -> Currency:
    if isinstance(payment, FixedPriceClientPayment):
        return payment.budget.currency
    if isinstance(payment, HourlyClientPayment):
        return payment.hourly_rate.currency
    guidance = payment.guidance
    if isinstance(guidance, IndicativeBudgetGuidance):
        return guidance.budget.currency
    if isinstance(guidance, ExpectedMarketRangeGuidance):
        return guidance.market_range.currency
    return guidance.currency


def validate_financial_compatibility(
    client_payment: ClientPayment,
    proposal: FreelancerProposal,
) -> ProposalCompatibility:
    """Validate discriminator/currency compatibility and return explicit warnings."""

    if client_payment.payment_structure is not proposal.payment_structure:
        raise ProposalCompatibilityError("Proposal payment structure does not match the gig payment structure.")
    if client_currency(client_payment) != proposal_currency(proposal):
        raise ProposalCompatibilityError("Proposal currency must match the gig currency.")

    if isinstance(client_payment, FixedPriceClientPayment) and isinstance(proposal, FixedPriceProposal):
        proposed_max = _fixed_proposal_maximum(proposal, client_payment.budget.maximum)
        outside = proposed_max > client_payment.budget.maximum
        if outside:
            require_optional_explanation(
                proposal.above_budget_explanation,
                "above-budget explanation",
                required=True,
            )
        return ProposalCompatibility(outside, outside, "above_posted_budget" if outside else None)

    if isinstance(client_payment, HourlyClientPayment) and isinstance(proposal, HourlyProposal):
        outside = not (
            client_payment.hourly_rate.minimum
            <= proposal.requested_hourly_rate
            <= client_payment.hourly_rate.maximum
        )
        if outside:
            require_optional_explanation(
                proposal.out_of_range_explanation,
                "out-of-range hourly-rate explanation",
                required=True,
            )
        return ProposalCompatibility(outside, outside, "outside_posted_hourly_range" if outside else None)

    if isinstance(client_payment, OpenClientPayment) and isinstance(proposal, OpenProposal):
        ceiling = client_payment.guidance
        if isinstance(ceiling, MaximumBudgetCeiling):
            if proposal.mode is OpenProposalMode.PROPOSED_HOURLY_RATE:
                return ProposalCompatibility(
                    outside_posted_range=False,
                    requires_client_acknowledgement=True,
                    warning_code="total_ceiling_not_calculable_for_hourly_proposal",
                )
            proposal_maximum = _open_proposal_maximum(proposal)
            if proposal_maximum > ceiling.maximum:
                raise ProposalCompatibilityError("Proposal exceeds the gig's explicit maximum budget ceiling.")
        return ProposalCompatibility(False, False)

    raise ProposalCompatibilityError("Proposal contract is incompatible with the client payment contract.")


def _fixed_proposal_maximum(proposal: FixedPriceProposal, posted_maximum: Decimal) -> Decimal:
    if proposal.mode is FixedProposalMode.COMFORTABLE_WITHIN_POSTED_BUDGET:
        return posted_maximum
    if proposal.exact_total is not None:
        return proposal.exact_total
    if proposal.total_range is not None:
        return proposal.total_range.maximum
    return Decimal("0")


def _open_proposal_maximum(proposal: OpenProposal) -> Decimal:
    if proposal.fixed_price_range is not None:
        return proposal.fixed_price_range.maximum
    if proposal.hourly_rate is not None:
        raise ProposalCompatibilityError(
            "Hourly rate cannot be compared directly with a total project budget ceiling."
        )
    if proposal.phases:
        return sum((phase.amount for phase in proposal.phases), Decimal("0"))
    if proposal.discovery_phase is not None:
        return proposal.discovery_phase.amount
    raise ProposalCompatibilityError("Open proposal has no concrete commercial value.")
