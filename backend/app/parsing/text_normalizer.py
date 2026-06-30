"""Text normalization helpers for deterministic parsing.

The normalizer keeps symbols that are meaningful in technical skills, such as
``C++``, ``C#``, ``.NET``, and ``Node.js``.
"""

from __future__ import annotations

import re
import unicodedata

_WHITESPACE_RE = re.compile(r"\s+")
_SEPARATOR_RE = re.compile(r"[\u2010-\u2015\-_/\\,;:()\[\]{}<>|\"'`~!?\n\r\t]")


def normalize_text(text: str) -> str:
    """Normalize raw resume or gig text for deterministic skill matching."""

    if not text:
        return ""

    normalized = unicodedata.normalize("NFKC", text).casefold()
    normalized = _SEPARATOR_RE.sub(" ", normalized)
    normalized = _WHITESPACE_RE.sub(" ", normalized)
    return normalized.strip()


def normalize_lookup_term(term: str) -> str:
    """Normalize a taxonomy alias or canonical term for lookup matching."""

    return normalize_text(term)
