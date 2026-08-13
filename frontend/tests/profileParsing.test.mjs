import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  profileWorkspaceState,
  reviewWorkspaceLabel,
  reviewWorkspaceState,
} from "../src/lib/profileParsingView.ts";
import {
  participantStageEightOwnsPath,
  participantStageFiveOwnsPath,
  participantStageFourOwnsPath,
  participantStageTenOwnsPath,
  participantStageThreeOwnsPath,
  participantStageTwoOwnsPath,
} from "../src/lib/participantNavigation.ts";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("profile workspaces distinguish loading, controlled error, missing, and ready records", () => {
  assert.equal(profileWorkspaceState(true, null, false), "loading");
  assert.equal(profileWorkspaceState(false, "failed", false), "error");
  assert.equal(profileWorkspaceState(false, null, false), "missing");
  assert.equal(profileWorkspaceState(false, null, true), "ready");
});

test("review workflow states keep source, extraction, edits, and saved review distinct", () => {
  const base = {
    isLoading: false,
    hasError: false,
    isExtracting: false,
    isSaving: false,
    hasSource: false,
    hasCandidate: false,
    candidateEdited: false,
    hasSavedParse: false,
  };
  assert.equal(reviewWorkspaceState(base), "no_source");
  assert.equal(reviewWorkspaceState({ ...base, hasSource: true }), "source_ready");
  assert.equal(reviewWorkspaceState({ ...base, hasSource: true, isExtracting: true }), "extracting");
  assert.equal(reviewWorkspaceState({ ...base, hasSource: true, hasCandidate: true }), "candidate_extracted");
  assert.equal(reviewWorkspaceState({ ...base, hasSource: true, hasCandidate: true, candidateEdited: true }), "candidate_edited");
  assert.equal(reviewWorkspaceState({ ...base, hasSavedParse: true }), "saved_reviewed");
  assert.equal(reviewWorkspaceState({ ...base, hasError: true, hasSavedParse: true }), "error");
  assert.equal(reviewWorkspaceLabel("candidate_extracted"), "Candidate extracted");
  assert.equal(reviewWorkspaceLabel("saved_reviewed"), "Saved reviewed input");
});

test("all Stage 10 routes remain lazy, authenticated, and role-isolated", () => {
  const app = read("../src/App.tsx");
  for (const page of ["FreelancerProfilePage", "ClientProfilePage", "ResumeParsePage", "GigParsePage"]) {
    assert.match(app, new RegExp(`const ${page} = lazy\\(`));
  }
  assert.match(app, /path="\/profile\/freelancer"[^\n]+allowedRole="freelancer"/);
  assert.match(app, /path="\/profile\/resume-parse"[^\n]+allowedRole="freelancer"/);
  assert.match(app, /path="\/profile\/client"[^\n]+allowedRole="client"/);
  assert.match(app, /path="\/gigs\/:id\/parse"[^\n]+allowedRole="client"/);
});

test("Stage 10 ownership is narrow and prior stage ownership remains unchanged", () => {
  for (const path of ["/profile/freelancer", "/profile/client", "/profile/resume-parse", "/gigs/gig-1/parse"]) {
    assert.equal(participantStageTenOwnsPath(path), true, path);
  }
  for (const path of ["/gigs", "/gigs/gig-1", "/gigs/new", "/gigs/manage", "/gigs/gig-1/edit", "/applications", "/engagements", "/dashboard/admin", "/login", "/signup"]) {
    assert.equal(participantStageTenOwnsPath(path), false, path);
  }
  assert.equal(participantStageTwoOwnsPath("/gigs/gig-1"), true);
  assert.equal(participantStageThreeOwnsPath("/gigs/gig-1/edit"), true);
  assert.equal(participantStageFourOwnsPath("/applications/app-1"), true);
  assert.equal(participantStageFiveOwnsPath("/gigs/gig-1/applicants"), true);
  assert.equal(participantStageEightOwnsPath("/engagements/eng-1"), true);
});

