import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Newspaper, FileText, Search, Filter, CheckCircle2, XCircle,
  PlusCircle, ArrowUpRight, Award, Clock, MapPin, Building2,
  DollarSign, Sparkles, UserCheck, ChevronRight, SlidersHorizontal,
  Printer, Bookmark, Check, ShieldCheck, Briefcase, RefreshCw, Send
} from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Broadsheet: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'frontpage' | 'resume_report' | 'classified_desk' | 'financial_eval'>('frontpage');
  const [selectedGigId, setSelectedGigId] = useState<string>(gigs[0]?.id || 'gig-201');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Resume Parser State
  const [resumeText, setResumeText] = useState<string>(freelancers[0]?.parsed_resume_text || `SUMMARY: Senior Full-Stack AI Developer with 8 years of experience building high-throughput web applications and semantic matching engines. Expert in Python, FastAPI, React 19, TypeScript, PyTorch, Supabase, PostgreSQL. Developed custom sentence-transformer embedding models for talent matching systems.`);
  const [parsingStep, setParsingStep] = useState<number>(0);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [extractedProfile, setExtractedProfile] = useState<FreelancerProfile | null>(freelancers[0] || null);

  // Gig Posting Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCompany, setNewCompany] = useState<string>('Vanguard Press Labs');
  const [newCategory, setNewCategory] = useState<string>('Software Engineering');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSkills, setNewSkills] = useState<string>('React, TypeScript, FastAPI, PostgreSQL');
  const [newBudgetMin, setNewBudgetMin] = useState<number>(85);
  const [newBudgetMax, setNewBudgetMax] = useState<number>(125);
  const [newWorkMode, setNewWorkMode] = useState<'Remote' | 'Hybrid' | 'Onsite'>('Remote');
  const [postSuccessMsg, setPostSuccessMsg] = useState<string>('');

  // Application Proposal Modal / Form state
  const [applyingGig, setApplyingGig] = useState<Gig | null>(null);
  const [proposalText, setProposalText] = useState<string>('');
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  // Selected Lead Gig object
  const leadGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  // Category Options
  const categories = ['All', 'AI & Machine Learning', 'Frontend Engineering', 'Backend Architecture', 'Full-Stack Engineering', 'Data Science & NLP'];

  // Filtered Gigs
  const filteredGigs = gigs.filter(gig => {
    const matchesSearch = gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gig.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gig.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || gig.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Resume Parsing Handler
  const handleParseResume = () => {
    setIsParsing(true);
    setParsingStep(1);
    setTimeout(() => setParsingStep(2), 400);
    setTimeout(() => setParsingStep(3), 800);
    setTimeout(() => {
      setParsingStep(4);
      setIsParsing(false);
      setExtractedProfile({
        ...freelancers[0],
        parsed_resume_text: resumeText,
        parsed_at: new Date().toISOString(),
      });
    }, 1200);
  };

  // Gig Submission Handler
  const handlePostGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onPostGig({
      title: newTitle,
      client_company: newCompany,
      category: newCategory,
      description: newDescription,
      required_skills: newSkills.split(',').map(s => s.trim()).filter(Boolean),
      budget_min: Number(newBudgetMin),
      budget_max: Number(newBudgetMax),
      work_mode: newWorkMode,
    });

    setPostSuccessMsg(`Announcement "${newTitle}" successfully published to the Gazette!`);
    setNewTitle('');
    setNewDescription('');
    setTimeout(() => setPostSuccessMsg(''), 4000);
  };

  // Submit Application Handler
  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingGig) return;
    setSubmittedAppId(applyingGig.id);
    setTimeout(() => {
      setApplyingGig(null);
      setProposalText('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#fefcf3] text-[#111111] font-serif antialiased selection:bg-[#111111] selection:text-[#fefcf3] pb-16">

      {/* ========================================================================= */}
      {/* NEWSPAPER MASTHEAD (THE GIGMATCH GAZETTE) */}
      {/* ========================================================================= */}
      <header className="border-b-2 border-[#111111] bg-[#fefcf3] pt-4 pb-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Top Sub-Bar: Volume, Edition & Date */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#111111] pb-1 text-xs font-sans uppercase tracking-widest text-[#333333]">
            <div className="flex items-center gap-2">
              <span className="font-bold">VOL. CXLII NO. 48,912</span>
              <span>·</span>
              <span>SAN FRANCISCO & GLOBAL INTEL</span>
            </div>
            <div className="flex items-center gap-2 my-1 sm:my-0 font-serif italic text-[#111111] lowercase tracking-normal font-semibold">
              "All the Matches Fit to Print"
            </div>
            <div className="flex items-center gap-3 font-bold">
              <span>FRIDAY, JULY 24, 2026</span>
              <span>·</span>
              <span className="bg-[#111111] text-[#fefcf3] px-1.5 py-0.5 font-mono text-[10px]">
                ROLE: {role.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Main Masthead Banner */}
          <div className="py-4 text-center border-b border-[#111111]">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-tight uppercase text-[#111111] leading-none select-none">
              THE GIGMATCH GAZETTE
            </h1>
            <p className="mt-1 font-serif italic text-sm sm:text-base text-[#333333] tracking-wide">
              The International Journal of Deterministic AI Talent Matching & Skill Vector Arbitrage
            </p>
          </div>

          {/* Edition Weather & Stock Ticker Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#111111] py-1.5 text-xs font-mono text-[#222222]">
            <div className="flex items-center gap-4 overflow-x-auto py-0.5">
              <span><strong className="font-bold">HYBRID MATCH:</strong> 94.1% NDCG@10 (▲0.4%)</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline"><strong className="font-bold">VECTOR LATENCY:</strong> 42ms (▼3ms)</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline"><strong className="font-bold">OPEN DISPATCHES:</strong> {gigs.length} Gigs</span>
              <span>|</span>
              <span><strong className="font-bold">ACTIVE CANDIDATES:</strong> {freelancers.length} Verified</span>
            </div>
            <button
              onClick={() => window.print()}
              className="hidden lg:flex items-center gap-1 text-[11px] font-sans font-bold uppercase tracking-wider hover:underline"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Edition</span>
            </button>
          </div>

          {/* Newspaper Section Navigation Tabs */}
          <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-6 pt-2 pb-1 font-sans text-xs sm:text-sm font-bold uppercase tracking-wider border-b-4 border-double border-[#111111]">
            <button
              onClick={() => setActiveTab('frontpage')}
              className={`px-3 py-1.5 transition-all ${
                activeTab === 'frontpage'
                  ? 'bg-[#111111] text-[#fefcf3]'
                  : 'hover:bg-[#111111]/10 text-[#111111]'
              }`}
            >
              Front Page (Gig Discovery)
            </button>

            <button
              onClick={() => setActiveTab('resume_report')}
              className={`px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === 'resume_report'
                  ? 'bg-[#111111] text-[#fefcf3]'
                  : 'hover:bg-[#111111]/10 text-[#111111]'
              }`}
            >
              <span>Special Report (Resume Parser)</span>
            </button>

            <button
              onClick={() => setActiveTab('classified_desk')}
              className={`px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === 'classified_desk'
                  ? 'bg-[#111111] text-[#fefcf3]'
                  : 'hover:bg-[#111111]/10 text-[#111111]'
              }`}
            >
              <span>Classified Desk {role === 'client' && '(Post Gig)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('financial_eval')}
              className={`px-3 py-1.5 transition-all ${
                activeTab === 'financial_eval'
                  ? 'bg-[#111111] text-[#fefcf3]'
                  : 'hover:bg-[#111111]/10 text-[#111111]'
              }`}
            >
              Financial & Algo Index (Admin)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">

        {/* ========================================================================= */}
        {/* TAB 1: FRONT PAGE (DISCOVERY & LEAD STORY) */}
        {/* ========================================================================= */}
        {activeTab === 'frontpage' && (
          <div className="space-y-8">

            {/* Filter & Search Bar Styled as Newspaper Search Index */}
            <div className="border-y border-[#111111] py-2 bg-[#faf8f0] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 px-3">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-[#111111] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classified archives by skill, keyword, or company..."
                  className="w-full bg-transparent border-b border-[#111111] text-xs sm:text-sm font-mono focus:outline-none focus:border-b-2 py-1 px-1 placeholder-[#666666]"
                />
              </div>

              <div className="flex items-center gap-3 overflow-x-auto text-xs font-sans uppercase font-bold">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="shrink-0">Section:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-[#111111] text-[#fefcf3]'
                        : 'border border-[#111111] hover:bg-[#111111] hover:text-[#fefcf3]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION HEADER */}
            <div className="border-y border-[#111111] py-1 flex items-center justify-between font-sans text-xs font-extrabold uppercase tracking-widest bg-[#111111] text-[#fefcf3] px-3">
              <span>❧ ABOVE THE FOLD · LEAD STORY DISPATCH</span>
              <span>CONFIDENCE INDEX: {leadGig.match_breakdown?.overall_score || 94}%</span>
            </div>

            {/* ABOVE THE FOLD HERO SECTION (LEAD STORY) */}
            {leadGig && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b-2 border-[#111111] pb-8">

                {/* Left/Main Column: Lead Story Headline & Narrative */}
                <div className="lg:col-span-8 flex flex-col justify-between pr-0 lg:pr-6 lg:border-r border-[#111111]">
                  <div>
                    {/* Kicker */}
                    <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest text-[#444444] mb-1">
                      <span className="border-b border-[#111111] pb-0.5">{leadGig.category}</span>
                      <span>·</span>
                      <span>REF NO: {leadGig.id}</span>
                      <span>·</span>
                      <span className="bg-[#111111] text-[#fefcf3] px-1 font-mono">{leadGig.work_mode}</span>
                    </div>

                    {/* Giant Newspaper Headline */}
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-[#111111] leading-tight tracking-tight mb-3">
                      {leadGig.title}
                    </h2>

                    {/* Byline */}
                    <div className="text-xs font-sans uppercase tracking-wider font-semibold text-[#333333] border-y border-[#111111] py-1.5 mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span>By {leadGig.client_name} for <strong className="font-extrabold">{leadGig.client_company}</strong></span>
                      <span>Posted {new Date(leadGig.posted_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Lead Story Body Paragraphs with Drop Cap */}
                    <div className="text-sm sm:text-base font-serif text-[#111111] leading-relaxed space-y-4">
                      <p className="first-letter:float-left first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:mr-3 first-letter:leading-none first-letter:text-[#111111]">
                        {leadGig.description}
                      </p>

                      <p>
                        The engagement specifies a remuneration budget range of <strong>${leadGig.budget_min}–${leadGig.budget_max} per hour</strong>, operating under a {leadGig.work_mode.toLowerCase()} deployment model. Primary candidates are expected to demonstrate verified competency across deterministic software engineering principles, low-latency microservice architectures, and robust testing harnesses.
                      </p>
                    </div>

                    {/* Required Skills Grid */}
                    <div className="mt-6 pt-4 border-t border-[#111111]">
                      <span className="text-xs font-sans uppercase font-bold tracking-widest block mb-2">
                        REQUIRED SKILL TAXONOMY:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {leadGig.required_skills.map((skill) => (
                          <span
                            key={skill}
                            className="font-mono text-xs border border-[#111111] bg-[#faf8f0] px-2.5 py-1 font-bold"
                          >
                            § {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lead Action Buttons */}
                  <div className="mt-8 pt-4 border-t-2 border-double border-[#111111] flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-mono text-[#444444]">
                      Deadline: {new Date(leadGig.application_deadline).toLocaleDateString()} · Applicants: {leadGig.total_applicants}
                    </div>

                    <div className="flex items-center gap-3">
                      {role === 'freelancer' && (
                        <button
                          onClick={() => setApplyingGig(leadGig)}
                          className="bg-[#111111] text-[#fefcf3] hover:bg-[#333333] px-6 py-2.5 font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Submit Official Application</span>
                        </button>
                      )}

                      {role === 'client' && (
                        <button
                          onClick={() => setActiveTab('classified_desk')}
                          className="bg-[#111111] text-[#fefcf3] hover:bg-[#333333] px-6 py-2.5 font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Post Similar Announcement</span>
                        </button>
                      )}

                      {role === 'admin' && (
                        <button
                          onClick={() => setActiveTab('financial_eval')}
                          className="bg-[#111111] text-[#fefcf3] hover:bg-[#333333] px-6 py-2.5 font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Audit Matching Benchmarks</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Editorial Sidebar / Match Score Breakdown Pull-Quote Box */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                  {/* Editorial Pull-Quote Callout Box */}
                  <div className="border-2 border-[#111111] bg-[#faf6ea] p-5 relative">
                    {/* Decorative Corner Ornaments */}
                    <div className="absolute top-1 left-1.5 text-xs">❧</div>
                    <div className="absolute top-1 right-1.5 text-xs">❧</div>

                    <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest border-b border-[#111111] pb-1 block text-center">
                      EDITORIAL ANALYSIS & MATCH BREAKDOWN
                    </span>

                    {/* Pull-Quote Score Header */}
                    <div className="my-4 text-center">
                      <div className="text-5xl font-serif font-black tracking-tight text-[#111111]">
                        {leadGig.match_breakdown?.overall_score || 94}%
                      </div>
                      <div className="text-xs font-sans uppercase tracking-wider font-bold text-[#444444] mt-1">
                        OVERALL VECTOR MATCH CONFIDENCE
                      </div>
                    </div>

                    {/* Stylized Pull-Quote Block */}
                    <blockquote className="border-y border-[#111111] py-3 my-4 italic font-serif text-xs text-[#222222] leading-relaxed text-center">
                      "{leadGig.match_breakdown?.justification || 'Perfect alignment across core backend and frontend requirements. High deterministic score.'}"
                    </blockquote>

                    {/* Score Metrics Breakdown Bar */}
                    <div className="space-y-3 font-mono text-xs border-b border-[#111111] pb-4">
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>KEYWORD SCORE:</span>
                          <span>{leadGig.match_breakdown?.keyword_score || 91}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#e0dad0] border border-[#111111]">
                          <div
                            className="h-full bg-[#111111]"
                            style={{ width: `${leadGig.match_breakdown?.keyword_score || 91}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>SEMANTIC VECTOR:</span>
                          <span>{leadGig.match_breakdown?.semantic_score || 97}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#e0dad0] border border-[#111111]">
                          <div
                            className="h-full bg-[#111111]"
                            style={{ width: `${leadGig.match_breakdown?.semantic_score || 97}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>SKILL COVERAGE:</span>
                          <span>{leadGig.match_breakdown?.skill_coverage_pct || 100}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#e0dad0] border border-[#111111]">
                          <div
                            className="h-full bg-[#111111]"
                            style={{ width: `${leadGig.match_breakdown?.skill_coverage_pct || 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Matching vs Missing Skills */}
                    <div className="pt-3 space-y-2 text-xs font-sans">
                      <div>
                        <span className="font-bold uppercase tracking-wider block text-[#111111] mb-1">
                          MATCHING SKILL REQUISITES:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(leadGig.match_breakdown?.matching_skills || leadGig.required_skills).map(s => (
                            <span key={s} className="bg-[#111111] text-[#fefcf3] px-1.5 py-0.5 font-mono text-[10px]">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {leadGig.match_breakdown?.missing_skills && leadGig.match_breakdown.missing_skills.length > 0 && (
                        <div className="pt-2">
                          <span className="font-bold uppercase tracking-wider block text-[#881111] mb-1">
                            SKILL DEFICITS / GAPS:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {leadGig.match_breakdown.missing_skills.map(s => (
                              <span key={s} className="border border-[#881111] text-[#881111] px-1.5 py-0.5 font-mono text-[10px]">
                                ✕ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Newspaper Advert / Placement Callout Notice */}
                  <div className="border border-[#111111] p-4 text-center bg-[#faf8f0]">
                    <div className="font-sans text-[10px] uppercase tracking-widest font-extrabold border-b border-[#111111] pb-1 mb-2">
                      NOTICE TO EMPLOYERS
                    </div>
                    <p className="font-serif italic text-xs leading-relaxed text-[#333333]">
                      "Position announcements submitted before 5:00 PM EST are indexed immediately into our semantic vector dispatch matrix."
                    </p>
                    <button
                      onClick={() => setActiveTab('classified_desk')}
                      className="mt-3 w-full border border-[#111111] hover:bg-[#111111] hover:text-[#fefcf3] py-1 text-xs font-sans font-bold uppercase tracking-wider transition-all"
                    >
                      Publish Announcement →
                    </button>
                  </div>

                </div>
              </section>
            )}

            {/* SECTION DIVIDER WITH ORNAMENT */}
            <div className="py-2 text-center border-y border-[#111111] font-serif text-sm">
              <span className="px-4 bg-[#fefcf3]">❧ CLASSIFIED PLACEMENT GAZETTE & DISPATCH ARCHIVE ❧</span>
            </div>

            {/* CLASSIFIED ADS STYLE GIG LISTING GRID (2-3 Columns) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs font-sans font-bold uppercase tracking-widest border-b border-[#111111] pb-1">
                <span>INDEXED CLASSIFIED GIGS ({filteredGigs.length} AVAILABLE)</span>
                <span>SORTED BY DETERMINISTIC RANK SCORE</span>
              </div>

              {/* Multi-Column Classified Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGigs.map((gig) => {
                  const isSelected = gig.id === selectedGigId;
                  const score = gig.match_breakdown?.overall_score || 90;

                  return (
                    <article
                      key={gig.id}
                      onClick={() => setSelectedGigId(gig.id)}
                      className={`border cursor-pointer transition-all p-4 flex flex-col justify-between ${
                        isSelected
                          ? 'border-2 border-[#111111] bg-[#faf6ea]'
                          : 'border-[#111111] hover:bg-[#faf8f0]'
                      }`}
                    >
                      <div>
                        {/* Header Classified Category Tag */}
                        <div className="flex items-center justify-between border-b border-[#111111] pb-1.5 mb-2 text-[11px] font-sans font-bold uppercase tracking-wider">
                          <span className="truncate max-w-[170px]">{gig.category}</span>
                          <span className="font-mono bg-[#111111] text-[#fefcf3] px-1.5 py-0.5 text-[10px]">
                            {score}% MATCH
                          </span>
                        </div>

                        {/* Classified Headline Title */}
                        <h3 className="font-serif font-bold text-lg text-[#111111] leading-snug hover:underline mb-2">
                          {gig.title}
                        </h3>

                        {/* Classified Byline */}
                        <div className="text-[11px] font-sans text-[#444444] mb-3">
                          <strong>{gig.client_company}</strong> · ${gig.budget_min}–${gig.budget_max}/hr · {gig.work_mode}
                        </div>

                        {/* Condensed Text Deck */}
                        <p className="font-serif text-xs text-[#222222] line-clamp-3 leading-relaxed mb-4">
                          {gig.description}
                        </p>

                        {/* Skills badges */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {gig.required_skills.slice(0, 4).map(skill => (
                            <span key={skill} className="font-mono text-[10px] border border-[#111111] px-1.5 py-0.5 bg-[#ffffff]">
                              {skill}
                            </span>
                          ))}
                          {gig.required_skills.length > 4 && (
                            <span className="font-mono text-[10px] text-[#555555] self-center">
                              +{gig.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-[#111111] flex items-center justify-between text-xs font-sans font-bold uppercase">
                        <span className="text-[#666666] font-mono text-[10px]">
                          REF #{gig.id}
                        </span>
                        <span className="flex items-center gap-1 group-hover:underline">
                          <span>{isSelected ? '★ LEAD STORY' : 'INSPECT DISPATCH'}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SPECIAL REPORT (RESUME PARSER WITH DROP CAP) */}
        {/* ========================================================================= */}
        {activeTab === 'resume_report' && (
          <div className="space-y-8 max-w-5xl mx-auto">

            {/* Header Banner */}
            <div className="border-y-2 border-[#111111] py-3 text-center bg-[#faf8f0]">
              <span className="font-sans text-xs font-extrabold uppercase tracking-widest block text-[#444444]">
                SPECIAL INVESTIGATIVE DISPATCH · EDITION NO. 489
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black uppercase text-[#111111] mt-1">
                AUTOMATED RESUME PARSING & SKILL EXTRACTION REPORT
              </h2>
              <p className="font-serif italic text-sm text-[#333333] mt-1 max-w-2xl mx-auto">
                Deconstructing raw unstructured curriculum vitae into high-dimensional skill vectors and probabilistic confidence scores.
              </p>
            </div>

            {/* Editorial Introductory Text with Drop Cap */}
            <section className="border-b border-[#111111] pb-6 font-serif text-sm sm:text-base leading-relaxed text-[#111111] space-y-4">
              <p className="first-letter:float-left first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:mr-3 first-letter:leading-none first-letter:text-[#111111]">
                T<span className="font-sans text-xs font-bold uppercase tracking-wider text-[#444444]">he GigMatch AI Extraction Engine</span> utilizes domain-specific sentence-transformer neural networks to convert unformatted text dispatches into deterministic skill taxonomies. By measuring contextual proximity rather than simple keyword overlap, the system identifies implicit technical capabilities with audited probability metrics.
              </p>
            </section>

            {/* Interactive Resume Parser Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

              {/* Left Column: Raw Resume Input Box */}
              <div className="md:col-span-6 space-y-4">
                <div className="border-b border-[#111111] pb-1 flex items-center justify-between font-sans text-xs font-bold uppercase tracking-wider">
                  <span>INPUT DISPATCH: RAW RESUME TEXT</span>
                  <button
                    onClick={() => setResumeText(freelancers[0]?.parsed_resume_text || '')}
                    className="hover:underline font-mono text-[10px] text-[#555555]"
                  >
                    [RESET TO SAMPLE]
                  </button>
                </div>

                <textarea
                  rows={14}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate resume text or CV summary here..."
                  className="w-full bg-[#faf6ea] border-2 border-[#111111] p-4 font-mono text-xs leading-relaxed focus:outline-none focus:bg-[#ffffff] text-[#111111]"
                />

                <button
                  onClick={handleParseResume}
                  disabled={isParsing || !resumeText.trim()}
                  className="w-full bg-[#111111] text-[#fefcf3] hover:bg-[#333333] disabled:opacity-50 py-3 font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>EXECUTING NLP EXTRACTION STEP {parsingStep}/4...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>PARSE & EXTRACT SKILL TAXONOMY NOW</span>
                    </>
                  )}
                </button>

                {/* Parsing Progress Stepper */}
                {isParsing && (
                  <div className="border border-[#111111] bg-[#faf8f0] p-3 font-mono text-xs space-y-1">
                    <div className={parsingStep >= 1 ? 'font-bold text-[#111111]' : 'text-[#888888]'}>
                      [STEP 1] Tokenizing unstructured text blocks... {parsingStep >= 1 && '✓'}
                    </div>
                    <div className={parsingStep >= 2 ? 'font-bold text-[#111111]' : 'text-[#888888]'}>
                      [STEP 2] Running Named Entity Recognition (NER)... {parsingStep >= 2 && '✓'}
                    </div>
                    <div className={parsingStep >= 3 ? 'font-bold text-[#111111]' : 'text-[#888888]'}>
                      [STEP 3] Computing vector embedding similarity... {parsingStep >= 3 && '✓'}
                    </div>
                    <div className={parsingStep >= 4 ? 'font-bold text-[#111111]' : 'text-[#888888]'}>
                      [STEP 4] Formatting skill confidence matrix... {parsingStep >= 4 && '✓'}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Parsed Intelligence Brief & Skills Matrix */}
              <div className="md:col-span-6 space-y-4">
                <div className="border-b border-[#111111] pb-1 flex items-center justify-between font-sans text-xs font-bold uppercase tracking-wider">
                  <span>PARSED AUDIT DOSSIER</span>
                  <span className="font-mono text-[10px] bg-[#111111] text-[#fefcf3] px-1.5 py-0.5">
                    CONFIDENCE: HIGH
                  </span>
                </div>

                {extractedProfile && (
                  <div className="border-2 border-[#111111] bg-[#ffffff] p-5 space-y-4">

                    {/* Profile Header */}
                    <div className="flex items-start gap-4 border-b border-[#111111] pb-4">
                      <img
                        src={extractedProfile.avatar}
                        alt={extractedProfile.full_name}
                        className="w-14 h-14 border border-[#111111] object-cover grayscale"
                      />
                      <div>
                        <h3 className="font-serif font-bold text-xl text-[#111111]">{extractedProfile.full_name}</h3>
                        <p className="font-sans text-xs text-[#444444] font-semibold">{extractedProfile.title}</p>
                        <div className="mt-1 font-mono text-[11px] text-[#555555] flex flex-wrap gap-2">
                          <span>{extractedProfile.location}</span>
                          <span>·</span>
                          <span>${extractedProfile.hourly_rate}/hr</span>
                          <span>·</span>
                          <span>{extractedProfile.experience_years} yrs exp</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Deck */}
                    <div>
                      <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#555555] block mb-1">
                        PARSED EXECUTIVE SUMMARY:
                      </span>
                      <p className="font-serif italic text-xs text-[#222222] bg-[#faf8f0] border border-[#111111] p-3 leading-relaxed">
                        "{extractedProfile.bio}"
                      </p>
                    </div>

                    {/* Skill Confidence Table */}
                    <div>
                      <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#555555] block mb-2">
                        EXTRACTED SKILLS & PROBABILISTIC CONFIDENCE:
                      </span>
                      <div className="border border-[#111111] divide-y divide-[#111111]">
                        <div className="grid grid-cols-12 bg-[#111111] text-[#fefcf3] font-sans text-[10px] font-bold uppercase p-1.5">
                          <span className="col-span-5">Skill Name</span>
                          <span className="col-span-4">Category</span>
                          <span className="col-span-3 text-right">Confidence</span>
                        </div>

                        {extractedProfile.skills.map((skill) => {
                          const conf = Math.round((skill.extracted_confidence || 0.92) * 100);
                          return (
                            <div key={skill.name} className="grid grid-cols-12 items-center p-2 font-mono text-xs hover:bg-[#faf6ea]">
                              <span className="col-span-5 font-bold">{skill.name}</span>
                              <span className="col-span-4 text-[11px] text-[#555555] uppercase">{skill.category}</span>
                              <div className="col-span-3 text-right flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-[#e0dad0] border border-[#111111]">
                                  <div className="h-full bg-[#111111]" style={{ width: `${conf}%` }} />
                                </div>
                                <span className="font-bold">{conf}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Verification Stamp */}
                    <div className="border-t border-[#111111] pt-3 flex items-center justify-between text-xs font-sans text-[#444444]">
                      <span className="flex items-center gap-1 font-bold text-[#111111]">
                        <CheckCircle2 className="h-4 w-4 text-[#111111]" />
                        <span>AUDITED BY VANGUARD GAZETTE AI ENGINE</span>
                      </span>
                      <span className="font-mono text-[10px]">
                        PARSED AT: {new Date().toLocaleTimeString()}
                      </span>
                    </div>

                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CLASSIFIED DESK (POST GIG & CLIENT APPLICANT REVIEW) */}
        {/* ========================================================================= */}
        {activeTab === 'classified_desk' && (
          <div className="space-y-8 max-w-5xl mx-auto">

            {/* Header Banner */}
            <div className="border-y-2 border-[#111111] py-3 text-center bg-[#faf8f0]">
              <span className="font-sans text-xs font-extrabold uppercase tracking-widest block text-[#444444]">
                OFFICIAL GAZETTE DESK · NOTICE NO. 88-B
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black uppercase text-[#111111] mt-1">
                CLASSIFIED PLACEMENT & ANNOUNCEMENT DESK
              </h2>
              <p className="font-serif italic text-sm text-[#333333] mt-1 max-w-2xl mx-auto">
                {role === 'client'
                  ? 'Submit new gig opportunities to be printed in tomorrow’s global dispatch and review applicant dossiers.'
                  : 'Browse classified position announcements or review applicant submissions across active listings.'}
              </p>
            </div>

            {/* Success Message Banner */}
            {postSuccessMsg && (
              <div className="border-2 border-[#111111] bg-[#111111] text-[#fefcf3] p-4 text-center font-sans font-bold text-xs uppercase tracking-wider">
                ✓ {postSuccessMsg}
              </div>
            )}

            {/* Client Role Option: Post a New Gig Form */}
            {(role === 'client' || role === 'admin') && (
              <section className="border-2 border-[#111111] bg-[#ffffff] p-6 space-y-6">
                <div className="border-b border-[#111111] pb-2 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-xl uppercase tracking-tight text-[#111111]">
                    ❧ PUBLISH A NEW CLASSIFIED POSITION ANNOUNCEMENT
                  </h3>
                  <span className="font-mono text-xs text-[#555555]">FORM 88-B</span>
                </div>

                <form onSubmit={handlePostGigSubmit} className="space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                        POSITION TITLE / HEADLINE *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Senior PyTorch NLP Engineer"
                        className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-serif text-sm focus:outline-none focus:bg-[#ffffff]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                        HIRING ENTITY / COMPANY *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="e.g. Vanguard Talent Labs"
                        className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-serif text-sm focus:outline-none focus:bg-[#ffffff]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                        CATEGORY
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-sans text-xs font-bold uppercase focus:outline-none focus:bg-[#ffffff]"
                      >
                        {categories.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                        DEPLOYMENT WORK MODE
                      </label>
                      <select
                        value={newWorkMode}
                        onChange={(e) => setNewWorkMode(e.target.value as 'Remote' | 'Hybrid' | 'Onsite')}
                        className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-sans text-xs font-bold uppercase focus:outline-none focus:bg-[#ffffff]"
                      >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                        HOURLY BUDGET ($ MIN / MAX)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={newBudgetMin}
                          onChange={(e) => setNewBudgetMin(Number(e.target.value))}
                          className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-mono text-xs text-center focus:outline-none"
                        />
                        <span>–</span>
                        <input
                          type="number"
                          value={newBudgetMax}
                          onChange={(e) => setNewBudgetMax(Number(e.target.value))}
                          className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-mono text-xs text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                      REQUIRED SKILL TAXONOMY (COMMA SEPARATED)
                    </label>
                    <input
                      type="text"
                      value={newSkills}
                      onChange={(e) => setNewSkills(e.target.value)}
                      placeholder="React, TypeScript, FastAPI, Supabase"
                      className="w-full bg-[#faf6ea] border border-[#111111] p-2.5 font-mono text-xs focus:outline-none focus:bg-[#ffffff]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                      DETAILED ANNOUNCEMENT DESCRIPTION / DECK *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Detail the technical responsibilities, stack requirements, and expected deliverables..."
                      className="w-full bg-[#faf6ea] border border-[#111111] p-3 font-serif text-xs leading-relaxed focus:outline-none focus:bg-[#ffffff]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#111111] text-[#fefcf3] hover:bg-[#333333] py-3 font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>PRINT & PUBLISH ANNOUNCEMENT TO GAZETTE</span>
                  </button>

                </form>
              </section>
            )}

            {/* Applicant Dossiers Review Section */}
            <section className="space-y-4 pt-4">
              <div className="border-b-2 border-[#111111] pb-2 flex items-center justify-between">
                <h3 className="font-serif font-bold text-2xl uppercase tracking-tight text-[#111111]">
                  APPLICANT DOSSIER REGISTRY ({applications.length})
                </h3>
                <span className="font-mono text-xs text-[#555555]">STATUS AUDIT BOARD</span>
              </div>

              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="border-2 border-[#111111] bg-[#ffffff] p-5 space-y-4">

                    {/* Top Application Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#111111] pb-3 gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={app.freelancer_avatar}
                          alt={app.freelancer_name}
                          className="w-12 h-12 border border-[#111111] object-cover grayscale shrink-0"
                        />
                        <div>
                          <h4 className="font-serif font-bold text-lg text-[#111111]">{app.freelancer_name}</h4>
                          <p className="font-sans text-xs text-[#444444] font-semibold">{app.freelancer_title}</p>
                        </div>
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs bg-[#111111] text-[#fefcf3] px-2 py-1 font-bold">
                          MATCH: {app.match_score}%
                        </span>

                        <span className={`font-sans text-xs font-extrabold uppercase px-2.5 py-1 border border-[#111111] ${
                          app.status === 'shortlisted' ? 'bg-[#111111] text-[#fefcf3]' :
                          app.status === 'accepted' ? 'bg-[#faf6ea] text-[#111111]' :
                          app.status === 'declined' ? 'line-through text-[#888888]' :
                          'bg-[#faf8f0] text-[#111111]'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>

                    {/* Applied For Gig Title */}
                    <div className="text-xs font-sans text-[#333333]">
                      <strong className="uppercase tracking-wider">APPLIED FOR:</strong> {app.gig_title}
                    </div>

                    {/* Proposal Letter Text */}
                    <div className="bg-[#faf6ea] border border-[#111111] p-3 text-xs font-serif italic text-[#111111] leading-relaxed">
                      "{app.proposal_text}"
                    </div>

                    {/* Matching Skills */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-t border-[#111111] pt-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="font-sans font-bold uppercase text-[10px] mr-1 text-[#555555]">SKILLS MATCH:</span>
                        {app.matching_skills.map(s => (
                          <span key={s} className="border border-[#111111] px-1.5 py-0.5 text-[10px]">✓ {s}</span>
                        ))}
                      </div>

                      {/* Client Action Buttons to change Status */}
                      <div className="flex items-center gap-2 font-sans font-bold text-[11px] uppercase">
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                          className="border border-[#111111] hover:bg-[#111111] hover:text-[#fefcf3] px-2.5 py-1 transition-all"
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'interview')}
                          className="border border-[#111111] hover:bg-[#111111] hover:text-[#fefcf3] px-2.5 py-1 transition-all"
                        >
                          Interview
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                          className="bg-[#111111] text-[#fefcf3] hover:bg-[#333333] px-2.5 py-1 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'declined')}
                          className="border border-[#881111] text-[#881111] hover:bg-[#881111] hover:text-[#ffffff] px-2 py-1 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </section>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FINANCIAL & ALGORITHMIC INDEX (ADMIN EVALUATION DATA TABLE) */}
        {/* ========================================================================= */}
        {activeTab === 'financial_eval' && (
          <div className="space-y-8 max-w-5xl mx-auto">

            {/* Header Banner */}
            <div className="border-y-2 border-[#111111] py-3 text-center bg-[#faf8f0]">
              <span className="font-sans text-xs font-extrabold uppercase tracking-widest block text-[#444444]">
                FINANCIAL MARKET STYLE REPORT · TABLE 104-A
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black uppercase text-[#111111] mt-1">
                ALGORITHMIC MATCHING BENCHMARK & EVALUATION INDEX
              </h2>
              <p className="font-serif italic text-sm text-[#333333] mt-1 max-w-2xl mx-auto">
                Comparative statistical analysis of hybrid embedding vs exact keyword match precision across standard query benchmarks.
              </p>
            </div>

            {/* Thick-Thin Border Pattern Financial Table */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs font-sans font-bold uppercase tracking-widest border-b border-[#111111] pb-1">
                <span>BENCHMARK RESULTS (150 TEST QUERIES AUDITED)</span>
                <span>METRICS: NDCG@5, NDCG@10, MAP, MRR, LATENCY</span>
              </div>

              {/* Classic Financial Table with Double Top Border and Thick Bottom Border */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">

                  {/* Table Header with Thick-Thin Border */}
                  <thead>
                    <tr className="border-t-4 border-b-2 border-[#111111] bg-[#111111] text-[#fefcf3] font-sans text-[11px] font-bold uppercase">
                      <th className="p-3">ALGORITHM MODEL</th>
                      <th className="p-3 text-right">NDCG@5</th>
                      <th className="p-3 text-right">NDCG@10</th>
                      <th className="p-3 text-right">MAP SCORE</th>
                      <th className="p-3 text-right">MRR SCORE</th>
                      <th className="p-3 text-right">P@5</th>
                      <th className="p-3 text-right">LATENCY (MS)</th>
                      <th className="p-3 text-right">COVERAGE</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-[#111111] bg-[#ffffff]">
                    {benchmarks.map((bm) => {
                      const isTopModel = bm.algorithm_id === 'hybrid';

                      return (
                        <tr
                          key={bm.algorithm_id}
                          className={`hover:bg-[#faf6ea] transition-all ${
                            isTopModel ? 'font-bold bg-[#faf8f0]' : ''
                          }`}
                        >
                          <td className="p-3 border-r border-[#111111]">
                            <div className="font-serif font-bold text-sm text-[#111111]">
                              {bm.algorithm_name}
                            </div>
                            <div className="text-[10px] text-[#555555] uppercase font-sans">
                              ID: {bm.algorithm_id} {isTopModel && '★ LEAD MODEL'}
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111]">{bm.ndcg_5.toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111] text-sm">{bm.ndcg_10.toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111]">{bm.map_score.toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111]">{bm.mrr_score.toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111]">{bm.precision_5.toFixed(3)}</td>
                          <td className="p-3 text-right tabular-nums border-r border-[#111111]">{bm.latency_ms} ms</td>
                          <td className="p-3 text-right tabular-nums">{Math.round(bm.relevance_coverage * 100)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer with Thick Bottom Border */}
                  <tfoot>
                    <tr className="border-t-2 border-b-4 border-[#111111] bg-[#faf8f0] font-sans text-xs font-bold uppercase">
                      <td className="p-3">WEIGHTED INDEX AVERAGE</td>
                      <td className="p-3 text-right tabular-nums font-mono">0.827</td>
                      <td className="p-3 text-right tabular-nums font-mono text-sm">0.853</td>
                      <td className="p-3 text-right tabular-nums font-mono">0.790</td>
                      <td className="p-3 text-right tabular-nums font-mono">0.874</td>
                      <td className="p-3 text-right tabular-nums font-mono">0.773</td>
                      <td className="p-3 text-right tabular-nums font-mono">29 ms</td>
                      <td className="p-3 text-right tabular-nums font-mono">91%</td>
                    </tr>
                  </tfoot>

                </table>
              </div>
            </section>

            {/* Editorial Methodology Note & Pull-Quote */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
              <div className="md:col-span-7 border-2 border-[#111111] bg-[#ffffff] p-5 space-y-3">
                <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest border-b border-[#111111] pb-1 block">
                  METHODOLOGY & METRIC DEFINITIONS
                </span>
                <p className="font-serif text-xs text-[#222222] leading-relaxed">
                  <strong>NDCG@10 (Normalized Discounted Cumulative Gain):</strong> Evaluates position ranking quality by penalizing relevant talent results placed lower down the candidate list.
                </p>
                <p className="font-serif text-xs text-[#222222] leading-relaxed">
                  <strong>MAP (Mean Average Precision):</strong> Computes average precision across all test dispatches, rewarding algorithms that return zero false positives in top-5 candidate rankings.
                </p>
              </div>

              <div className="md:col-span-5 border-2 border-[#111111] bg-[#faf6ea] p-5 text-center flex flex-col justify-center">
                <blockquote className="font-serif italic text-xs text-[#111111] leading-relaxed">
                  "The Hybrid AI engine achieves a 94.1% NDCG@10 score while maintaining sub-50 millisecond query latency over PostgreSQL pgvector indexes."
                </blockquote>
                <div className="mt-3 font-sans text-[10px] uppercase font-bold text-[#555555]">
                  — AUDIT BOARD CERTIFICATION
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* APPLICATION MODAL FORM (FOR FREELANCERS) */}
      {/* ========================================================================= */}
      {applyingGig && (
        <div className="fixed inset-0 bg-[#111111]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fefcf3] border-4 border-[#111111] max-w-xl w-full p-6 space-y-4">

            <div className="border-b-2 border-[#111111] pb-2 flex items-center justify-between">
              <h3 className="font-serif font-bold text-xl uppercase tracking-tight text-[#111111]">
                OFFICIAL APPLICATION DISPATCH FORM
              </h3>
              <button
                onClick={() => setApplyingGig(null)}
                className="font-sans font-bold text-xs hover:underline"
              >
                [CLOSE ✕]
              </button>
            </div>

            {submittedAppId === applyingGig.id ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-[#111111] mx-auto" />
                <h4 className="font-serif font-bold text-2xl">DISPATCH TRANSMITTED</h4>
                <p className="font-serif italic text-xs text-[#444444]">
                  Your application proposal for "{applyingGig.title}" has been printed directly into the employer's dossier inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider block mb-1">POSITION:</span>
                  <div className="font-serif font-bold text-base border-b border-[#111111] pb-1">
                    {applyingGig.title} (${applyingGig.budget_min}–${applyingGig.budget_max}/hr)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                    COVER LETTER & PROPOSAL STATEMENT *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder="State your relevant experience, technical background, and proposed approach..."
                    className="w-full bg-[#faf6ea] border border-[#111111] p-3 font-serif text-xs leading-relaxed focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#111111]">
                  <button
                    type="button"
                    onClick={() => setApplyingGig(null)}
                    className="border border-[#111111] px-4 py-2 font-sans font-bold text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#111111] text-[#fefcf3] px-6 py-2 font-sans font-bold text-xs uppercase tracking-widest hover:bg-[#333333]"
                  >
                    Transmit Application Proposal →
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 mt-16 pt-4 border-t-4 border-double border-[#111111] text-center font-serif text-xs text-[#444444] space-y-1">
        <p>THE GIGMATCH GAZETTE · CONCEPT 7 PRINT EDITION · ALL RIGHTS RESERVED © 2026</p>
        <p className="font-sans text-[10px] uppercase tracking-widest text-[#777777]">
          PRINTED WITH HIGH CONTRAST TYPOGRAPHIC DISCIPLINE · NO SHADOWS · NO GRADIENTS
        </p>
      </footer>

    </div>
  );
};
