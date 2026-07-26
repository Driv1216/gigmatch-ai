"""Strict browser contracts for engagement-scoped contact exchange."""

from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.marketplace.contact_crypto import canonicalize_contact_url

ContactMethod = Literal[
    "verified_email",
    "verified_phone",
    "whatsapp_phone",
    "meeting_link",
    "professional_profile",
]
ContactReportCategory = Literal[
    "harassment",
    "spam",
    "fraudulent_request",
    "identity_misrepresentation",
    "abusive_communication",
    "suspicious_payment_request",
    "request_for_credentials",
    "other",
]
URL_METHODS = frozenset({"meeting_link", "professional_profile"})
CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")


class StrictContactModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ContactShareRequest(StrictContactModel):
    method: ContactMethod
    share_action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID
    value: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def validate_source(self) -> "ContactShareRequest":
        if self.method in URL_METHODS:
            if self.value is None:
                raise ValueError("User-provided contact URL is required.")
            self.value = canonicalize_contact_url(self.value, method=self.method)
        elif self.value is not None:
            raise ValueError("Verified contact values cannot be supplied by the browser.")
        return self


class ContactActionRequest(StrictContactModel):
    action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class ContactRevealRequest(StrictContactModel):
    reveal_action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID


class ContactReportRequest(StrictContactModel):
    report_action_token: str = Field(min_length=16, max_length=128)
    request_id: UUID
    category: ContactReportCategory
    detail: str | None = Field(default=None, max_length=1000)

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned or CONTROL_CHARACTERS.search(cleaned):
            raise ValueError("Report detail must be clean non-empty text.")
        return cleaned

    @model_validator(mode="after")
    def require_other_detail(self) -> "ContactReportRequest":
        if self.category == "other" and self.detail is None:
            raise ValueError("Other requires report detail.")
        return self


__all__ = [
    "ContactActionRequest",
    "ContactReportRequest",
    "ContactRevealRequest",
    "ContactShareRequest",
]
