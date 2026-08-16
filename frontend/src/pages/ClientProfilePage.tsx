import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { GigSelect } from "../components/GigSelect";
import { useAuth } from "../context/AuthContext";
import { profileWorkspaceState } from "../lib/profileParsingView";
import { arrayToCsv, csvToArray, emptyToNull, fetchClientProfile, saveClientProfile, type ClientProfile, type CompanySize } from "../lib/profiles";

type ClientProfileForm = { companyName: string; contactName: string; websiteUrl: string; industry: string; companySize: "" | CompanySize; hiringFocus: string; bio: string };
const emptyForm: ClientProfileForm = { companyName: "", contactName: "", websiteUrl: "", industry: "", companySize: "", hiringFocus: "", bio: "" };
const companySizeOptions = ["solo", "small", "medium", "large", "enterprise"].map((value) => ({ value: value as CompanySize, label: value[0].toUpperCase() + value.slice(1) }));

function formFromProfile(profile: ClientProfile): ClientProfileForm {
  return { companyName: profile.company_name ?? "", contactName: profile.contact_name ?? "", websiteUrl: profile.website_url ?? "", industry: profile.industry ?? "", companySize: profile.company_size ?? "", hiringFocus: arrayToCsv(profile.hiring_focus), bio: profile.bio ?? "" };
}

export function ClientProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ClientProfileForm>(emptyForm);
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
      setIsLoading(true); setErrorMessage(null);
      try {
        const profile = await fetchClientProfile(user.id);
        if (!isMounted) return;
        setForm(profile ? formFromProfile(profile) : emptyForm);
        setHasExistingProfile(Boolean(profile));
      } catch (error) {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "Unable to load your client profile.");
      } finally { if (isMounted) setIsLoading(false); }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [user]);

  function updateField<Key extends keyof ClientProfileForm>(key: Key, value: ClientProfileForm[Key]) {
    setForm((current) => ({ ...current, [key]: value })); setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      await saveClientProfile({ user_id: user.id, company_name: emptyToNull(form.companyName), contact_name: emptyToNull(form.contactName), website_url: emptyToNull(form.websiteUrl), industry: emptyToNull(form.industry), company_size: form.companySize || null, hiring_focus: csvToArray(form.hiringFocus), bio: emptyToNull(form.bio) }, hasExistingProfile);
      setHasExistingProfile(true);
      setSuccessMessage("Client profile saved. Gig terms and reviewed gig parses were not changed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save your client profile.");
    } finally { setIsSaving(false); }
  }

  return (
    <div className="stage-ten-page profile-source-page">
      <header className="stage-ten-hero">
        <div><p>PROFILE / COMPANY-MAINTAINED SOURCE</p><h1>Describe the company behind the work.</h1><span>This workspace records company context supplied by the client. It does not assert external company verification.</span></div>
        <div className="stage-ten-hero-meta"><span>Workspace state</span><strong>{isSaving ? "Saving profile" : workspaceState}</strong><small>Client-only route · profile write boundary</small><Button to="/dashboard/client" variant="secondary">Back to dashboard</Button></div>
      </header>

      <ol className="stage-ten-sequence" aria-label="Client profile data relationship">
        <li className="is-active"><span>01</span><strong>Company source</strong><small>Maintained here</small></li>
        <li><span>02</span><strong>Gig terms</strong><small>Separate authority</small></li>
        <li><span>03</span><strong>Gig parse</strong><small>Separate review</small></li>
        <li><span>04</span><strong>Matching input</strong><small>Gig sources only</small></li>
      </ol>

      {isLoading ? <section className="stage-ten-state" aria-live="polite"><span>Loading</span><h2>Opening your company source.</h2><p>The saved record is being read before the editor is shown.</p></section> : (
        <div className="stage-ten-workspace-grid">
          <form className="stage-ten-editor" onSubmit={handleSubmit}>
            <header><div><span>Source / company profile</span><h2>Company profile</h2></div><p>{hasExistingProfile ? "Saved record loaded" : "No saved profile yet"}</p></header>
            <section className="stage-ten-form-section">
              <div className="stage-ten-section-heading"><span>01 / Organization</span><p>Client-maintained company and hiring context.</p></div>
              <div className="stage-ten-form-grid">
                <label><span>Company name</span><input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} /></label>
                <label><span>Contact name</span><input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} /><small>Ordinary profile field, not contact-share consent</small></label>
                <label><span>Website URL</span><input type="url" value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} /></label>
                <label><span>Industry</span><input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} /></label>
                <label><span>Company size</span><GigSelect value={form.companySize} onValueChange={(value) => updateField("companySize", value)} options={companySizeOptions} placeholder="Select size" /></label>
                <label><span>Hiring focus</span><input value={form.hiringFocus} onChange={(event) => updateField("hiringFocus", event.target.value)} /><small>Comma-separated</small></label>
                <label className="is-wide"><span>Bio</span><textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={7} /></label>
              </div>
            </section>
            <div className="stage-ten-form-footer">
              <div aria-live="polite">{errorMessage ? <p className="stage-ten-notice is-error" role="alert">{errorMessage}</p> : null}{successMessage ? <p className="stage-ten-notice is-success">{successMessage}</p> : null}</div>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save client profile"}</Button>
            </div>
          </form>

          <aside className="stage-ten-context-rail">
            <section className="is-glass"><span>Separate authority</span><h2>This is not a gig editor.</h2><p>Company profile changes do not revise published gig terms, create gig versions, or alter lifecycle and intake state.</p><Button to="/gigs/manage" variant="secondary">Open gig management</Button></section>
            <section><span>Matching role</span><h2>Gig sources drive gig matching input.</h2><p>The current matching builder combines authoritative gig data with the selected supported gig parse. It does not use this client profile as a substitute for gig requirements.</p><p>No score or rerank is produced by saving this profile.</p></section>
            <section className="is-coral"><span>Contact boundary</span><h2>Profile data is not a consented reveal.</h2><p>The contact name and website here remain ordinary client-profile fields. Stage 9 contact methods, consent directions, reveal, hide, and revocation remain separate.</p></section>
          </aside>
        </div>
      )}
    </div>
  );
}
