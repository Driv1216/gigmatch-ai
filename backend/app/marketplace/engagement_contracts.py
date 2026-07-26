"""Strict browser contracts for engagement lifecycle and reconsideration."""

from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
EngagementCancellationReason = Literal[
    "scope_could_not_be_agreed",
    "availability_changed",
    "business_needs_changed",
    "mutual_decision",
    "safety_or_policy_concern",
    "other",
]
ReconsiderationReason = Literal[
    "failed_engagement_reopened",
    "client_reconsideration",
    "freelancer_invited_back",
    "other",
]


class StrictEngagementModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EngagementActionRequest(StrictEngagementModel):
    action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class ReopenGigRequest(StrictEngagementModel):
    reopening_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class CancellationRequest(EngagementActionRequest):
    reason_code: EngagementCancellationReason
    explanation: str | None = Field(default=None, max_length=800)

    @field_validator("explanation")
    @classmethod
    def clean_explanation(cls, value: str | None) -> str | None:
        return _clean_optional(value)

    @model_validator(mode="after")
    def require_other_explanation(self) -> "CancellationRequest":
        if self.reason_code == "other" and self.explanation is None:
            raise ValueError("other requires explanation")
        return self


class CreateReconsiderationInvitation(StrictEngagementModel):
    action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID
    reason_code: ReconsiderationReason
    explanation: str | None = Field(default=None, max_length=800)

    @field_validator("explanation")
    @classmethod
    def clean_explanation(cls, value: str | None) -> str | None:
        return _clean_optional(value)

    @model_validator(mode="after")
    def require_other_explanation(self) -> "CreateReconsiderationInvitation":
        if self.reason_code == "other" and self.explanation is None:
            raise ValueError("other requires explanation")
        return self


class ReconsiderationActionRequest(StrictEngagementModel):
    action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class ReconsiderationUpdateRequest(ReconsiderationActionRequest):
    snapshot: dict[str, object]


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or CONTROL_CHARACTERS.search(cleaned):
        raise ValueError("explanation must be clean non-empty text")
    return cleaned


__all__ = [
    "CancellationRequest",
    "CreateReconsiderationInvitation",
    "EngagementActionRequest",
    "ReconsiderationActionRequest",
    "ReconsiderationUpdateRequest",
    "ReopenGigRequest",
]
