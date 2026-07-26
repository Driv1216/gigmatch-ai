"""Strict request contracts for structured application Q&A and revisions."""

from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.marketplace.application_contracts import ApplicationSnapshotInput

CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
HTML = re.compile(r"<[^>]+>")

QaTopic = Literal[
    "proposal_scope",
    "budget",
    "timeline",
    "availability",
    "relevant_experience",
    "included_work",
    "excluded_work",
    "technical_assumptions",
    "commercial_assumptions",
    "other_job_related",
]
DeclineReason = Literal[
    "outside_proposal_scope",
    "requires_unpaid_work",
    "sensitive_information",
    "not_comfortable_answering",
    "insufficient_context",
    "other",
]
ReportCategory = Literal[
    "free_work_request",
    "complete_solution_request",
    "unpaid_design_request",
    "contact_information_request",
    "banking_information_request",
    "credential_or_secret_request",
    "harassment",
    "spam",
    "suspicious_payment_request",
    "other",
]
RevisionReason = Literal[
    "clarify_scope",
    "revise_budget",
    "revise_timeline",
    "explain_exclusions",
    "update_availability",
    "correct_assumptions",
    "other",
]
RevisionDeclineReason = Literal[
    "scope_stands",
    "budget_stands",
    "timeline_stands",
    "availability_unchanged",
    "request_unclear",
    "unable_to_revise",
    "other",
]


class StrictQaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OperationRequest(StrictQaModel):
    request_id: UUID


class TopicMessageRequest(OperationRequest):
    topic: QaTopic
    other_topic_detail: str | None = Field(default=None, max_length=120)
    body: str = Field(min_length=8, max_length=1200)

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        return _clean(value, minimum=8, maximum=1200)

    @field_validator("other_topic_detail")
    @classmethod
    def clean_topic_detail(cls, value: str | None) -> str | None:
        return None if value is None else _clean(value, minimum=3, maximum=120)

    @model_validator(mode="after")
    def validate_other_topic(self) -> "TopicMessageRequest":
        if (self.topic == "other_job_related") != (self.other_topic_detail is not None):
            raise ValueError("other_job_related requires one short topic description")
        return self


class InitialQuestionRequest(TopicMessageRequest):
    body: str = Field(min_length=8, max_length=600)

    @field_validator("body")
    @classmethod
    def clean_initial_body(cls, value: str) -> str:
        return _clean(value, minimum=8, maximum=600)


class AdvancedQuestionRequest(TopicMessageRequest):
    pass


class ClarificationRequest(TopicMessageRequest):
    pass


class AnswerRequest(OperationRequest):
    body: str = Field(min_length=2, max_length=1200)

    @field_validator("body")
    @classmethod
    def clean_answer(cls, value: str) -> str:
        return _clean(value, minimum=2, maximum=1200)


class DeclineQuestionRequest(OperationRequest):
    reason_code: DeclineReason
    note: str | None = Field(default=None, max_length=400)

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        return None if value is None else _clean(value, minimum=2, maximum=400)

    @model_validator(mode="after")
    def validate_other(self) -> "DeclineQuestionRequest":
        if self.reason_code == "other" and self.note is None:
            raise ValueError("other requires a note")
        return self


class CorrectionRequest(OperationRequest):
    body: str = Field(min_length=2, max_length=1200)

    @field_validator("body")
    @classmethod
    def clean_correction(cls, value: str) -> str:
        return _clean(value, minimum=2, maximum=1200)


class ReportMessageRequest(OperationRequest):
    category: ReportCategory
    detail: str | None = Field(default=None, max_length=600)

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        return None if value is None else _clean(value, minimum=3, maximum=600)

    @model_validator(mode="after")
    def validate_detail(self) -> "ReportMessageRequest":
        if (self.category == "other") != (self.detail is not None):
            raise ValueError("detail is accepted only for the other category")
        return self


class StopDiscussionRequest(OperationRequest):
    pass


class CreateRevisionRequest(OperationRequest):
    reason_code: RevisionReason
    reason_detail: str | None = Field(default=None, max_length=800)
    expected_application_version_id: UUID
    expected_material_gig_version_id: UUID

    @field_validator("reason_detail")
    @classmethod
    def clean_reason_detail(cls, value: str | None) -> str | None:
        return None if value is None else _clean(value, minimum=3, maximum=800)

    @model_validator(mode="after")
    def validate_reason(self) -> "CreateRevisionRequest":
        if self.reason_code == "other" and self.reason_detail is None:
            raise ValueError("other requires reason detail")
        return self


class DeclineRevisionRequest(OperationRequest):
    reason_code: RevisionDeclineReason
    reason_detail: str | None = Field(default=None, max_length=600)

    @field_validator("reason_detail")
    @classmethod
    def clean_response_detail(cls, value: str | None) -> str | None:
        return None if value is None else _clean(value, minimum=3, maximum=600)

    @model_validator(mode="after")
    def validate_reason(self) -> "DeclineRevisionRequest":
        if self.reason_code == "other" and self.reason_detail is None:
            raise ValueError("other requires reason detail")
        return self


class SubmitRevisionUpdateRequest(OperationRequest):
    expected_application_version_token: str = Field(min_length=32, max_length=128)
    snapshot: ApplicationSnapshotInput


def _clean(value: str, *, minimum: int, maximum: int) -> str:
    cleaned = value.strip()
    if not minimum <= len(cleaned) <= maximum:
        raise ValueError("text length is outside the supported range")
    if CONTROL_CHARACTERS.search(cleaned) or HTML.search(cleaned):
        raise ValueError("plain text without control characters is required")
    return cleaned


__all__ = [
    "AdvancedQuestionRequest",
    "AnswerRequest",
    "ClarificationRequest",
    "CorrectionRequest",
    "CreateRevisionRequest",
    "DeclineQuestionRequest",
    "DeclineRevisionRequest",
    "InitialQuestionRequest",
    "ReportMessageRequest",
    "StopDiscussionRequest",
    "SubmitRevisionUpdateRequest",
]
