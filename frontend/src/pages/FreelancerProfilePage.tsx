import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
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

const inputClasses =
  "mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

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

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const profile = await fetchFreelancerProfile(user.id);

        if (!isMounted) {
          return;
        }

        if (profile) {
          setForm(formFromProfile(profile));
          setHasExistingProfile(true);
        } else {
          setForm(emptyForm);
          setHasExistingProfile(false);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load your freelancer profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function updateField<Key extends keyof FreelancerProfileForm>(key: Key, value: FreelancerProfileForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await saveFreelancerProfile(
        {
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
        },
        hasExistingProfile,
      );

      setHasExistingProfile(true);
      setSuccessMessage("Freelancer profile saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your freelancer profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Freelancer Profile</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Smart Profile Setup</h1>
          </div>
          <Button to="/dashboard/freelancer" variant="secondary">
            Back to Dashboard
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm font-medium text-muted">Loading your profile...</p>
        ) : (
          <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Headline</span>
                <input
                  value={form.headline}
                  onChange={(event) => updateField("headline", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  rows={5}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Location</span>
                <input
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Experience Level</span>
                <select
                  value={form.experienceLevel}
                  onChange={(event) => updateField("experienceLevel", event.target.value as FreelancerProfileForm["experienceLevel"])}
                  className={inputClasses}
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Primary Role</span>
                <input
                  value={form.primaryRole}
                  onChange={(event) => updateField("primaryRole", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Tech Categories</span>
                <input
                  value={form.techCategories}
                  onChange={(event) => updateField("techCategories", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Skills</span>
                <input
                  value={form.skills}
                  onChange={(event) => updateField("skills", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Tools</span>
                <input
                  value={form.tools}
                  onChange={(event) => updateField("tools", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-ink">Project Links</span>
                <input
                  value={form.projectLinks}
                  onChange={(event) => updateField("projectLinks", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">GitHub URL</span>
                <input
                  type="url"
                  value={form.githubUrl}
                  onChange={(event) => updateField("githubUrl", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Portfolio URL</span>
                <input
                  type="url"
                  value={form.portfolioUrl}
                  onChange={(event) => updateField("portfolioUrl", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">LinkedIn URL</span>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(event) => updateField("linkedinUrl", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Availability</span>
                <select
                  value={form.availability}
                  onChange={(event) => updateField("availability", event.target.value as FreelancerProfileForm["availability"])}
                  className={inputClasses}
                >
                  <option value="">Select availability</option>
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Preferred Gig Type</span>
                <select
                  value={form.preferredGigType}
                  onChange={(event) =>
                    updateField("preferredGigType", event.target.value as FreelancerProfileForm["preferredGigType"])
                  }
                  className={inputClasses}
                >
                  <option value="">Select gig type</option>
                  <option value="short_term">Short term</option>
                  <option value="long_term">Long term</option>
                  <option value="internship">Internship</option>
                  <option value="part_time">Part time</option>
                  <option value="any">Any</option>
                </select>
              </label>
            </div>

            {errorMessage ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Freelancer Profile"}
            </Button>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
