"""Applicant-only ranking, deterministic ordering, and sanitized review DTOs."""

from __future__ import annotations

import hashlib
import math
from dataclasses import replace
from datetime import datetime, timezone
from typing import Any, Callable

from app.api.routes.applications import (
    _application_snapshot,
    _comparison,
    _safe_gig_summary,
    _safe_terms,
    _snapshot,
    _version_dto,
)
from app.matching.builders import build_freelancer_match_profile, build_gig_match_profile
from app.matching.contracts import FreelancerMatchProfile, GigMatchProfile
from app.matching.explanations import (
    build_match_explanation_evidence,
    with_explanation_text,
    with_skill_gap_summary,
)
from app.matching.hybrid import HybridMatchResult, rank_freelancers_for_gig_hybrid
from app.matching.keyword import KeywordMatchResult, rank_freelancers_for_gig
from app.matching.semantic import EmbeddingProvider, SemanticRankingUnavailableError
from app.marketplace.applicant_review_contracts import ApplicantStatus, ApplicantView
from app.marketplace.qa import qa_indicator_from_summary
from app.marketplace.ranking import RankingMode, SemanticStatus

ACTIVE_STAGES = {"under_review", "advanced"}
TERMINAL_STAGES = {"confirmed", "not_selected", "withdrawn", "closed_gig_cancelled"}
RANKING_INPUT_UNAVAILABLE = "matching_input_unavailable"
RankedResult = HybridMatchResult | KeywordMatchResult


def build_applicant_list(
    pool: dict[str, Any],
    *,
    status: ApplicantStatus,
    view: ApplicantView,
    page: int,
    page_size: int,
    provider_factory: Callable[[], EmbeddingProvider],
) -> dict[str, Any]:
    applications = list(pool.get("applications") or [])
    gig = pool.get("gig") if isinstance(pool.get("gig"), dict) else {}
    ranking_generated_at = datetime.now(timezone.utc).isoformat()
    context, evidence = _rank_applications(gig, applications, provider_factory)

    selected = _filter_applications(applications, status=status, view=view)
    ordered = sorted(
        selected,
        key=lambda application: _order_key(application, evidence.get(str(application.get("id"))), status, view),
    )
    total = len(ordered)
    offset = (page - 1) * page_size
    page_items = ordered[offset : offset + page_size]
    counts = {
        "active": sum(row.get("stage") in ACTIVE_STAGES for row in applications),
        "not_selected": sum(row.get("stage") == "not_selected" for row in applications),
        "withdrawn": sum(row.get("stage") == "withdrawn" for row in applications),
        "closed": sum(row.get("stage") == "closed_gig_cancelled" for row in applications),
        "all": len(applications),
    }
    return {
        "gig": _owned_gig_context(gig),
        "counts": counts,
        "ranking_context": context,
        "ranking_generated_at": ranking_generated_at,
        "items": [
            _applicant_card(application, evidence.get(str(application.get("id"))), ranking_generated_at)
            for application in page_items
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if total else 0,
        },
    }


