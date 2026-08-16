import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { GigSelect } from "../components/GigSelect";
import { useAuth } from "../context/AuthContext";
import { profileWorkspaceState } from "../lib/profileParsingView";
import {
  arrayToCsv,
  csvToArray,
  emptyToNull,
  fetchFreelancerProfile,
  saveFreelancerProfile,
  type Availability,
  type ExperienceLevel,
  type FreelancerProfile,
  type PreferredGigType,
} from "../lib/profiles";

type FreelancerProfileForm = {
  headline: string;
  bio: string;
  location: string;
  experienceLevel: "" | ExperienceLevel;
  primaryRole: string;
  techCategories: string;
  skills: string;
  tools: string;
  projectLinks: string;
  githubUrl: string;
  portfolioUrl: string;
  linkedinUrl: string;
  availability: "" | Availability;
  preferredGigType: "" | PreferredGigType;
};

const emptyForm: FreelancerProfileForm = {
  headline: "",
  bio: "",
  location: "",
  experienceLevel: "",
  primaryRole: "",
  techCategories: "",
  skills: "",
  tools: "",
  projectLinks: "",
  githubUrl: "",
  portfolioUrl: "",
  linkedinUrl: "",
  availability: "",
  preferredGigType: "",
};

const experienceOptions = ["beginner", "intermediate", "advanced"].map((value) => ({ value: value as ExperienceLevel, label: value[0].toUpperCase() + value.slice(1) }));
const availabilityOptions = ["available", "limited", "unavailable"].map((value) => ({ value: value as Availability, label: value[0].toUpperCase() + value.slice(1) }));
const preferredGigTypeOptions: Array<{ value: PreferredGigType; label: string }> = [
  { value: "short_term", label: "Short term" },
  { value: "long_term", label: "Long term" },
  { value: "internship", label: "Internship" },
  { value: "part_time", label: "Part time" },
  { value: "any", label: "Any" },
];

function formFromProfile(profile: FreelancerProfile): FreelancerProfileForm {
  return {
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    experienceLevel: profile.experience_level ?? "",
    primaryRole: profile.primary_role ?? "",
    techCategories: arrayToCsv(profile.tech_categories),
    skills: arrayToCsv(profile.skills),
    tools: arrayToCsv(profile.tools),
    projectLinks: arrayToCsv(profile.project_links),
    githubUrl: profile.github_url ?? "",
    portfolioUrl: profile.portfolio_url ?? "",
    linkedinUrl: profile.linkedin_url ?? "",
    availability: profile.availability ?? "",
    preferredGigType: profile.preferred_gig_type ?? "",
  };
}

