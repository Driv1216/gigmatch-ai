"""High-confidence, deterministic Q&A content safeguards.

These checks are deliberately conservative. They catch contact exchange and
credential/financial solicitation without pretending to understand message
semantics or moderate ordinary technical discussion.
"""

from __future__ import annotations

import re

EMAIL = re.compile(r"[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}", re.IGNORECASE)
PHONE = re.compile(r"(?<!\d)\+?\d[\d ()-]{8,}\d(?!\d)")
URL = re.compile(r"(?:https?://|www\.)", re.IGNORECASE)
MESSAGING = re.compile(
    r"\b(?:whatsapp|telegram|discord|signal)\s*(?:me|at|:|@)", re.IGNORECASE
)
OFF_PLATFORM = re.compile(
    r"\b(?:move|continue|contact|message|reach)\W+(?:me\s+)?"
    r"(?:off[- ]platform|outside\s+gigmatch)\b",
    re.IGNORECASE,
)
CREDENTIAL = re.compile(
    r"\b(?:send|share|provide|tell|give|enter)\b[^.!?]{0,40}"
    r"\b(?:password|passcode|otp|one[- ]time password|api key|access token|"
    r"secret key|private key)\b",
    re.IGNORECASE,
)
TOKEN = re.compile(r"(?<![\w-])sk-[\w-]{16,}", re.IGNORECASE)
FINANCIAL = re.compile(
    r"\b(?:send|share|provide|enter)\b[^.!?]{0,40}"
    r"\b(?:bank account|account number|routing number|ifsc|upi id|payment identifier)\b",
    re.IGNORECASE,
)
UPI = re.compile(r"[\w._-]+@[A-Za-z]{2,15}\s*(?:upi|pay)\b", re.IGNORECASE)


def message_safety_code(*parts: str | None) -> str | None:
    """Return a stable public safety code, without exposing the match."""

    value = " ".join(part for part in parts if part)
    if EMAIL.search(value) or PHONE.search(value):
        return "contact_information_not_allowed"
    if URL.search(value) or MESSAGING.search(value) or OFF_PLATFORM.search(value):
        return "external_communication_request_not_allowed"
    if CREDENTIAL.search(value) or TOKEN.search(value):
        return "credential_request_not_allowed"
    if FINANCIAL.search(value) or UPI.search(value):
        return "financial_identifier_not_allowed"
    return None


__all__ = ["message_safety_code"]