def build_applicant_detail(
    application: dict[str, Any],
    *,
    provider_factory: Callable[[], EmbeddingProvider],
    history_page: int = 1,
    history_page_size: int = 10,
) -> dict[str, Any]:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    generated_at = datetime.now(timezone.utc).isoformat()
    context, ranked = _rank_applications(gig, [application], provider_factory)
    evidence = ranked.get(str(application.get("id")))
    versions = sorted(
        application.get("versions") or [],
        key=lambda row: (int(row.get("version_number") or 0), str(row.get("id") or "")),
        reverse=True,
    )
    offset = (history_page - 1) * history_page_size
    current = application.get("current_version") if isinstance(application.get("current_version"), dict) else {}
    answered = (
        current.get("answered_gig_version")
        if isinstance(current.get("answered_gig_version"), dict)
        else {}
    )
    material = (
        gig.get("current_material_version")
        if isinstance(gig.get("current_material_version"), dict)
        else {}
    )
    response_required = bool(
        current and material and str(current.get("gig_version_id")) != str(material.get("id"))
    )
    actions, blockers = review_actions(application)
    return {
        "application_id": str(application.get("id")),
        "gig": _owned_gig_context(gig),
        "freelancer": _safe_freelancer(application),
        "stage": application.get("stage"),
        "submitted_at": application.get("submitted_at"),
        "stage_changed_at": application.get("stage_changed_at"),
        "current_application_version_id": current.get("id"),
        "current_application_version_number": int(current.get("version_number") or 0),
        "current_application": _application_snapshot(current),
        "commercial_proposal": {
            "client_posted_terms": _safe_terms(_snapshot(answered)),
            "freelancer_proposal": _application_snapshot(current),
        },
        "answered_gig_version": {
            "id": answered.get("id"),
            "version_number": int(answered.get("version_number") or 0),
            "terms": _safe_terms(_snapshot(answered)),
        },
        "current_material_gig_version": {
            "id": material.get("id"),
            "version_number": int(material.get("version_number") or 0),
            "terms": _safe_terms(_snapshot(material)),
        },
        "material_change_comparison": (
            _comparison(_snapshot(answered), _snapshot(material)) if response_required else []
        ),
        "response_to_updated_gig_required": response_required,
        "suitability": _suitability_dto(evidence, context, generated_at),
        "review_state": _review_state_dto(application),
        "allowed_actions": actions,
        "action_blockers": blockers,
        "shortlist_action_token": shortlist_action_token(application),
        "review_decision_action_token": review_decision_action_token(application),
        "review_history": [_review_event(row) for row in application.get("review_history") or []],
        "application_version_count": len(versions),
        "version_history": {
            "items": [_version_dto(str(application.get("id")), row) for row in versions[offset : offset + history_page_size]],
            "pagination": {
                "page": history_page,
                "page_size": history_page_size,
                "total_items": len(versions),
                "total_pages": math.ceil(len(versions) / history_page_size) if versions else 0,
            },
        },
        "ranking_context": context,
        "ranking_generated_at": generated_at,
    }


def build_version_history(
    application: dict[str, Any], *, page: int, page_size: int
) -> dict[str, Any]:
    versions = sorted(
        application.get("versions") or [],
        key=lambda row: (int(row.get("version_number") or 0), str(row.get("id") or "")),
        reverse=True,
    )
    total = len(versions)
    offset = (page - 1) * page_size
    return {
        "items": [_version_dto(str(application.get("id")), row) for row in versions[offset : offset + page_size]],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if total else 0,
        },
    }


def review_actions(application: dict[str, Any]) -> tuple[list[str], list[str]]:
    stage = str(application.get("stage") or "")
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    lifecycle = gig.get("opportunity_lifecycle")
    operations = gig.get("operational_state")
    effective_request = _effective_request(application)
    actions: list[str] = []
    blockers: list[str] = []

    if lifecycle == "active" and stage in ACTIVE_STAGES:
        actions.append("remove_from_internal_shortlist" if _is_shortlisted(application) else "add_to_internal_shortlist")
    elif lifecycle in ("filled", "cancelled"):
        blockers.append("gig_read_only")
    elif stage not in ACTIVE_STAGES and stage != "not_selected":
        blockers.append("application_terminal")

    if lifecycle == "active" and operations == "active":
        if stage == "under_review":
            actions.extend(("advance", "mark_not_selected"))
        elif stage == "advanced":
            if effective_request is None:
                actions.extend(("return_to_review", "mark_not_selected"))
            else:
                blockers.append("pending_selection_blocks_review_action")
        elif stage == "not_selected":
            actions.append("reopen")
    elif lifecycle == "active" and operations == "paused":
        blockers.append("gig_paused_for_stage_decisions")

    return actions, list(dict.fromkeys(blockers))


def shortlist_action_token(application: dict[str, Any]) -> str:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    review_state = application.get("review_state") if isinstance(application.get("review_state"), dict) else {}
    return _token(
        application.get("id"),
        application.get("stage"),
        int(review_state.get("review_state_version") or 0),
        gig.get("opportunity_lifecycle"),
        gig.get("application_intake"),
        gig.get("operational_state"),
    )


