export type SafeClientSummary = {
  display_name: string;
  company_name: string | null;
  company_summary: string | null;
  industry: string | null;
};

export type StructuredRange = {
  minimum: number | null;
  maximum: number | null;
  unit: string | null;
};

export type DurationSummary = {
  mode: string | null;
  unit: string | null;
  exact_value: number | null;
  minimum: number | null;
  maximum: number | null;
};

export type PaymentSummary = {
  payment_structure: "fixed_price" | "hourly" | "open_to_proposals";
  currency: string;
  budget: StructuredRange | null;
  budget_flexibility: string | null;
  hourly_rate: StructuredRange | null;
  weekly_commitment: StructuredRange | null;
  engagement_duration: DurationSummary | null;
  guidance_type: string | null;
  guidance_range: StructuredRange | null;
  maximum_budget: number | null;
  no_estimate_explanation: string | null;
  preferred_proposal_form: string | null;
};

export type GigSummary = {
  gig_id: string;
  title: string;
  published_summary: string;
  category: string;
  product_state: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_requirement: string;
  work_mode: string;
  location_requirement: string | null;
  payment: PaymentSummary;
  application_deadline: string;
  published_at: string;
  accepting_applications: boolean;
  client: SafeClientSummary;
};

export type GigDetail = GigSummary & {
  response_kind: "detail";
  description: string;
  deliverables: string[];
  expected_weekly_commitment: StructuredRange | null;
  expected_duration: DurationSummary | null;
  project_deadline: string | null;
  availability_reason: string;
  material_updated_at: string;
};

export type GigTombstone = {
  response_kind: "tombstone";
  gig_id: string;
  title: string;
  product_state: "filled" | "cancelled";
  message: string;
};

export type GigDetailResponse = GigDetail | GigTombstone;

export type GigDiscoveryEnvelope = {
  items: GigSummary[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

export function isGigDiscoveryEnvelope(value: unknown): value is GigDiscoveryEnvelope {
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isGigSummary)) {
    return false;
  }
  const pagination = value.pagination;
  return isRecord(pagination) && [pagination.page, pagination.page_size, pagination.total_items, pagination.total_pages]
    .every((item) => typeof item === "number");
}

export function isGigDetailResponse(value: unknown): value is GigDetailResponse {
  if (!isRecord(value) || typeof value.response_kind !== "string") {
    return false;
  }
  if (value.response_kind === "tombstone") {
    return typeof value.gig_id === "string" && typeof value.title === "string" &&
      ["filled", "cancelled"].includes(String(value.product_state)) && typeof value.message === "string";
  }
  const detailRecord: Record<string, unknown> = value;
  return value.response_kind === "detail" && isGigSummary(value) && typeof detailRecord.description === "string" &&
    Array.isArray(detailRecord.deliverables) && typeof detailRecord.availability_reason === "string";
}

function isGigSummary(value: unknown): value is GigSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.gig_id === "string" &&
    typeof value.title === "string" &&
    typeof value.published_summary === "string" &&
    typeof value.category === "string" &&
    typeof value.product_state === "string" &&
    isStringArray(value.required_skills) &&
    isStringArray(value.preferred_skills) &&
    typeof value.experience_requirement === "string" &&
    typeof value.work_mode === "string" &&
    (value.location_requirement === null || typeof value.location_requirement === "string") &&
    isPaymentSummary(value.payment) &&
    typeof value.application_deadline === "string" &&
    typeof value.published_at === "string" &&
    typeof value.accepting_applications === "boolean" &&
    isSafeClient(value.client)
  );
}

function isPaymentSummary(value: unknown): value is PaymentSummary {
  return isRecord(value) && ["fixed_price", "hourly", "open_to_proposals"].includes(String(value.payment_structure)) &&
    typeof value.currency === "string";
}

function isSafeClient(value: unknown): value is SafeClientSummary {
  return isRecord(value) && typeof value.display_name === "string" &&
    isNullableString(value.company_name) && isNullableString(value.company_summary) && isNullableString(value.industry);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
