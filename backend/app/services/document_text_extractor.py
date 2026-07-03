from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Literal
from xml.etree import ElementTree


SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf", ".docx"}
SCANNED_PDF_WARNING = (
    "This PDF appears to be scanned or image-based. We could not extract readable text. "
    "Please paste your resume text manually."
)


class DocumentTextExtractionError(ValueError):
    """Raised when document text extraction cannot safely continue."""


@dataclass(frozen=True)
class DocumentTextExtractionMetadata:
    file_type: Literal["pdf", "docx"]
    character_count: int
    warnings: list[str] = field(default_factory=list)
    page_count: int | None = None
    paragraph_count: int | None = None


@dataclass(frozen=True)
class DocumentTextExtractionResult:
    text: str
    metadata: DocumentTextExtractionMetadata


def extract_text_from_document_path(file_path: str | Path) -> DocumentTextExtractionResult:
    path = Path(file_path)
    return extract_text_from_document_bytes(path.read_bytes(), path.name)


def extract_text_from_document_bytes(file_bytes: bytes, file_name: str) -> DocumentTextExtractionResult:
    if not file_bytes:
        raise DocumentTextExtractionError("Document file is empty.")

    extension = Path(file_name).suffix.lower()

    if extension == ".pdf":
        return extract_text_from_pdf_bytes(file_bytes)

    if extension == ".docx":
        return extract_text_from_docx_bytes(file_bytes)

    supported = ", ".join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))
    raise DocumentTextExtractionError(f"Unsupported document type. Supported file extensions: {supported}.")


def extract_text_from_pdf_bytes(file_bytes: bytes) -> DocumentTextExtractionResult:
    if not file_bytes:
        raise DocumentTextExtractionError("PDF file is empty.")

    try:
        return _extract_pdf_with_pymupdf(file_bytes)
    except ModuleNotFoundError:
        return _extract_pdf_with_lightweight_fallback(file_bytes)
    except DocumentTextExtractionError:
        raise
    except Exception as error:
        raise DocumentTextExtractionError("Unable to extract text from PDF file.") from error


def extract_text_from_docx_bytes(file_bytes: bytes) -> DocumentTextExtractionResult:
    if not file_bytes:
        raise DocumentTextExtractionError("DOCX file is empty.")

    try:
        return _extract_docx_with_python_docx(file_bytes)
    except ModuleNotFoundError:
        return _extract_docx_with_zip_fallback(file_bytes)
    except DocumentTextExtractionError:
        raise
    except Exception as error:
        raise DocumentTextExtractionError("Unable to extract text from DOCX file.") from error


def _extract_pdf_with_pymupdf(file_bytes: bytes) -> DocumentTextExtractionResult:
    import fitz

    try:
        document = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as error:
        raise DocumentTextExtractionError("Invalid or unreadable PDF file.") from error

    page_text: list[str] = []

    try:
        for page in document:
            page_text.append(page.get_text("text"))

        return _build_pdf_result("\n\n".join(page_text), document.page_count)
    finally:
        document.close()


def _extract_pdf_with_lightweight_fallback(file_bytes: bytes) -> DocumentTextExtractionResult:
    if not file_bytes.startswith(b"%PDF"):
        raise DocumentTextExtractionError("Invalid or unreadable PDF file.")

    page_count = len(re.findall(rb"/Type\s*/Page\b", file_bytes))
    text_fragments = [_decode_pdf_literal_string(match) for match in re.findall(rb"\((.*?)\)\s*Tj", file_bytes, re.DOTALL)]
    return _build_pdf_result("\n".join(text_fragments), page_count)


def _build_pdf_result(raw_text: str, page_count: int) -> DocumentTextExtractionResult:
    text = normalize_extracted_text(raw_text)
    warnings: list[str] = []

    if page_count > 0 and len(text.strip()) < 10:
        warnings.append(SCANNED_PDF_WARNING)

    return DocumentTextExtractionResult(
        text=text,
        metadata=DocumentTextExtractionMetadata(
            file_type="pdf",
            page_count=page_count,
            character_count=len(text),
            warnings=warnings,
        ),
    )


def _extract_docx_with_python_docx(file_bytes: bytes) -> DocumentTextExtractionResult:
    from docx import Document

    try:
        document = Document(BytesIO(file_bytes))
    except Exception as error:
        raise DocumentTextExtractionError("Invalid or unreadable DOCX file.") from error

    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    return _build_docx_result(paragraphs)


def _extract_docx_with_zip_fallback(file_bytes: bytes) -> DocumentTextExtractionResult:
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as document_zip:
            document_xml = document_zip.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as error:
        raise DocumentTextExtractionError("Invalid or unreadable DOCX file.") from error

    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root = ElementTree.fromstring(document_xml)
    paragraphs: list[str] = []

    for paragraph in root.findall(".//w:p", namespace):
        text_parts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
        paragraphs.append("".join(text_parts))

    return _build_docx_result(paragraphs)


def _build_docx_result(paragraphs: list[str]) -> DocumentTextExtractionResult:
    text = normalize_extracted_text("\n".join(paragraphs))
    warnings: list[str] = []

    if len(text.strip()) == 0:
        warnings.append("This DOCX did not contain readable paragraph text.")

    return DocumentTextExtractionResult(
        text=text,
        metadata=DocumentTextExtractionMetadata(
            file_type="docx",
            paragraph_count=len(paragraphs),
            character_count=len(text),
            warnings=warnings,
        ),
    )


def normalize_extracted_text(text: str) -> str:
    normalized_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.replace("\r\n", "\n").split("\n")]
    normalized = "\n".join(normalized_lines).strip()
    return re.sub(r"\n{3,}", "\n\n", normalized)


def _decode_pdf_literal_string(value: bytes) -> str:
    unescaped = (
        value.replace(rb"\(", b"(")
        .replace(rb"\)", b")")
        .replace(rb"\\", b"\\")
        .replace(rb"\n", b"\n")
        .replace(rb"\r", b"\r")
        .replace(rb"\t", b"\t")
    )
    return unescaped.decode("latin-1", errors="replace")