def review_decision_action_token(application: dict[str, Any]) -> str:
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    request = _effective_request(application)
    return _token(
        application.get("id"),
        application.get("stage"),
        application.get("current_version_id"),
        _epoch(application.get("stage_changed_at")),
        gig.get("current_material_gig_version_id"),
        request.get("id") if request else None,
        gig.get("opportunity_lifecycle"),
        gig.get("application_intake"),
        gig.get("operational_state"),
    )


def _rank_applications(
    gig: dict[str, Any],
    applications: list[dict[str, Any]],
    provider_factory: Callable[[], EmbeddingProvider],
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    gig_profile = _current_material_gig_profile(gig)
    rankable: list[tuple[dict[str, Any], FreelancerMatchProfile]] = []
    unavailable: dict[str, dict[str, Any]] = {}
    for application in applications:
        application_id = str(application.get("id"))
        profile = application.get("freelancer_profile")
        if not isinstance(profile, dict):
            unavailable[application_id] = _unavailable_evidence()
            continue
        freelancer = build_freelancer_match_profile(profile, application.get("resume_parse"))
        if not _has_matching_input(freelancer):
            unavailable[application_id] = _unavailable_evidence()
            continue
        rankable.append((application, replace(freelancer, freelancer_id=application_id)))

    if not rankable:
        return {
            "ranking_mode": None,
            "semantic_status": SemanticStatus.NOT_REQUESTED.value,
            "semantic_unavailable_reason": None,
        }, unavailable

    freelancers = [item[1] for item in rankable]
    try:
        provider = provider_factory()
        results: list[RankedResult] = list(
            rank_freelancers_for_gig_hybrid(gig_profile, freelancers, provider)
        )
        context = {
            "ranking_mode": RankingMode.HYBRID.value,
            "semantic_status": SemanticStatus.AVAILABLE.value,
            "semantic_unavailable_reason": None,
        }
    except SemanticRankingUnavailableError as error:
        results = list(rank_freelancers_for_gig(gig_profile, freelancers))
        context = {
            "ranking_mode": RankingMode.KEYWORD_FALLBACK.value,
            "semantic_status": SemanticStatus.UNAVAILABLE.value,
            "semantic_unavailable_reason": error.reason.value,
        }

    profiles = {profile.freelancer_id: profile for _, profile in rankable}
    evidence = dict(unavailable)
    for result in results:
        profile = profiles[result.candidate_id]
        explanation = with_explanation_text(
            with_skill_gap_summary(
                build_match_explanation_evidence(
                    freelancer=profile,
                    gig=gig_profile,
                    result=result,
                    subject_type="gig",
                )
            )
        )
        is_hybrid = isinstance(result, HybridMatchResult)
        evidence[result.candidate_id] = {
            "ranking_status": "available",
            "ranking_score": result.hybrid_score if is_hybrid else result.keyword_score,
            "keyword_score": result.keyword_score,
            "semantic_score": result.semantic_score if is_hybrid else None,
            "hybrid_score": result.hybrid_score if is_hybrid else None,
            "ranking_unavailable_reason": None,
            "explanation": _serialize_explanation(explanation),
        }
    return context, evidence


def _current_material_gig_profile(gig: dict[str, Any]) -> GigMatchProfile:
    material = gig.get("current_material_version")
    if not isinstance(material, dict) or not isinstance(material.get("terms_snapshot"), dict):
        raise RuntimeError("Applicant ranking requires the current material gig version.")
    snapshot = material["terms_snapshot"]
    scope = snapshot.get("scope") if isinstance(snapshot.get("scope"), dict) else {}
    row = {
        "id": gig.get("id"),
        "client_id": gig.get("client_id"),
        "title": snapshot.get("title"),
        "description": snapshot.get("description"),
        "tech_category": snapshot.get("tech_category") or scope.get("tech_category"),
        "required_skills": snapshot.get("required_skills", []),
        "preferred_skills": snapshot.get("preferred_skills", []),
        "difficulty_level": snapshot.get("difficulty_level"),
        "seniority_needed": snapshot.get("experience_requirement"),
        "deliverables": snapshot.get("deliverables", []),
        "status": gig.get("status"),
    }
    return build_gig_match_profile(row, None)


def _filter_applications(
    applications: list[dict[str, Any]], *, status: ApplicantStatus, view: ApplicantView
) -> list[dict[str, Any]]:
    stage_map = {
        "active": ACTIVE_STAGES,
        "not_selected": {"not_selected"},
        "withdrawn": {"withdrawn"},
        "closed": {"closed_gig_cancelled"},
    }
    selected = applications if status == "all" else [
        row for row in applications if row.get("stage") in stage_map[status]
    ]
    if view == "internal_shortlist":
        return [row for row in selected if row.get("stage") in ACTIVE_STAGES and _is_shortlisted(row)]
    if view == "advanced":
        return [row for row in selected if row.get("stage") == "advanced"]
    return selected


def _order_key(
    application: dict[str, Any],
    evidence: dict[str, Any] | None,
    status: ApplicantStatus,
    view: ApplicantView,
) -> tuple[Any, ...]:
    stage = str(application.get("stage") or "")
    application_id = str(application.get("id") or "")
    terminal = stage not in ACTIVE_STAGES
    if status == "all" and terminal:
        return (1, -_epoch(application.get("stage_changed_at")), application_id)
    prefix: tuple[Any, ...] = (0,) if status == "all" else ()
    if status in ("not_selected", "withdrawn", "closed"):
        return prefix + (-_epoch(application.get("stage_changed_at")), application_id)
    if view == "newest":
        return prefix + (-_epoch(application.get("submitted_at")), application_id)
    ranked = evidence is not None and evidence.get("ranking_status") == "available"
    score = float(evidence.get("ranking_score") or 0.0) if ranked and evidence else 0.0
    if view == "internal_shortlist":
        review_state = application.get("review_state") if isinstance(application.get("review_state"), dict) else {}
        return prefix + (0 if ranked else 1, -score, -_epoch(review_state.get("shortlisted_at")), application_id)
    if view == "advanced":
        return prefix + (0 if ranked else 1, -score, -_epoch(application.get("stage_changed_at")), application_id)
    return prefix + (0 if ranked else 1, -score, -_epoch(application.get("submitted_at")), application_id)


def _applicant_card(
    application: dict[str, Any],
    evidence: dict[str, Any] | None,
    generated_at: str,
) -> dict[str, Any]:
    current = application.get("current_version") if isinstance(application.get("current_version"), dict) else {}
    answered = current.get("answered_gig_version") if isinstance(current.get("answered_gig_version"), dict) else {}
    gig = application.get("gig") if isinstance(application.get("gig"), dict) else {}
    material = gig.get("current_material_version") if isinstance(gig.get("current_material_version"), dict) else {}
    stale = bool(current and material and str(current.get("gig_version_id")) != str(material.get("id")))
    actions, blockers = review_actions(application)
    return {
        "application_id": str(application.get("id")),
        "freelancer": _safe_freelancer(application),
        "stage": application.get("stage"),
        "submitted_at": application.get("submitted_at"),
        "stage_changed_at": application.get("stage_changed_at"),
        "suitability": _suitability_dto(evidence, None, generated_at),
        "commercial": {
            "client_posted_payment_terms": _safe_terms(_snapshot(answered)).get("client_payment"),
            "proposal": _safe_proposal(current.get("proposal_snapshot")),
            "timeline": current.get("timeline_snapshot") if isinstance(current.get("timeline_snapshot"), dict) else {},
            "availability": current.get("availability_snapshot") if isinstance(current.get("availability_snapshot"), dict) else {},
            "cover_note_preview": _preview(current.get("cover_note")),
            "application_version_number": int(current.get("version_number") or 0),
            "answered_gig_version_number": int(answered.get("version_number") or 0),
            "current_material_gig_version_number": int(material.get("version_number") or 0),
            "response_to_updated_gig_required": stale,
        },
        "review_state": _review_state_dto(application),
        "allowed_actions": actions,
        "action_blockers": blockers,
        "shortlist_action_token": shortlist_action_token(application),
        "review_decision_action_token": review_decision_action_token(application),
        "qa": qa_indicator_from_summary(application),
    }


def _suitability_dto(
    evidence: dict[str, Any] | None,
    context: dict[str, Any] | None,
    generated_at: str,
) -> dict[str, Any]:
    value = evidence or _unavailable_evidence()
    score = value.get("ranking_score")
    explanation = value.get("explanation") if isinstance(value.get("explanation"), dict) else {}
    gap = explanation.get("skill_gap") if isinstance(explanation.get("skill_gap"), dict) else {}
    ranking_mode = context.get("ranking_mode") if context else (
        "hybrid" if value.get("hybrid_score") is not None else
        "keyword_fallback" if value.get("keyword_score") is not None else None
    )
    return {
        "evidence_label": "Current AI-assisted suitability evidence",
        "ranking_status": value.get("ranking_status"),
        "ranking_mode": ranking_mode,
        "ranking_score": score,
        "keyword_score": value.get("keyword_score"),
        "semantic_score": value.get("semantic_score"),
        "hybrid_score": value.get("hybrid_score"),
        "match_label": _match_label(score),
        "ranking_unavailable_reason": value.get("ranking_unavailable_reason"),
        "matched_required_skills": gap.get("matched_required_skills", []),
        "matched_preferred_skills": gap.get("matched_preferred_skills", []),
        "required_skill_gaps": gap.get("missing_required_skills", []),
        "preferred_skill_gaps": gap.get("missing_preferred_skills", []),
        "strongest_matching_evidence": _strongest_evidence(explanation),
        "explanation": explanation,
        "ranking_generated_at": generated_at,
    }


def _serialize_explanation(explanation: Any) -> dict[str, Any]:
    return {
        "summary": explanation.summary,
        "reasons": [
            {
                "code": reason.code.value,
                "skill_names": list(reason.skill_names),
                "score_name": reason.score_name,
                "score_value": reason.score_value,
            }
            for reason in explanation.reasons
        ],
        "score": {
            "hybrid_score": explanation.score.hybrid_score,
            "keyword_score": explanation.score.keyword_score,
            "semantic_score": explanation.score.semantic_score,
            "keyword_weight": explanation.score.keyword_weight,
            "semantic_weight": explanation.score.semantic_weight,
            "required_skill_coverage": explanation.score.required_skill_coverage,
            "preferred_skill_coverage": explanation.score.preferred_skill_coverage,
            "category_alignment": explanation.score.category_alignment,
            "missing_required_skill_penalty": explanation.score.missing_required_skill_penalty,
        },
        "skill_gap": {
            "severity": explanation.skill_gap.severity.value,
            "matched_required_skills": [_skill(item) for item in explanation.skill_gap.matched_required_skills],
            "matched_preferred_skills": [_skill(item) for item in explanation.skill_gap.matched_preferred_skills],
            "missing_required_skills": [_skill(item) for item in explanation.skill_gap.missing_required_skills],
            "missing_preferred_skills": [_skill(item) for item in explanation.skill_gap.missing_preferred_skills],
            "focus_skills": [_skill(item) for item in explanation.skill_gap.focus_skills],
        },
    }


def _safe_freelancer(application: dict[str, Any]) -> dict[str, Any]:
    profile = application.get("freelancer_profile") if isinstance(application.get("freelancer_profile"), dict) else {}
    user = application.get("safe_user_profile") if isinstance(application.get("safe_user_profile"), dict) else {}
    return {
        "display_name": user.get("full_name") or "Applicant",
        "headline": profile.get("headline"),
        "experience_level": profile.get("experience_level"),
        "location": profile.get("location"),
        "work_preference": profile.get("preferred_gig_type"),
        "skills": _strings(profile.get("skills"))[:8],
        "availability": profile.get("availability"),
    }


def _review_state_dto(application: dict[str, Any]) -> dict[str, Any]:
    state = application.get("review_state") if isinstance(application.get("review_state"), dict) else {}
    return {
        "is_shortlisted": bool(state.get("is_shortlisted")),
        "shortlisted_at": state.get("shortlisted_at") if state.get("is_shortlisted") else None,
        "review_state_version": int(state.get("review_state_version") or 0),
    }


def _review_event(event: dict[str, Any]) -> dict[str, Any]:
    payload = event.get("event_payload") if isinstance(event.get("event_payload"), dict) else {}
    safe_payload = {
        key: payload[key]
        for key in (
            "application_version_id",
            "version_number",
            "gig_version_id",
            "previous_stage",
            "new_stage",
            "additional_reasons",
            "feedback_points",
            "respectful_note",
            "other_explanation",
            "reopen_explanation",
        )
        if key in payload
    }
    return {
        "event_type": event.get("event_type"),
        "actor_type": event.get("actor_type"),
        "reason_origin": event.get("reason_origin"),
        "reason_code": event.get("reason_code"),
        "detail": safe_payload,
        "occurred_at": event.get("occurred_at"),
    }


def _owned_gig_context(gig: dict[str, Any]) -> dict[str, Any]:
    display = gig.get("current_version") if isinstance(gig.get("current_version"), dict) else {}
    material = gig.get("current_material_version") if isinstance(gig.get("current_material_version"), dict) else {}
    return {
        "gig_id": str(gig.get("id")),
        **_safe_gig_summary(_snapshot(display), str(gig.get("status") or "")),
        "lifecycle": gig.get("opportunity_lifecycle"),
        "intake": gig.get("application_intake"),
        "operational_state": gig.get("operational_state"),
        "current_display_version_number": int(display.get("version_number") or 0),
        "current_material_version_number": int(material.get("version_number") or 0),
    }


def _effective_request(application: dict[str, Any]) -> dict[str, Any] | None:
    now = datetime.now(timezone.utc)
    for request in application.get("selection_requests") or []:
        if not isinstance(request, dict) or request.get("status") != "pending":
            continue
        try:
            expires = datetime.fromisoformat(str(request.get("expires_at")).replace("Z", "+00:00"))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if expires > now:
            return request
    return None


def _is_shortlisted(application: dict[str, Any]) -> bool:
    state = application.get("review_state")
    return isinstance(state, dict) and state.get("is_shortlisted") is True


def _has_matching_input(profile: FreelancerMatchProfile) -> bool:
    return bool(
        profile.skills
        or profile.categories
        or profile.headline
        or profile.bio
        or profile.primary_role
        or profile.project_domain_text
    )


def _unavailable_evidence() -> dict[str, Any]:
    return {
        "ranking_status": "unavailable",
        "ranking_score": None,
        "keyword_score": None,
        "semantic_score": None,
        "hybrid_score": None,
        "ranking_unavailable_reason": RANKING_INPUT_UNAVAILABLE,
        "explanation": {},
    }


def _safe_proposal(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    blocked = {
        "email", "phone", "contact", "auth", "access_token", "service_role",
        "embedding", "raw_resume_text", "raw_semantic_text", "secret",
    }
    return {key: item for key, item in value.items() if key not in blocked}


def _preview(value: Any, limit: int = 240) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned if len(cleaned) <= limit else f"{cleaned[: limit - 1]}…"


def _strings(value: Any) -> list[str]:
    return [item for item in value if isinstance(item, str) and item.strip()] if isinstance(value, list) else []


def _skill(value: Any) -> dict[str, Any]:
    return {
        "skill_name": value.skill_name,
        "normalized_name": value.normalized_name,
        "category": value.category,
    }


def _strongest_evidence(explanation: dict[str, Any]) -> str | None:
    gap = explanation.get("skill_gap") if isinstance(explanation.get("skill_gap"), dict) else {}
    for key in ("matched_required_skills", "matched_preferred_skills"):
        values = gap.get(key)
        if isinstance(values, list) and values:
            name = values[0].get("skill_name") if isinstance(values[0], dict) else None
            if isinstance(name, str):
                return name
    summary = explanation.get("summary")
    return summary if isinstance(summary, str) else None


def _match_label(score: Any) -> str | None:
    if not isinstance(score, (int, float)) or isinstance(score, bool):
        return None
    if score >= 0.8:
        return "Strong Match"
    if score >= 0.6:
        return "Good Match"
    if score >= 0.4:
        return "Potential Match"
    return "Limited Match"


def _token(*values: Any) -> str:
    raw = "|".join("" if value is None else str(value) for value in values)
    return hashlib.sha256(raw.encode()).hexdigest()


def _epoch(value: Any) -> int:
    if not isinstance(value, str) or not value:
        return 0
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return int(parsed.timestamp())
    except ValueError:
        return 0


__all__ = [
    "build_applicant_detail",
    "build_applicant_list",
    "build_version_history",
    "review_actions",
    "review_decision_action_token",
    "shortlist_action_token",
]
