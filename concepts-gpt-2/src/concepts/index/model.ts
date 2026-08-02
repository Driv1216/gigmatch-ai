import { APPLICANTS, GIGS } from "../../domain/fixtures";

export type IndexAxis = "evidence" | "gap" | "availability" | "version" | "commercial";

export function indexApplicantRows(axis: IndexAxis = "evidence") {
  const rows = APPLICANTS.map((person) => ({
    id: person.id,
    name: person.name,
    evidence: person.match,
    gap: person.gap,
    availability: person.availability,
    version: person.version,
    commercial: person.proposal,
  }));
  if (axis === "evidence") return rows.sort((a, b) => b.evidence - a.evidence);
  if (axis === "version") return rows.sort((a, b) => b.version - a.version);
  if (axis === "availability") return rows.sort((a, b) => a.availability.localeCompare(b.availability));
  if (axis === "commercial") return rows.sort((a, b) => a.commercial.localeCompare(b.commercial));
  return rows.sort((a, b) => a.gap.localeCompare(b.gap));
}

export function indexOpportunityRows() {
  return GIGS.map((gig) => ({
    id: gig.id,
    company: gig.company,
    title: gig.title,
    evidence: gig.match,
    gap: gig.missingSkills[0],
    commitment: gig.commitment,
    commercial: gig.budget,
    deadline: gig.deadline,
  })).sort((a, b) => b.evidence - a.evidence);
}

export function changedFacets(version: number) {
  return [
    { label: "Evidence", changed: false, value: "92 / reviewed" },
    { label: "Fixed proposal", changed: version > 1, value: "₹5.8L" },
    { label: "Workshops", changed: version > 1, value: "Four included" },
    { label: "Availability", changed: false, value: "10 Aug · 28h/week" },
    { label: "Application", changed: true, value: `v${version}` },
  ];
}

export function evidenceRankUnaffectedByCommercial() {
  return indexApplicantRows("evidence").map((row) => row.id);
}