export function FreelancerProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FreelancerProfileForm>(emptyForm);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const workspaceState = profileWorkspaceState(isLoading, errorMessage, hasExistingProfile);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (!user) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const profile = await fetchFreelancerProfile(user.id);
        if (!isMounted) return;
        setForm(profile ? formFromProfile(profile) : emptyForm);
        setHasExistingProfile(Boolean(profile));
      } catch (error) {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "Unable to load your freelancer profile.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [user]);

  function updateField<Key extends keyof FreelancerProfileForm>(key: Key, value: FreelancerProfileForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await saveFreelancerProfile({
        user_id: user.id,
        headline: emptyToNull(form.headline),
        bio: emptyToNull(form.bio),
        location: emptyToNull(form.location),
        experience_level: form.experienceLevel || null,
        primary_role: emptyToNull(form.primaryRole),
        tech_categories: csvToArray(form.techCategories),
        skills: csvToArray(form.skills),
        tools: csvToArray(form.tools),
        project_links: csvToArray(form.projectLinks),
        github_url: emptyToNull(form.githubUrl),
        portfolio_url: emptyToNull(form.portfolioUrl),
        linkedin_url: emptyToNull(form.linkedinUrl),
        availability: form.availability || null,
        preferred_gig_type: form.preferredGigType || null,
      }, hasExistingProfile);
      setHasExistingProfile(true);
      setSuccessMessage("Freelancer profile saved. Your reviewed resume parse was not changed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your freelancer profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="stage-ten-page profile-source-page">
      <header className="stage-ten-hero">
        <div>
          <p>PROFILE / PARTICIPANT-MAINTAINED SOURCE</p>
          <h1>Shape the record you maintain.</h1>
          <span>These fields are self-maintained profile information. They are not identity checks, certifications, or externally verified claims.</span>
        </div>
        <div className="stage-ten-hero-meta">
          <span>Workspace state</span>
          <strong>{isSaving ? "Saving profile" : workspaceState}</strong>
          <small>Freelancer-only route · profile write boundary</small>
          <Button to="/dashboard/freelancer" variant="secondary">Back to dashboard</Button>
        </div>
      </header>

      <ol className="stage-ten-sequence" aria-label="Freelancer matching input relationship">
        <li className="is-active"><span>01</span><strong>Profile source</strong><small>Maintained here</small></li>
        <li><span>02</span><strong>Resume review</strong><small>Separate workspace</small></li>
        <li><span>03</span><strong>Normalization</strong><small>Backend builder</small></li>
        <li><span>04</span><strong>Matching input</strong><small>No score preview</small></li>
      </ol>

      {isLoading ? (
        <section className="stage-ten-state" aria-live="polite"><span>Loading</span><h2>Opening your profile source.</h2><p>The saved record is being read before the editor is shown.</p></section>
      ) : (
        <div className="stage-ten-workspace-grid">
          <form className="stage-ten-editor" onSubmit={handleSubmit}>
            <header>
              <div><span>Source / profile</span><h2>Professional profile</h2></div>
              <p>{hasExistingProfile ? "Saved record loaded" : "No saved profile yet"}</p>
            </header>

            <section className="stage-ten-form-section">
              <div className="stage-ten-section-heading"><span>01 / Positioning</span><p>Participant-authored summary and role context.</p></div>
              <div className="stage-ten-form-grid">
                <label className="is-wide"><span>Headline</span><input value={form.headline} onChange={(event) => updateField("headline", event.target.value)} /></label>
                <label className="is-wide"><span>Bio</span><textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={6} /></label>
                <label><span>Location</span><input value={form.location} onChange={(event) => updateField("location", event.target.value)} /></label>
                <label><span>Experience level</span><GigSelect value={form.experienceLevel} onValueChange={(value) => updateField("experienceLevel", value)} options={experienceOptions} placeholder="Select level" /></label>
                <label><span>Primary role</span><input value={form.primaryRole} onChange={(event) => updateField("primaryRole", event.target.value)} /></label>
                <label><span>Tech categories</span><input value={form.techCategories} onChange={(event) => updateField("techCategories", event.target.value)} /><small>Comma-separated</small></label>
              </div>
            </section>

            <section className="stage-ten-form-section">
              <div className="stage-ten-section-heading"><span>02 / Evidence fields</span><p>Lists are normalized with a supported reviewed resume parse by the matching builder.</p></div>
              <div className="stage-ten-form-grid">
                <label><span>Skills</span><input value={form.skills} onChange={(event) => updateField("skills", event.target.value)} /><small>Comma-separated</small></label>
                <label><span>Tools</span><input value={form.tools} onChange={(event) => updateField("tools", event.target.value)} /><small>Comma-separated</small></label>
                <label className="is-wide"><span>Project links</span><input value={form.projectLinks} onChange={(event) => updateField("projectLinks", event.target.value)} /><small>Comma-separated</small></label>
                <label><span>GitHub URL</span><input type="url" value={form.githubUrl} onChange={(event) => updateField("githubUrl", event.target.value)} /></label>
                <label><span>Portfolio URL</span><input type="url" value={form.portfolioUrl} onChange={(event) => updateField("portfolioUrl", event.target.value)} /></label>
                <label><span>LinkedIn URL</span><input type="url" value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} /></label>
              </div>
            </section>

            <section className="stage-ten-form-section">
              <div className="stage-ten-section-heading"><span>03 / Work preferences</span><p>Availability and preferred gig type remain ordinary profile fields.</p></div>
              <div className="stage-ten-form-grid">
                <label><span>Availability</span><GigSelect value={form.availability} onValueChange={(value) => updateField("availability", value)} options={availabilityOptions} placeholder="Select availability" /></label>
                <label><span>Preferred gig type</span><GigSelect value={form.preferredGigType} onValueChange={(value) => updateField("preferredGigType", value)} options={preferredGigTypeOptions} placeholder="Select gig type" /></label>
              </div>
            </section>

            <div className="stage-ten-form-footer">
              <div aria-live="polite">
                {errorMessage ? <p className="stage-ten-notice is-error" role="alert">{errorMessage}</p> : null}
                {successMessage ? <p className="stage-ten-notice is-success">{successMessage}</p> : null}
              </div>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save freelancer profile"}</Button>
            </div>
          </form>

          <aside className="stage-ten-context-rail">
            <section className="is-glass">
              <span>Separate source</span><h2>Resume-derived input stays independent.</h2>
              <p>Reviewing or saving a resume parse does not rewrite these profile fields. Saving this form does not rewrite the resume parse.</p>
              <Button to="/profile/resume-parse" variant="secondary">Open resume review</Button>
            </section>
            <section>
              <span>Matching role</span><h2>Combined, with lineage.</h2>
              <p>The backend prefers structured profile text for headline, bio, primary role, and experience. It merges supported category, skill, tool, and project values with the selected parse and removes duplicates.</p>
              <p>No ranking request runs when this form is saved, and no ranking improvement is guaranteed.</p>
            </section>
            <section className="is-coral">
              <span>Privacy boundary</span><h2>Profile is not contact consent.</h2>
              <p>Profile URLs and location remain ordinary profile data. They do not become Stage 9 Secure Contact Exchange shares or reveal permissions.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
