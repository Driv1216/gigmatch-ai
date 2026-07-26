"""Strict API request contracts for exact-version selection workflows."""

from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

SelectionDuration = Literal[24, 48, 72]
CancellationReason = Literal[
    "terms_require_review",
    "gig_being_paused",
    "client_withdrew_request",
    "other",
]
WithdrawalReason = Literal[
    "accepted_another_opportunity",
    "no_longer_available",
    "scope_or_terms_no_longer_fit",
    "timeline_changed",
    "budget_expectations_mismatch",
    "gig_changed_materially",
    "personal_circumstances",
    "other",
]
SelectionChangeCategory = Literal[
    "scope",
    "budget",
    "payment_structure",
    "timeline",
    "availability",
    "assumptions",
]


class StrictSelectionModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SendSelectionRequest(StrictSelectionModel):
    duration_hours: SelectionDuration = 48
    send_token: str = Field(min_length=16, max_length=128)
    request_id: UUID
    commercial_acknowledged: bool = False


class CancelSelectionRequest(StrictSelectionModel):
    management_token: str = Field(min_length=16, max_length=128)
    request_id: UUID
    reason_code: CancellationReason
    detail: str | None = Field(default=None, max_length=800)

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        return _clean_optional(value)

    @model_validator(mode="after")
    def require_other_detail(self) -> "CancelSelectionRequest":
        if self.reason_code == "other" and self.detail is None:
            raise ValueError("other requires detail")
        return self


class SelectionResponseRequest(StrictSelectionModel):
    response_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class AcceptSelectionRequest(SelectionResponseRequest):
    exact_terms_confirmed: Literal[True]


class DeclineRemainInterestedRequest(SelectionResponseRequest):
    detail: str | None = Field(default=None, max_length=800)

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        return _clean_optional(value)


class DeclineWithdrawRequest(SelectionResponseRequest):
    reason_code: WithdrawalReason
    detail: str | None = Field(default=None, max_length=800)

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        return _clean_optional(value)

    @model_validator(mode="after")
    def require_other_detail(self) -> "DeclineWithdrawRequest":
        if self.reason_code == "other" and self.detail is None:
            raise ValueError("other requires detail")
        return self


class RequestRevisedSelectionTerms(SelectionResponseRequest):
    change_categories: list[SelectionChangeCategory] = Field(min_length=1, max_length=6)
    detail: str | None = Field(default=None, max_length=800)

    @field_validator("change_categories")
    @classmethod
    def unique_categories(
        cls, value: list[SelectionChangeCategory]
    ) -> list[SelectionChangeCategory]:
        if len(set(value)) != len(value):
            raise ValueError("change categories must be unique")
        return value

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        return _clean_optional(value)


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or CONTROL_CHARACTERS.search(cleaned):
        raise ValueError("detail must be clean non-empty text")
    return cleaned


__all__ = [
    "AcceptSelectionRequest",
    "CancelSelectionRequest",
    "DeclineRemainInterestedRequest",
    "DeclineWithdrawRequest",
    "RequestRevisedSelectionTerms",
    "SendSelectionRequest",
]
