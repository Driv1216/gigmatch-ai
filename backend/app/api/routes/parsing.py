from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, StrictStr

from app.parsing.skill_extractor import extract_skills

router = APIRouter()


class SkillExtractionRequest(BaseModel):
    text: StrictStr = Field(default="", max_length=50000)


class SkillExtractionResponse(BaseModel):
    skills: list[str]
    categories: list[str]
    matched_terms: list[str]
    unmatched_keywords: list[str]
    confidence: Literal["deterministic"]


@router.post("/extract-skills", response_model=SkillExtractionResponse)
def extract_skills_from_text(payload: SkillExtractionRequest) -> dict[str, object]:
    return extract_skills(payload.text)
