"""Strict API contracts and canonical serialization for freelancer applications."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.marketplace.reasons import WithdrawalReason


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DecimalRangeInput(StrictModel):
    minimum: Decimal = Field(gt=0)
    maximum: Decimal = Field(gt=0)

    @model_validator(mode="after")
    def ordered(self) -> "DecimalRangeInput":
        if self.minimum > self.maximum:
            raise ValueError("minimum cannot exceed maximum")
        return self


class DurationInput(StrictModel):
    mode: Literal["exact", "range", "requires_discussion"]
    unit: Literal["days", "weeks", "months"] | None = None
    exact_value: Decimal | None = Field(default=None, gt=0)
    minimum_value: Decimal | None = Field(default=None, gt=0)
    maximum_value: Decimal | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def valid_shape(self) -> "DurationInput":
        if self.mode == "exact":
            if self.unit is None or self.exact_value is None or self.minimum_value is not None or self.maximum_value is not None:
                raise ValueError("exact duration requires only unit and exact_value")
        elif self.mode == "range":
            if (
                self.unit is None
                or self.minimum_value is None
                or self.maximum_value is None
                or self.exact_value is not None
                or self.minimum_value > self.maximum_value
            ):
                raise ValueError("range duration requires an ordered range")
        elif any(value is not None for value in (self.unit, self.exact_value, self.minimum_value, self.maximum_value)):
            raise ValueError("discussion-required duration cannot include values")
        return self


class AvailabilityInput(StrictModel):
    available_from: date
    weekly_hours: DecimalRangeInput | None = None


class ScopeInput(StrictModel):
    included_work: list[str]
    excluded_work: list[str]
    assumptions: list[str]
    estimate_change_factors: list[str]

    @model_validator(mode="after")
    def meaningful_items(self) -> "ScopeInput":
        for field_name in ("included_work", "excluded_work", "assumptions", "estimate_change_factors"):
            values = getattr(self, field_name)
            if any(not value.strip() for value in values):
                raise ValueError(f"{field_name} cannot contain blank values")
        return self


class PricingPhaseInput(StrictModel):
    name: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    duration: DurationInput

    @model_validator(mode="after")
    def concrete_duration(self) -> "PricingPhaseInput":
        if self.duration.mode == "requires_discussion":
            raise ValueError("pricing phase duration must be concrete")
        return self


class DiscoveryPhaseInput(StrictModel):
    scope: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    duration: DurationInput

    @model_validator(mode="after")
    def concrete_duration(self) -> "DiscoveryPhaseInput":
        if self.duration.mode == "requires_discussion":
            raise ValueError("discovery phase duration must be concrete")
        return self


class FixedPriceProposalInput(StrictModel):
    payment_structure: Literal["fixed_price"]
    mode: Literal[
        "comfortable_within_posted_budget", "exact_total", "total_range", "requires_scope_clarification"
    ]
    exact_total: Decimal | None = Field(default=None, gt=0)
    total_range: DecimalRangeInput | None = None
    above_budget_explanation: str | None = None

    @model_validator(mode="after")
    def valid_variant(self) -> "FixedPriceProposalInput":
        if self.mode == "exact_total" and (self.exact_total is None or self.total_range is not None):
            raise ValueError("exact_total mode requires only exact_total")
        if self.mode == "total_range" and (self.total_range is None or self.exact_total is not None):
            raise ValueError("total_range mode requires only total_range")
        if self.mode in ("comfortable_within_posted_budget", "requires_scope_clarification") and (
            self.exact_total is not None or self.total_range is not None
        ):
            raise ValueError("this fixed-price mode cannot include a total")
        return self


class HourlyProposalInput(StrictModel):
    payment_structure: Literal["hourly"]
    requested_hourly_rate: Decimal = Field(gt=0)
    weekly_availability_hours: DecimalRangeInput
    available_from: date
    rate_flexibility: Literal["fixed", "negotiable", "depends_on_weekly_commitment"]
    out_of_range_explanation: str | None = None


class OpenProposalInput(StrictModel):
    payment_structure: Literal["open_to_proposals"]
    mode: Literal[
        "estimated_fixed_price_range", "proposed_hourly_rate", "phased_estimate", "initial_discovery_phase"
    ]
    fixed_price_range: DecimalRangeInput | None = None
    hourly_rate: Decimal | None = Field(default=None, gt=0)
    phases: list[PricingPhaseInput] | None = None
    discovery_phase: DiscoveryPhaseInput | None = None

    @model_validator(mode="after")
    def exactly_one_variant(self) -> "OpenProposalInput":
        populated = sum(
            value is not None
            for value in (self.fixed_price_range, self.hourly_rate, self.phases, self.discovery_phase)
        )
        if populated != 1:
            raise ValueError("open proposal requires exactly one pricing variant")
        mapping = {
            "estimated_fixed_price_range": self.fixed_price_range,
            "proposed_hourly_rate": self.hourly_rate,
            "phased_estimate": self.phases,
            "initial_discovery_phase": self.discovery_phase,
        }
        if mapping[self.mode] is None or (self.mode == "phased_estimate" and not self.phases):
            raise ValueError("open proposal mode does not match its value")
        return self


ProposalInput = Annotated[
    FixedPriceProposalInput | HourlyProposalInput | OpenProposalInput,
    Field(discriminator="payment_structure"),
]


class ApplicationSnapshotInput(StrictModel):
    cover_note: str = Field(min_length=1)
    proposal: ProposalInput
    timeline: DurationInput
    availability: AvailabilityInput
    scope: ScopeInput
    scope_notes: str | None = None

    @model_validator(mode="after")
    def proposal_requirements(self) -> "ApplicationSnapshotInput":
        if isinstance(self.proposal, HourlyProposalInput) and self.availability.weekly_hours is None:
            raise ValueError("hourly applications require weekly availability")
        if isinstance(self.proposal, OpenProposalInput):
            for field_name in ("included_work", "excluded_work", "assumptions", "estimate_change_factors"):
                if not getattr(self.scope, field_name):
                    raise ValueError(f"open proposals require {field_name}")
        if self.scope_notes is not None and not self.scope_notes.strip():
            raise ValueError("scope_notes cannot be blank")
        return self

    def canonical_payload(self, *, currency: str) -> dict[str, Any]:
        payload = self.model_dump(mode="json", exclude_none=True)
        proposal = payload["proposal"]
        proposal["proposal_contract_version"] = 1
        proposal["snapshot_schema_version"] = 1
        proposal["currency"] = currency
        return {
            "proposal_contract_version": 1,
            "snapshot_schema_version": 1,
            **payload,
        }


class SubmitApplicationRequest(StrictModel):
    submission_request_id: UUID
    expected_material_terms_token: str = Field(min_length=32, max_length=128)
    application: ApplicationSnapshotInput


class ApplicationVersionRequest(StrictModel):
    expected_application_version_token: str = Field(min_length=32, max_length=128)
    application: ApplicationSnapshotInput


class GigChangeReaffirmRequest(StrictModel):
    expected_application_version_token: str = Field(min_length=32, max_length=128)
    expected_material_terms_token: str = Field(min_length=32, max_length=128)


class GigChangeUpdateRequest(GigChangeReaffirmRequest):
    application: ApplicationSnapshotInput


class WithdrawApplicationRequest(StrictModel):
    expected_application_version_token: str = Field(min_length=32, max_length=128)
    reason: WithdrawalReason
    explanation: str | None = None

    @model_validator(mode="after")
    def other_requires_explanation(self) -> "WithdrawApplicationRequest":
        if self.reason is WithdrawalReason.OTHER and not (self.explanation and self.explanation.strip()):
            raise ValueError("OTHER requires an explanation")
        return self


class ReapplyApplicationRequest(GigChangeUpdateRequest):
    pass


__all__ = [
    "ApplicationSnapshotInput",
    "ApplicationVersionRequest",
    "GigChangeReaffirmRequest",
    "GigChangeUpdateRequest",
    "ReapplyApplicationRequest",
    "SubmitApplicationRequest",
    "WithdrawApplicationRequest",
]
