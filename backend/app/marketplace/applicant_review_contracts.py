"""Strict public request contracts for Milestone 7E review actions."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.marketplace.reasons import NotSelectedReason, ReconsiderationReason

CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class StrictReviewModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ShortlistReviewRequest(StrictReviewModel):
    shortlisted: bool
    shortlist_action_token: str = Field(min_length=32, max_length=128)


class ReviewDecisionRequest(StrictReviewModel):
    review_decision_action_token: str = Field(min_length=32, max_length=128)


class NotSelectedReviewRequest(ReviewDecisionRequest):
    primary_reason: NotSelectedReason
    additional_reasons: list[NotSelectedReason] = Field(default_factory=list, max_length=5)
    feedback_points: list[str] = Field(default_factory=list, max_length=5)
    respectful_note: str | None = Field(default=None, max_length=1000)
    other_explanation: str | None = Field(default=None, max_length=500)
    final_decision_confirmed: bool = False

    @field_validator("feedback_points")
    @classmethod
    def meaningful_feedback(cls, values: list[str]) -> list[str]:
        return [_clean_text(value, "feedback point", 500) for value in values]

    @field_validator("respectful_note", "other_explanation")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        return None if value is None else _clean_text(value, "decision text", 1000)

    @model_validator(mode="after")
    def validate_reasons(self) -> "NotSelectedReviewRequest":
        if self.primary_reason is NotSelectedReason.ANOTHER_APPLICANT_SELECTED:
            raise ValueError("another_applicant_selected is reserved for automatic closure")
        if self.primary_reason in self.additional_reasons or len(set(self.additional_reasons)) != len(
            self.additional_reasons
        ):
            raise ValueError("decision reasons must be unique")
        if NotSelectedReason.ANOTHER_APPLICANT_SELECTED in self.additional_reasons:
            raise ValueError("another_applicant_selected is reserved for automatic closure")
        if self.primary_reason is NotSelectedReason.OTHER and self.other_explanation is None:
            raise ValueError("other requires an explanation")
        return self


class ReopenReviewRequest(ReviewDecisionRequest):
    reason: ReconsiderationReason
    explanation: str | None = Field(default=None, max_length=1000)

    @field_validator("explanation")
    @classmethod
    def clean_explanation(cls, value: str | None) -> str | None:
        return None if value is None else _clean_text(value, "reopen explanation", 1000)

    @model_validator(mode="after")
    def other_requires_explanation(self) -> "ReopenReviewRequest":
        if self.reason is ReconsiderationReason.OTHER and self.explanation is None:
            raise ValueError("other requires an explanation")
        return self


ApplicantStatus = Literal["active", "not_selected", "withdrawn", "closed", "all"]
ApplicantView = Literal["best_match", "newest", "internal_shortlist", "advanced"]


def _clean_text(value: str, label: str, maximum: int) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{label} must not be blank")
    if len(cleaned) > maximum:
        raise ValueError(f"{label} is too long")
    if CONTROL_CHARACTERS.search(cleaned):
        raise ValueError(f"{label} contains control characters")
    return cleaned


__all__ = [
    "ApplicantStatus",
    "ApplicantView",
    "NotSelectedReviewRequest",
    "ReopenReviewRequest",
    "ReviewDecisionRequest",
    "ShortlistReviewRequest",
]
