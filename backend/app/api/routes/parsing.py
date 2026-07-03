from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field, StrictStr
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.parsing.skill_extractor import extract_skills
from app.services.document_text_extractor import (
    SCANNED_PDF_WARNING,
    SUPPORTED_DOCUMENT_EXTENSIONS,
    DocumentTextExtractionError,
    extract_text_from_document_bytes,
)

router = APIRouter()

MAX_RESUME_DOCUMENT_BYTES = 5 * 1024 * 1024


class SkillExtractionRequest(BaseModel):
    text: StrictStr = Field(default="", max_length=50000)


class SkillExtractionResponse(BaseModel):
    skills: list[str]
    categories: list[str]
    matched_terms: list[str]
    unmatched_keywords: list[str]
    confidence: Literal["deterministic"]


class ResumeDocumentSource(BaseModel):
    file_name: str
    file_type: Literal["pdf", "docx"]
    character_count: int
    page_count: int | None
    paragraph_count: int | None
    warnings: list[str]


class ResumeDocumentExtractionResponse(BaseModel):
    text: str
    source: ResumeDocumentSource


@router.post("/extract-skills", response_model=SkillExtractionResponse)
def extract_skills_from_text(payload: SkillExtractionRequest) -> dict[str, object]:
    return extract_skills(payload.text)


@router.post("/resume/extract-document", response_model=ResumeDocumentExtractionResponse)
async def extract_resume_document_text(
    request: Request,
    file: UploadFile = File(...),
) -> ResumeDocumentExtractionResponse:
    form = await request.form()
    uploaded_file_count = sum(
        1 for _, value in form.multi_items() if isinstance(value, StarletteUploadFile)
    )

    if uploaded_file_count != 1:
        raise HTTPException(status_code=400, detail="Exactly one resume document file is required.")

    file_name = file.filename or ""
    extension = Path(file_name).suffix.lower()

    if extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported document type. Supported file extensions: {supported}.",
        )

    file_bytes = await file.read(MAX_RESUME_DOCUMENT_BYTES + 1)

    if len(file_bytes) > MAX_RESUME_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Resume document is too large. Maximum size is 5 MB.")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Resume document file is empty.")

    try:
        result = extract_text_from_document_bytes(file_bytes, file_name)
    except DocumentTextExtractionError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not result.text.strip():
        detail = result.metadata.warnings[0] if result.metadata.warnings else "Document did not contain readable text."
        if result.metadata.file_type == "pdf" and SCANNED_PDF_WARNING in result.metadata.warnings:
            detail = SCANNED_PDF_WARNING
        raise HTTPException(status_code=400, detail=detail)

    return ResumeDocumentExtractionResponse(
        text=result.text,
        source=ResumeDocumentSource(
            file_name=file_name,
            file_type=result.metadata.file_type,
            character_count=result.metadata.character_count,
            page_count=result.metadata.page_count,
            paragraph_count=result.metadata.paragraph_count,
            warnings=result.metadata.warnings,
        ),
    )