test("profile forms preserve the exact schema fields and keep profile and parse writes separate", () => {
  const freelancer = read("../src/pages/FreelancerProfilePage.tsx");
  const client = read("../src/pages/ClientProfilePage.tsx");
  const profiles = read("../src/lib/profiles.ts");

  for (const field of ["headline", "bio", "location", "experience_level", "primary_role", "tech_categories", "skills", "tools", "project_links", "github_url", "portfolio_url", "linkedin_url", "availability", "preferred_gig_type"]) {
    assert.match(freelancer, new RegExp(field));
  }
  for (const field of ["company_name", "contact_name", "website_url", "industry", "company_size", "hiring_focus", "bio"]) {
    assert.match(client, new RegExp(field));
  }
  assert.match(profiles, /from\("freelancer_profiles"\)/);
  assert.match(profiles, /from\("client_profiles"\)/);
  assert.doesNotMatch(profiles, /resume_parses|gig_parses/);
  assert.doesNotMatch(freelancer + client, /saveResumeParse|saveGigParse|createGig|updateGig/);
  assert.doesNotMatch(freelancer + client, /Verified by AI|AI-verified|completion score/i);
});

test("resume workflow preserves paste and transient PDF/DOCX upload contracts", () => {
  const page = read("../src/pages/ResumeParsePage.tsx");
  const helper = read("../src/lib/resumeParses.ts");
  assert.match(page, /type="file" accept="\.pdf,\.docx"/);
  assert.match(page, /5 \* 1024 \* 1024/);
  assert.match(page, /value=\{resumeText\}/);
  assert.match(helper, /FormData\(\)/);
  assert.match(helper, /\/parsing\/resume\/extract-document/);
  assert.match(helper, /\/parsing\/extract-skills/);
  assert.match(page, /warnings\.map/);
  assert.match(page, /setHasCandidate\(true\)/);
  assert.match(page, /setCandidateEdited\(true\)/);
  assert.match(page, /fetchResumeParse\(user\.id\)/);
  assert.doesNotMatch(page + helper, /localStorage\.|sessionStorage\.|indexedDB\.|supabase\.storage|storage\.from\(|createApplication\(/i);
  assert.doesNotMatch(page, /saveFreelancerProfile/);
});

test("gig parse save stays separate from published gig, version, lifecycle, application, and selection mutations", () => {
  const page = read("../src/pages/GigParsePage.tsx");
  const helper = read("../src/lib/gigParses.ts");
  assert.match(page, /fetchGigForClient\(id, user\.id\)/);
  assert.match(page, /saveGigParse\(input, Boolean\(savedParse\)\)/);
  assert.match(page, /fetchGigParse\(gig\.id\)/);
  assert.match(helper, /from\("gig_parses"\)/);
  assert.doesNotMatch(helper, /from\("gigs"\)|gig_versions|applications|selection_requests/);
  assert.doesNotMatch(page, /createGig|updateGig|publishManagedGig|previewManagedGigEdit|selection.*action|application.*mutation/i);
  assert.match(page, /Edit through gig authority/);
});

test("matching explanation is source-aware without score fabrication or proposal-price suitability", () => {
  const profile = read("../src/pages/FreelancerProfilePage.tsx");
  const resume = read("../src/pages/ResumeParsePage.tsx");
  const gig = read("../src/pages/GigParsePage.tsx");
  const combined = profile + resume + gig;
  assert.match(resume, /prefers reviewed parses over parsed candidates/);
  assert.match(resume, /excludes failed parses/);
  assert.match(gig, /Structured gig title, description, category, difficulty, status/);
  assert.match(gig, /Price and proposal terms do not enter suitability ranking/);
  assert.doesNotMatch(combined, /<button[^>]*>[^<]*(?:score preview|rerank)|increases score by|guarantee(?:s|d)? better ranking|verified by AI/i);
});

test("raw parser source remains confined to the owner workflows", () => {
  const unrelated = [
    "../src/pages/FreelancerDashboardPage.tsx",
    "../src/pages/ClientDashboardPage.tsx",
    "../src/pages/ApplicationDetailPage.tsx",
    "../src/pages/ClientApplicantDetailPage.tsx",
    "../src/pages/GigDiscoveryPage.tsx",
    "../src/components/ParticipantCommandSurface.tsx",
  ].map(read).join("\n");
  assert.doesNotMatch(unrelated, /raw_resume_text|extracted_text_preview|resumeText|raw_gig_parse/);
});
