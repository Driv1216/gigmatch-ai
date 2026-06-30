import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import {
  arrayToCsv,
  csvToArray,
  emptyToNull,
  fetchClientProfile,
  saveClientProfile,
  type ClientProfile,
  type CompanySize,
} from "../lib/profiles";

type ClientProfileForm = {
  companyName: string;
  contactName: string;
  websiteUrl: string;
  industry: string;
  companySize: "" | CompanySize;
  hiringFocus: string;
  bio: string;
};

const emptyForm: ClientProfileForm = {
  companyName: "",
  contactName: "",
  websiteUrl: "",
  industry: "",
  companySize: "",
  hiringFocus: "",
  bio: "",
};

const inputClasses =
  "mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100";

function formFromProfile(profile: ClientProfile): ClientProfileForm {
  return {
    companyName: profile.company_name ?? "",
    contactName: profile.contact_name ?? "",
    websiteUrl: profile.website_url ?? "",
    industry: profile.industry ?? "",
    companySize: profile.company_size ?? "",
    hiringFocus: arrayToCsv(profile.hiring_focus),
    bio: profile.bio ?? "",
  };
}

export function ClientProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ClientProfileForm>(emptyForm);
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
        const profile = await fetchClientProfile(user.id);

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
          setErrorMessage(error instanceof Error ? error.message : "Unable to load your client profile.");
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

  function updateField<Key extends keyof ClientProfileForm>(key: Key, value: ClientProfileForm[Key]) {
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
      await saveClientProfile(
        {
          user_id: user.id,
          company_name: emptyToNull(form.companyName),
          contact_name: emptyToNull(form.contactName),
          website_url: emptyToNull(form.websiteUrl),
          industry: emptyToNull(form.industry),
          company_size: form.companySize || null,
          hiring_focus: csvToArray(form.hiringFocus),
          bio: emptyToNull(form.bio),
        },
        hasExistingProfile,
      );

      setHasExistingProfile(true);
      setSuccessMessage("Client profile saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your client profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client Profile</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-ink">Company Profile Setup</h1>
          </div>
          <Button to="/dashboard/client" variant="secondary">
            Back to Dashboard
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-sm font-medium text-muted">Loading your profile...</p>
        ) : (
          <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Company Name</span>
                <input
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Contact Name</span>
                <input
                  value={form.contactName}
                  onChange={(event) => updateField("contactName", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Website URL</span>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(event) => updateField("websiteUrl", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Industry</span>
                <input
                  value={form.industry}
                  onChange={(event) => updateField("industry", event.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Company Size</span>
                <select
                  value={form.companySize}
                  onChange={(event) => updateField("companySize", event.target.value as ClientProfileForm["companySize"])}
                  className={inputClasses}
                >
                  <option value="">Select size</option>
                  <option value="solo">Solo</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Hiring Focus</span>
                <input
                  value={form.hiringFocus}
                  onChange={(event) => updateField("hiringFocus", event.target.value)}
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
              {isSaving ? "Saving..." : "Save Client Profile"}
            </Button>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
