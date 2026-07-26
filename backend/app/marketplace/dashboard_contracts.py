"""Strict safe response contracts for the two workflow dashboards."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


AttentionKind = Literal[
    "updated_gig_response_required",
    "qa_response_required",
    "revision_request_response_required",
    "selection_response_required",
    "reconsideration_response_required",
    "engagement_response_required",
]
ApplicationStage = Literal[
    "under_review",
    "advanced",
    "confirmed",
    "not_selected",
    "withdrawn",
    "closed_gig_cancelled",
]
ActiveEngagementStatus = Literal[
    "confirmed",
    "kickoff_pending",
    "in_progress",
    "completion_pending",
    "cancellation_pending",
]


class StrictDashboardModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AttentionItem(StrictDashboardModel):
    action_kind: AttentionKind
    resource_id: str = Field(min_length=36, max_length=36)
    application_id: str | None = Field(default=None, min_length=36, max_length=36)
    gig_id: str = Field(min_length=36, max_length=36)
    gig_title: str = Field(min_length=1, max_length=240)
    deadline_at: str | None = None
    latest_activity_at: str


class AttentionCollection(StrictDashboardModel):
    items: list[AttentionItem]
    attention_action_count: int = Field(ge=0)
    attention_resource_count: int = Field(ge=0)
    limit: int = Field(ge=1, le=20)
    has_more: bool

    @model_validator(mode="after")
    def validate_counts(self) -> "AttentionCollection":
        if (
            len(self.items) > self.limit
            or self.attention_action_count < len(self.items)
            or self.attention_resource_count > self.attention_action_count
            or self.has_more != (self.attention_action_count > self.limit)
        ):
            raise ValueError("incoherent attention collection")
        return self


class ApplicationPreview(StrictDashboardModel):
    application_id: str = Field(min_length=36, max_length=36)
    gig_id: str = Field(min_length=36, max_length=36)
    gig_title: str = Field(min_length=1, max_length=240)
    stage: ApplicationStage
    application_version_number: int = Field(ge=1)
    updated_gig_response_required: bool
    qa_action_count: int = Field(ge=0)
    has_effective_selection_request: bool
    last_updated_at: str


class EngagementPreview(StrictDashboardModel):
    engagement_id: str = Field(min_length=36, max_length=36)
    gig_id: str = Field(min_length=36, max_length=36)
    application_id: str = Field(min_length=36, max_length=36)
    gig_title: str = Field(min_length=1, max_length=240)
    status: ActiveEngagementStatus
    lifecycle_version: int = Field(ge=1)
    confirmed_at: str
    latest_activity_at: str
    response_required: bool


class GigReviewPreview(StrictDashboardModel):
    gig_id: str = Field(min_length=36, max_length=36)
    gig_title: str = Field(min_length=1, max_length=240)
    product_state: str = Field(min_length=1, max_length=80)
    opportunity_lifecycle: Literal["draft", "active", "filled", "cancelled"]
    application_intake: Literal["accepting", "closed"]
    operational_state: Literal["active", "paused"]
    under_review_count: int = Field(ge=0)
    advanced_count: int = Field(ge=0)
    internal_shortlist_count: int = Field(ge=0)
    client_qa_action_count: int = Field(ge=0)
    has_effective_selection_request: bool
    latest_application_activity_at: str | None = None


class SelectionPreview(StrictDashboardModel):
    selection_request_id: str = Field(min_length=36, max_length=36)
    application_id: str = Field(min_length=36, max_length=36)
    gig_id: str = Field(min_length=36, max_length=36)
    gig_title: str = Field(min_length=1, max_length=240)
    created_at: str
    expires_at: str


class PreviewCollection(StrictDashboardModel):
    items: list[dict[str, Any]]
    total: int = Field(ge=0)
    limit: int = Field(ge=1, le=20)
    has_more: bool

    @model_validator(mode="after")
    def validate_counts(self) -> "PreviewCollection":
        if (
            len(self.items) > self.limit
            or self.total < len(self.items)
            or self.has_more != (self.total > self.limit)
        ):
            raise ValueError("incoherent preview collection")
        return self


class FreelancerSummary(StrictDashboardModel):
    total_applications: int = Field(ge=0)
    under_review_applications: int = Field(ge=0)
    advanced_applications: int = Field(ge=0)
    response_required_applications: int = Field(ge=0)
    effective_selection_requests: int = Field(ge=0)
    active_engagements: int = Field(ge=0)


class ClientSummary(StrictDashboardModel):
    active_owned_gigs: int = Field(ge=0)
    active_applications: int = Field(ge=0)
    under_review_applications: int = Field(ge=0)
    advanced_applications: int = Field(ge=0)
    shortlisted_applications: int = Field(ge=0)
    effective_selection_requests: int = Field(ge=0)
    active_engagements: int = Field(ge=0)


class FreelancerDashboardResponse(StrictDashboardModel):
    authoritative_now: str
    summary: FreelancerSummary
    attention: AttentionCollection
    recent_applications: PreviewCollection
    active_engagements: PreviewCollection

    @model_validator(mode="after")
    def validate_previews(self) -> "FreelancerDashboardResponse":
        self.recent_applications.items = [
            ApplicationPreview.model_validate(item).model_dump()
            for item in self.recent_applications.items
        ]
        self.active_engagements.items = [
            EngagementPreview.model_validate(item).model_dump()
            for item in self.active_engagements.items
        ]
        if (
            self.summary.total_applications != self.recent_applications.total
            or self.summary.active_engagements != self.active_engagements.total
        ):
            raise ValueError("summary and preview totals disagree")
        return self


class ClientDashboardResponse(StrictDashboardModel):
    authoritative_now: str
    summary: ClientSummary
    attention: AttentionCollection
    gig_review_overview: PreviewCollection
    pending_selection_requests: PreviewCollection
    active_engagements: PreviewCollection

    @model_validator(mode="after")
    def validate_previews(self) -> "ClientDashboardResponse":
        self.gig_review_overview.items = [
            GigReviewPreview.model_validate(item).model_dump()
            for item in self.gig_review_overview.items
        ]
        self.pending_selection_requests.items = [
            SelectionPreview.model_validate(item).model_dump()
            for item in self.pending_selection_requests.items
        ]
        self.active_engagements.items = [
            EngagementPreview.model_validate(item).model_dump()
            for item in self.active_engagements.items
        ]
        if (
            self.summary.effective_selection_requests
            != self.pending_selection_requests.total
            or self.summary.active_engagements != self.active_engagements.total
        ):
            raise ValueError("summary and preview totals disagree")
        return self


FORBIDDEN_DASHBOARD_KEYS = {
    "action_token",
    "accepted_terms",
    "accepted_terms_snapshot",
    "contact",
    "contact_mask",
    "contact_value",
    "cover_note",
    "event_payload",
    "message_body",
    "proposal",
    "proposal_snapshot",
    "question_body",
    "response_token",
    "send_token",
}


def assert_dashboard_payload_safe(value: Any) -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = str(key).lower()
            if normalized in FORBIDDEN_DASHBOARD_KEYS or normalized.endswith("_token"):
                raise ValueError("dashboard payload contains a forbidden field")
            assert_dashboard_payload_safe(item)
    elif isinstance(value, list):
        for item in value:
            assert_dashboard_payload_safe(item)


__all__ = [
    "ClientDashboardResponse",
    "FreelancerDashboardResponse",
    "assert_dashboard_payload_safe",
]
