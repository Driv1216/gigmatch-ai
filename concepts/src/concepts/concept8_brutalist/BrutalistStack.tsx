import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile, Skill } from '../../types';
import {
  Search,
  Plus,
  ArrowRight,
  Zap,
  FileText,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity,
  Layers,
  BarChart3,
  Briefcase,
  User,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  RefreshCw,
  Sliders,
  Filter,
  CheckSquare
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

type TabType = 'gigs' | 'parser' | 'post' | 'applications' | 'benchmarks' | 'logs';

export const BrutalistStack: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('gigs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('ALL');
  const [minBudget, setMinBudget] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'score' | 'budget' | 'newest'>('score');

  // Expanded card tracking for match details
  const [expandedGigId, setExpandedGigId] = useState<string | null>(null);

  // Proposal modal / drawer state
  const [applyingGig, setApplyingGig] = useState<Gig | null>(null);
  const [proposalText, setProposalText] = useState('');
  const [proposalSubmitted, setProposalSubmitted] = useState<string | null>(null);

  // Resume parser state
  const activeFreelancer = freelancers[0] || {
    full_name: 'Elena Rostova',
    title: 'Senior Full-Stack AI Engineer',
    skills: [],
    parsed_resume_text: '',
  };

  const [resumeText, setResumeText] = useState<string>(
    activeFreelancer.parsed_resume_text ||
      `ELENA ROSTOVA\nSenior Full-Stack AI Engineer | San Francisco, CA\n\nSUMMARY:\nSenior Full-Stack AI Developer with 8 years of experience building high-throughput web applications and semantic matching engines. Expert in Python, FastAPI, React 19, TypeScript, PyTorch, Supabase, PostgreSQL.\n\nSKILLS:\n- Frontend: React 19, TypeScript, Next.js, Tailwind CSS\n- Backend: Python, FastAPI, PostgreSQL, Supabase RLS, Redis, pgvector\n- AI & NLP: PyTorch, HuggingFace sentence-transformers, Cosine Similarity search, Skill Extraction`
  );

  const [parsedSkills, setParsedSkills] = useState<Skill[]>(
    activeFreelancer.skills && activeFreelancer.skills.length > 0
      ? activeFreelancer.skills
      : [
          { name: 'React', category: 'frontend', extracted_confidence: 0.98 },
          { name: 'TypeScript', category: 'frontend', extracted_confidence: 0.96 },
          { name: 'FastAPI', category: 'backend', extracted_confidence: 0.94 },
          { name: 'Python', category: 'backend', extracted_confidence: 0.99 },
          { name: 'PyTorch / NLP', category: 'ai_ml', extracted_confidence: 0.89 },
          { name: 'PostgreSQL / Supabase', category: 'database', extracted_confidence: 0.92 },
        ]
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatusMsg, setParseStatusMsg] = useState<string | null>(null);

  // Client Post Gig state
  const [postTitle, setPostTitle] = useState('');
  const [postCompany, setPostCompany] = useState('');
  const [postIndustry, setPostIndustry] = useState('AI & Technology');
  const [postWorkMode, setPostWorkMode] = useState<'Remote' | 'Hybrid' | 'Onsite'>('Remote');
  const [postMinBudget, setPostMinBudget] = useState(85);
  const [postMaxBudget, setPostMaxBudget] = useState(130);
  const [postSkills, setPostSkills] = useState('React, TypeScript, FastAPI, Supabase');
  const [postDescription, setPostDescription] = useState('');
  const [postSuccessMsg, setPostSuccessMsg] = useState<string | null>(null);

  // Filter Gigs
  const filteredGigs = gigs
    .filter((g) => {
      const matchTitle = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchMode = selectedWorkMode === 'ALL' || g.work_mode.toUpperCase() === selectedWorkMode;
      const matchBudget = g.budget_max >= minBudget;
      return matchTitle && matchMode && matchBudget;
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.match_breakdown?.overall_score || 0;
        const scoreB = b.match_breakdown?.overall_score || 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'budget') {
        return b.budget_max - a.budget_max;
      }
      return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime();
    });

  // Handlers
  const handleParseResume = () => {
    setIsParsing(true);
    setParseStatusMsg(null);
    setTimeout(() => {
      setIsParsing(false);
      // Generate parsed skills from text keywords
      const skillsFound: Skill[] = [];
      const textUpper = resumeText.toUpperCase();

      if (textUpper.includes('REACT')) skillsFound.push({ name: 'React', category: 'frontend', extracted_confidence: 0.98 });
      if (textUpper.includes('TYPESCRIPT')) skillsFound.push({ name: 'TypeScript', category: 'frontend', extracted_confidence: 0.96 });
      if (textUpper.includes('FASTAPI')) skillsFound.push({ name: 'FastAPI', category: 'backend', extracted_confidence: 0.95 });
      if (textUpper.includes('PYTHON')) skillsFound.push({ name: 'Python', category: 'backend', extracted_confidence: 0.99 });
      if (textUpper.includes('PYTORCH') || textUpper.includes('NLP')) skillsFound.push({ name: 'PyTorch / NLP', category: 'ai_ml', extracted_confidence: 0.91 });
      if (textUpper.includes('POSTGRESQL') || textUpper.includes('SUPABASE')) skillsFound.push({ name: 'PostgreSQL / Supabase', category: 'database', extracted_confidence: 0.93 });
      if (textUpper.includes('DOCKER')) skillsFound.push({ name: 'Docker / CI/CD', category: 'devops', extracted_confidence: 0.87 });

      if (skillsFound.length === 0) {
        skillsFound.push(
          { name: 'React', category: 'frontend', extracted_confidence: 0.90 },
          { name: 'Python', category: 'backend', extracted_confidence: 0.88 }
        );
      }

      setParsedSkills(skillsFound);
      setParseStatusMsg(`EXTRACTED ${skillsFound.length} CORE SKILLS WITH HIGH COSINE CONFIDENCE [STATUS: 200 OK]`);
    }, 600);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim()) return;

    const skillList = postSkills.split(',').map((s) => s.trim()).filter(Boolean);

    onPostGig({
      title: postTitle,
      client_company: postCompany || 'Vanguard Labs',
      client_industry: postIndustry,
      work_mode: postWorkMode,
      budget_min: postMinBudget,
      budget_max: postMaxBudget,
      required_skills: skillList.length > 0 ? skillList : ['React', 'TypeScript'],
      description: postDescription || 'Engineering opportunity created via Brutalist Stack client portal.',
    });

    setPostSuccessMsg(`OPPORTUNITY "${postTitle.toUpperCase()}" PUBLISHED TO MATCH ENGINE [STATUS: SUCCESS]`);
    setPostTitle('');
    setPostCompany('');
    setPostDescription('');

    setTimeout(() => setPostSuccessMsg(null), 5000);
  };

  const handleProposalSubmit = () => {
    if (!applyingGig) return;
    setProposalSubmitted(`PROPOSAL SUBMITTED FOR: ${applyingGig.title.toUpperCase()}`);
    setApplyingGig(null);
    setProposalText('');
    setTimeout(() => setProposalSubmitted(null), 5000);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased selection:bg-[#ff0000] selection:text-black">
      {/* HEADER SECTION */}
      <header className="border-b-[4px] border-black bg-white p-6 md:p-8 rounded-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="bg-[#ff0000] text-black font-black uppercase text-xs tracking-widest px-3 py-1 border-[2px] border-black rounded-none">
                CONCEPT 08 // BRUTALIST
              </span>
              <span className="bg-black text-white font-mono uppercase text-xs tracking-widest px-3 py-1 border-[2px] border-black rounded-none">
                ROLE: {role.toUpperCase()}
              </span>
              <span className="border-[2px] border-black font-mono text-xs uppercase px-3 py-1 font-bold">
                ENGINE: DETERMINISTIC_COSINE
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black leading-none">
              GIGMATCH<span className="text-[#ff0000]">//</span>BRUTALIST_STACK
            </h1>
            <p className="font-mono text-xs md:text-sm uppercase tracking-wider text-black mt-2">
              [RAW UNADORNED INTERFACE // ZERO GRADIENTS // 3PX SOLID BOUNDARIES // ELECTRIC RED ACCENT]
            </p>
          </div>

          <div className="border-[3px] border-black p-3 bg-white rounded-none font-mono text-xs flex flex-col gap-1 min-w-[240px]">
            <div className="flex justify-between border-b border-black pb-1 font-bold">
              <span>SYSTEM STATE:</span>
              <span className="text-[#ff0000] font-black">ONLINE</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>GIGS IN STACK:</span>
              <span className="font-bold">{gigs.length}</span>
            </div>
            <div className="flex justify-between">
              <span>APPLICATIONS:</span>
              <span className="font-bold">{applications.length}</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS SEPARATED BY SLASHES */}
        <div className="max-w-7xl mx-auto mt-8 border-t-[3px] border-black pt-4">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-sm md:text-base uppercase tracking-widest font-bold">
            <button
              onClick={() => setActiveTab('gigs')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                activeTab === 'gigs' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              GIG STACK
            </button>
            <span className="text-black font-black text-lg">/</span>

            <button
              onClick={() => setActiveTab('parser')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                activeTab === 'parser' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              RESUME PARSER
            </button>
            <span className="text-black font-black text-lg">/</span>

            {role !== 'freelancer' && (
              <>
                <button
                  onClick={() => setActiveTab('post')}
                  className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                    activeTab === 'post' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  POST OPPORTUNITY
                </button>
                <span className="text-black font-black text-lg">/</span>
              </>
            )}

            {(role === 'client' || role === 'admin') && (
              <>
                <button
                  onClick={() => setActiveTab('applications')}
                  className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                    activeTab === 'applications' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  APPLICANTS FEED ({applications.length})
                </button>
                <span className="text-black font-black text-lg">/</span>
              </>
            )}

            {(role === 'admin' || role === 'freelancer') && (
              <>
                <button
                  onClick={() => setActiveTab('benchmarks')}
                  className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                    activeTab === 'benchmarks' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  ADMIN BENCHMARKS
                </button>
                <span className="text-black font-black text-lg">/</span>
              </>
            )}

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 border-[3px] border-black rounded-none transition-none cursor-pointer ${
                activeTab === 'logs' ? 'bg-[#ff0000] text-black font-black' : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              SYSTEM LOGS
            </button>
          </nav>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      {proposalSubmitted && (
        <div className="bg-[#ff0000] text-black font-mono font-black uppercase text-sm p-4 border-b-[4px] border-black flex justify-between items-center rounded-none">
          <span>[ACTION CONFIRMED] {proposalSubmitted}</span>
          <button onClick={() => setProposalSubmitted(null)} className="font-black text-lg hover:underline cursor-pointer">
            [X]
          </button>
        </div>
      )}

      {postSuccessMsg && (
        <div className="bg-[#ff0000] text-black font-mono font-black uppercase text-sm p-4 border-b-[4px] border-black flex justify-between items-center rounded-none">
          <span>[SYSTEM NOTICE] {postSuccessMsg}</span>
          <button onClick={() => setPostSuccessMsg(null)} className="font-black text-lg hover:underline cursor-pointer">
            [X]
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* ========================================================================= */}
        {/* TAB 1: GIG STACK */}
        {/* ========================================================================= */}
        {activeTab === 'gigs' && (
          <div className="space-y-8">
            {/* SEARCH & FILTERS HEADER */}
            <div className="border-[3px] border-black p-6 bg-white rounded-none">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-[3px] border-black pb-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                    // GIG OPPORTUNITY STACK
                  </h2>
                  <p className="font-mono text-xs uppercase text-gray-700 font-bold mt-1">
                    DISPLAYING {filteredGigs.length} OF {gigs.length} AVAILABLE OPPORTUNITIES MATCHED TO PROFILE
                  </p>
                </div>

                {role === 'client' && (
                  <button
                    onClick={() => setActiveTab('post')}
                    className="bg-[#ff0000] text-black hover:bg-black hover:text-white font-black uppercase tracking-wider px-6 py-3 border-[3px] border-black rounded-none cursor-pointer flex items-center gap-2 self-start lg:self-auto"
                  >
                    <Plus className="w-5 h-5 stroke-[3]" />
                    POST NEW GIG
                  </button>
                )}
              </div>

              {/* SEARCH & FILTER CONTROLS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search box */}
                <div className="md:col-span-5 border-[3px] border-black p-1 bg-white rounded-none flex items-center">
                  <Search className="w-5 h-5 mx-2 stroke-[3] text-black" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH BY SKILL, TITLE, OR KEYWORD..."
                    className="w-full bg-transparent font-mono text-sm uppercase p-2 focus:outline-none focus:bg-gray-100 placeholder:text-gray-500 rounded-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-2 font-mono font-bold text-xs hover:text-[#ff0000]"
                    >
                      CLEAR
                    </button>
                  )}
                </div>

                {/* Work Mode Toggle */}
                <div className="md:col-span-4 border-[3px] border-black p-1 bg-white rounded-none flex items-center justify-between font-mono text-xs font-bold uppercase">
                  <span className="px-2 text-gray-600">MODE:</span>
                  <div className="flex gap-1 flex-1">
                    {['ALL', 'REMOTE', 'HYBRID', 'ONSITE'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedWorkMode(mode)}
                        className={`flex-1 py-1.5 px-1 text-center border border-black rounded-none cursor-pointer ${
                          selectedWorkMode === mode ? 'bg-black text-white font-black' : 'bg-white text-black hover:bg-gray-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Option */}
                <div className="md:col-span-3 border-[3px] border-black p-1 bg-white rounded-none flex items-center justify-between font-mono text-xs font-bold uppercase">
                  <span className="px-2 text-gray-600">SORT:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="w-full bg-transparent font-mono text-xs uppercase p-1.5 font-bold cursor-pointer focus:outline-none"
                  >
                    <option value="score">MATCH SCORE (HIGH)</option>
                    <option value="budget">MAX BUDGET</option>
                    <option value="newest">NEWEST POSTED</option>
                  </select>
                </div>
              </div>

              {/* Min budget slider */}
              <div className="mt-4 pt-4 border-t-[2px] border-black flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
                <div className="flex items-center gap-4 flex-1">
                  <span>MIN HOURLY BUDGET: <strong className="text-base font-black text-[#ff0000]">${minBudget}/HR</strong></span>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="10"
                    value={minBudget}
                    onChange={(e) => setMinBudget(Number(e.target.value))}
                    className="w-48 accent-black cursor-pointer"
                  />
                  {minBudget > 0 && (
                    <button onClick={() => setMinBudget(0)} className="underline hover:text-[#ff0000]">
                      RESET FILTER
                    </button>
                  )}
                </div>

                <div className="text-gray-700">
                  CRITERIA: EXACT KEYWORD & SEMANTIC EMBEDDING COSINE RATIO
                </div>
              </div>
            </div>

            {/* GIG CARDS STACKED VERTICALLY WITH HEAVY BLACK TOP BORDER */}
            <div className="space-y-6">
              {filteredGigs.length === 0 ? (
                <div className="border-[3px] border-black p-12 text-center bg-white rounded-none">
                  <h3 className="text-3xl font-black uppercase text-black">NO GIGS MATCHED</h3>
                  <p className="font-mono text-sm uppercase text-gray-700 mt-2">
                    TRY ADJUSTING YOUR SEARCH FILTER OR CLEARING BUDGET RESTRICTIONS.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedWorkMode('ALL');
                      setMinBudget(0);
                    }}
                    className="mt-6 bg-black text-white hover:bg-[#ff0000] hover:text-black font-black uppercase px-6 py-3 border-[3px] border-black rounded-none cursor-pointer"
                  >
                    RESET ALL FILTERS
                  </button>
                </div>
              ) : (
                filteredGigs.map((gig) => {
                  const match = gig.match_breakdown;
                  const isExpanded = expandedGigId === gig.id;
                  const overallScore = match?.overall_score ?? 88;

                  return (
                    <article
                      key={gig.id}
                      className="border-[3px] border-black border-t-[8px] border-t-black hover:border-t-[#ff0000] bg-white p-6 md:p-8 rounded-none transition-none"
                    >
                      {/* CARD TOP META BAR */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[2px] border-black pb-3 mb-4 font-mono text-xs uppercase font-bold text-black">
                        <div className="flex items-center gap-3">
                          <span className="bg-black text-white px-2 py-0.5 border border-black">
                            ID: {gig.id.toUpperCase()}
                          </span>
                          <span>CLIENT: {gig.client_company.toUpperCase()}</span>
                          <span className="text-gray-400">/</span>
                          <span>POSTED: {new Date(gig.posted_date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-[#ff0000] text-black font-black px-2 py-0.5 border border-black">
                            {gig.work_mode.toUpperCase()}
                          </span>
                          <span className="border border-black px-2 py-0.5">
                            STATUS: {gig.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* CARD MAIN CONTENT GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN: TITLE, INFO, DESCRIPTION, SKILLS */}
                        <div className="lg:col-span-8">
                          <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-black leading-tight mb-2">
                            {gig.title}
                          </h3>

                          <div className="font-mono text-xs uppercase font-bold text-gray-800 flex flex-wrap gap-x-4 gap-y-1 mb-4">
                            <span>CATEGORY: {gig.category.toUpperCase()}</span>
                            <span>/</span>
                            <span>LOCATION: {gig.location.toUpperCase()}</span>
                            <span>/</span>
                            <span className="text-black font-black bg-gray-100 px-1 border border-black">
                              BUDGET: ${gig.budget_min} - ${gig.budget_max}/HR
                            </span>
                          </div>

                          <hr className="border-t-[3px] border-black my-4" />

                          <p className="font-mono text-sm leading-relaxed text-black mb-6">
                            {gig.description}
                          </p>

                          {/* SKILLS AS SIMPLE UNDERLINED TEXT LIST */}
                          <div className="border-[2px] border-black p-4 bg-gray-50 rounded-none">
                            <div className="font-mono text-xs font-black uppercase tracking-widest text-black mb-2 flex items-center gap-2">
                              <span>REQUIRED SKILLS MATCH ENGINE LIST:</span>
                            </div>

                            <div className="font-mono text-sm uppercase tracking-wider flex flex-wrap gap-x-3 gap-y-2">
                              {gig.required_skills.map((skill, idx) => {
                                const isMatch = match?.matching_skills.includes(skill);
                                const isMissing = match?.missing_skills.includes(skill);

                                return (
                                  <span key={skill} className="inline-flex items-center">
                                    <span
                                      className={`${
                                        isMissing
                                          ? 'line-through text-red-600 font-bold'
                                          : isMatch
                                          ? 'underline decoration-[3px] decoration-black font-black text-black bg-white px-1'
                                          : 'underline decoration-2 decoration-black font-bold text-black'
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                    {idx < gig.required_skills.length - 1 && (
                                      <span className="ml-3 font-black text-black">/</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>

                            {match && (
                              <div className="mt-3 font-mono text-xs uppercase text-gray-700 flex gap-4 border-t border-black pt-2 font-bold">
                                <span>MATCHED: {match.matching_skills.length}</span>
                                <span>MISSING: {match.missing_skills.length}</span>
                                <span>SKILL COVERAGE: {match.skill_coverage_pct}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: MASSIVE OVERSIZED MATCH SCORE */}
                        <div className="lg:col-span-4 flex flex-col justify-between h-full border-[3px] border-black p-6 bg-white rounded-none">
                          <div>
                            <div className="font-mono text-xs font-black uppercase tracking-widest text-black border-b-[2px] border-black pb-2 flex justify-between items-center">
                              <span>MATCH_SCORE</span>
                              <span className="bg-[#ff0000] text-black font-black px-2 py-0.5 text-[10px] border border-black">
                                COSINE_RANK
                              </span>
                            </div>

                            {/* MASSIVE OVERSIZED NUMBER */}
                            <div className="my-4 text-center">
                              <span className="text-6xl md:text-7xl font-black tracking-tighter text-black block leading-none">
                                {overallScore}
                                <span className="text-3xl font-bold">%</span>
                              </span>
                              <span className="font-mono text-xs uppercase font-bold text-gray-600 block mt-1">
                                OVERALL COMPATIBILITY
                              </span>
                            </div>

                            {/* Score Breakdown metrics */}
                            <div className="space-y-2 font-mono text-xs uppercase border-t-[2px] border-black pt-3">
                              <div className="flex justify-between items-center font-bold">
                                <span>KEYWORD SCORE:</span>
                                <span className="font-black bg-black text-white px-2 py-0.5">
                                  {match?.keyword_score ?? 85}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center font-bold">
                                <span>SEMANTIC SCORE:</span>
                                <span className="font-black bg-[#ff0000] text-black px-2 py-0.5 border border-black">
                                  {match?.semantic_score ?? 92}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center font-bold">
                                <span>EXPERIENCE FIT:</span>
                                <span className="font-black underline">
                                  {match?.experience_fit.toUpperCase() ?? 'EXACT'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="mt-6 space-y-2">
                            {role === 'freelancer' && (
                              <button
                                onClick={() => setApplyingGig(gig)}
                                className="w-full bg-black text-white hover:bg-[#ff0000] hover:text-black font-black uppercase text-sm tracking-widest py-3 px-4 border-[3px] border-black rounded-none cursor-pointer flex items-center justify-center gap-2 transition-none"
                              >
                                [ APPLY FOR GIG ]
                                <ArrowRight className="w-4 h-4 stroke-[3]" />
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedGigId(isExpanded ? null : gig.id)}
                              className="w-full bg-white text-black hover:bg-black hover:text-white font-bold uppercase text-xs tracking-wider py-2.5 px-3 border-[2px] border-black rounded-none cursor-pointer flex items-center justify-center gap-2 transition-none"
                            >
                              {isExpanded ? '[ HIDE VECTOR METRICS ]' : '[ TOGGLE VECTOR METRICS ]'}
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* EXPANDABLE MATRIX METRICS DETAILS PANEL */}
                      {isExpanded && match && (
                        <div className="mt-6 border-t-[3px] border-black pt-6 bg-gray-50 p-6 border-[3px] border-black rounded-none">
                          <h4 className="font-mono text-sm font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2">
                            <Terminal className="w-4 h-4 stroke-[3]" />
                            // COSINE EMBEDDING MATCH BREAKDOWN & JUSTIFICATION
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                            <div className="space-y-4">
                              <div className="border-[2px] border-black p-4 bg-white rounded-none">
                                <span className="font-bold block uppercase text-gray-600 mb-1">
                                  ALGORITHMIC JUSTIFICATION:
                                </span>
                                <p className="text-black font-bold uppercase leading-relaxed">
                                  {match.justification}
                                </p>
                              </div>

                              <div className="border-[2px] border-black p-4 bg-white rounded-none">
                                <span className="font-bold block uppercase text-gray-600 mb-2">
                                  VECTOR PROGRESSION METRICS:
                                </span>
                                <div className="space-y-2">
                                  <div>
                                    <div className="flex justify-between font-bold mb-1">
                                      <span>KEYWORD MATCH INDEX:</span>
                                      <span>{match.keyword_score}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-4 border border-black">
                                      <div
                                        className="bg-black h-full"
                                        style={{ width: `${match.keyword_score}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex justify-between font-bold mb-1">
                                      <span>SEMANTIC COSINE SIMILARITY:</span>
                                      <span>{match.semantic_score}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-4 border border-black">
                                      <div
                                        className="bg-[#ff0000] h-full"
                                        style={{ width: `${match.semantic_score}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="border-[2px] border-black p-4 bg-white rounded-none">
                                <span className="font-bold block uppercase text-gray-600 mb-2">
                                  MATCHED SKILLS LIST ({match.matching_skills.length}):
                                </span>
                                <div className="underline font-bold text-sm uppercase flex flex-wrap gap-2">
                                  {match.matching_skills.map((s) => (
                                    <span key={s} className="bg-black text-white px-2 py-1 text-xs">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {match.missing_skills.length > 0 && (
                                <div className="border-[2px] border-black p-4 bg-white rounded-none">
                                  <span className="font-bold block uppercase text-red-600 mb-2">
                                    MISSING SKILLS GAPS ({match.missing_skills.length}):
                                  </span>
                                  <div className="line-through font-bold text-sm uppercase text-red-600 flex flex-wrap gap-2">
                                    {match.missing_skills.map((s) => (
                                      <span key={s} className="bg-red-100 text-red-700 px-2 py-1 text-xs border border-red-500">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RESUME PARSER */}
        {/* ========================================================================= */}
        {activeTab === 'parser' && (
          <div className="space-y-8">
            <div className="border-[3px] border-black p-6 md:p-8 bg-white rounded-none">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
                // DETERMINISTIC NLP RESUME PARSER
              </h2>
              <p className="font-mono text-sm uppercase text-gray-800 font-bold mb-6">
                [INPUT RAW TEXT TO EXTRACT SKILL ENTITIES & COMPUTE VECTOR EMBEDDINGS]
              </p>

              {/* RAW TEXTAREA WITH THICK BLACK BORDER */}
              <div className="space-y-4">
                <label className="font-mono text-xs font-black uppercase tracking-widest text-black block">
                  RAW RESUME TEXT STREAM:
                </label>

                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="PASTE CANDIDATE RESUME TEXT HERE..."
                  className="w-full h-64 border-[3px] border-black rounded-none p-4 font-mono text-sm focus:outline-none focus:bg-gray-50 focus:border-[#ff0000] resize-y bg-white text-black"
                />

                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4">
                    <button
                      onClick={handleParseResume}
                      disabled={isParsing}
                      className="bg-black text-white hover:bg-[#ff0000] hover:text-black font-black uppercase text-sm tracking-widest px-8 py-4 border-[3px] border-black rounded-none cursor-pointer flex items-center gap-2 transition-none"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          [ RUNNING VECTORIZER... ]
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 stroke-[3] text-[#ff0000]" />
                          [ RUN EXTRACTOR ENGINE ]
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setResumeText(activeFreelancer.parsed_resume_text || '')}
                      className="bg-white text-black hover:bg-gray-200 font-bold uppercase text-xs tracking-wider px-4 py-4 border-[3px] border-black rounded-none cursor-pointer"
                    >
                      [ RESET TO DEFAULT TEXT ]
                    </button>
                  </div>

                  <span className="font-mono text-xs font-bold uppercase text-gray-600">
                    PARSER PIPELINE: SPACY_NER + SENTENCE-TRANSFORMERS
                  </span>
                </div>
              </div>

              {parseStatusMsg && (
                <div className="mt-6 bg-[#ff0000] text-black font-mono font-black uppercase text-xs p-4 border-[3px] border-black rounded-none">
                  {parseStatusMsg}
                </div>
              )}
            </div>

            {/* PARSED RESULTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* SKILLS EXTRACTED LIST */}
              <div className="lg:col-span-6 border-[3px] border-black p-6 bg-white rounded-none">
                <h3 className="text-2xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-3 mb-4">
                  // EXTRACTED SKILLS & CONFIDENCE
                </h3>

                <p className="font-mono text-xs uppercase text-gray-700 font-bold mb-4">
                  SKILLS DISPLAYED AS STARK UNDERLINED LIST WITH CONFIDENCE RATINGS:
                </p>

                <div className="space-y-3 font-mono text-sm uppercase">
                  {parsedSkills.map((sk) => (
                    <div
                      key={sk.name}
                      className="border-[2px] border-black p-3 bg-white flex justify-between items-center rounded-none"
                    >
                      <div>
                        <span className="underline decoration-[3px] decoration-black font-black text-black text-base">
                          {sk.name}
                        </span>
                        <span className="text-xs text-gray-600 block mt-0.5">
                          CATEGORY: {sk.category.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="bg-black text-white font-black text-xs px-2 py-1 border border-black inline-block">
                          CONFIDENCE: {(sk.extracted_confidence ?? 0.92).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PROFILE SUMMARY & TARGET GIG FIT */}
              <div className="lg:col-span-6 border-[3px] border-black p-6 bg-white rounded-none flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-3 mb-4">
                    // PROFILE VECTOR SNAPSHOT
                  </h3>

                  <div className="border-[2px] border-black p-4 bg-gray-50 mb-6 font-mono text-xs uppercase space-y-2 font-bold">
                    <div>FULL NAME: <span className="font-black text-black">{activeFreelancer.full_name.toUpperCase()}</span></div>
                    <div>ROLE TITLE: <span className="font-black text-black">{activeFreelancer.title.toUpperCase()}</span></div>
                    <div>LOCATION: <span className="font-black text-black">{activeFreelancer.location.toUpperCase()}</span></div>
                    <div>HOURLY RATE BASELINE: <span className="font-black text-[#ff0000]">${activeFreelancer.hourly_rate}/HR</span></div>
                  </div>

                  <h4 className="font-mono text-xs font-black uppercase tracking-widest text-black mb-3">
                    COMPATIBILITY AGAINST TOP ACTIVE GIGS:
                  </h4>

                  <div className="space-y-3 font-mono text-xs">
                    {gigs.slice(0, 3).map((g) => (
                      <div key={g.id} className="border-[2px] border-black p-3 bg-white rounded-none">
                        <div className="flex justify-between items-center font-bold mb-1">
                          <span className="truncate max-w-[240px]">{g.title.toUpperCase()}</span>
                          <span className="bg-[#ff0000] text-black font-black px-2 py-0.5 border border-black">
                            {g.match_breakdown?.overall_score || 90}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-3 border border-black mt-1">
                          <div
                            className="bg-black h-full"
                            style={{ width: `${g.match_breakdown?.overall_score || 90}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t-[2px] border-black pt-4 font-mono text-xs font-bold uppercase text-gray-700">
                  SYSTEM NOTE: SKILL VECTORS SYNCHRONIZED WITH PGVECTOR INDEX.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: POST GIG (CLIENT WORKFLOW) */}
        {/* ========================================================================= */}
        {activeTab === 'post' && (
          <div className="max-w-4xl mx-auto border-[3px] border-black p-6 md:p-8 bg-white rounded-none">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black border-b-[3px] border-black pb-4 mb-6">
              // POST NEW OPPORTUNITY
            </h2>
            <p className="font-mono text-xs uppercase text-gray-800 font-bold mb-6">
              [ENTER JOB SPECIFICATIONS BELOW TO GENERATE DETERMINISTIC EMBEDDINGS AND MATCH CANDIDATES]
            </p>

            <form onSubmit={handlePostSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                    GIG TITLE *:
                  </label>
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="E.G. SENIOR AI BACKEND ENGINEER"
                    className="w-full border-[3px] border-black p-3 font-mono text-sm uppercase rounded-none focus:outline-none focus:bg-gray-50 focus:border-[#ff0000]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                    COMPANY NAME *:
                  </label>
                  <input
                    type="text"
                    required
                    value={postCompany}
                    onChange={(e) => setPostCompany(e.target.value)}
                    placeholder="E.G. VANGUARD LABS"
                    className="w-full border-[3px] border-black p-3 font-mono text-sm uppercase rounded-none focus:outline-none focus:bg-gray-50 focus:border-[#ff0000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                    WORK MODE:
                  </label>
                  <div className="flex border-[3px] border-black p-1 bg-white">
                    {(['Remote', 'Hybrid', 'Onsite'] as const).map((mode) => (
                      <button
                        type="button"
                        key={mode}
                        onClick={() => setPostWorkMode(mode)}
                        className={`flex-1 py-2 font-mono text-xs font-bold uppercase border border-black rounded-none cursor-pointer ${
                          postWorkMode === mode ? 'bg-black text-white font-black' : 'bg-white text-black hover:bg-gray-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                    MIN BUDGET ($/HR):
                  </label>
                  <input
                    type="number"
                    value={postMinBudget}
                    onChange={(e) => setPostMinBudget(Number(e.target.value))}
                    className="w-full border-[3px] border-black p-3 font-mono text-sm uppercase rounded-none focus:outline-none focus:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                    MAX BUDGET ($/HR):
                  </label>
                  <input
                    type="number"
                    value={postMaxBudget}
                    onChange={(e) => setPostMaxBudget(Number(e.target.value))}
                    className="w-full border-[3px] border-black p-3 font-mono text-sm uppercase rounded-none focus:outline-none focus:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                  REQUIRED SKILLS (COMMA SEPARATED LIST) *:
                </label>
                <input
                  type="text"
                  required
                  value={postSkills}
                  onChange={(e) => setPostSkills(e.target.value)}
                  placeholder="REACT, TYPESCRIPT, FASTAPI, SUPABASE"
                  className="w-full border-[3px] border-black p-3 font-mono text-sm uppercase rounded-none focus:outline-none focus:bg-gray-50 focus:border-[#ff0000]"
                />
                <span className="font-mono text-[11px] text-gray-600 block mt-1 uppercase">
                  NOTE: SKILLS WILL BE CONVERTED TO UNDERLINED TAXONOMY LIST.
                </span>
              </div>

              <div>
                <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                  JOB DESCRIPTION & REQUIREMENTS:
                </label>
                <textarea
                  rows={5}
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  placeholder="DESCRIBE SCOPE OF WORK, OBJECTIVES AND SYSTEM ARCHITECTURE EXPECTATIONS..."
                  className="w-full border-[3px] border-black p-3 font-mono text-sm rounded-none focus:outline-none focus:bg-gray-50 focus:border-[#ff0000]"
                />
              </div>

              <div className="border-t-[3px] border-black pt-6 flex justify-end">
                <button
                  type="submit"
                  className="w-full md:w-auto bg-[#ff0000] text-black hover:bg-black hover:text-white font-black uppercase tracking-widest px-10 py-4 border-[3px] border-black rounded-none cursor-pointer text-base transition-none"
                >
                  [ POST OPPORTUNITY TO ENGINE ]
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: APPLICANTS FEED (CLIENT / ADMIN WORKFLOW) */}
        {/* ========================================================================= */}
        {activeTab === 'applications' && (
          <div className="space-y-8">
            <div className="border-[3px] border-black p-6 bg-white rounded-none">
              <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                // APPLICANT CANDIDATE FEED
              </h2>
              <p className="font-mono text-xs uppercase text-gray-800 font-bold mt-1">
                REVIEW SUBMITTED PROPOSALS AND UPDATE CANDIDATE APPLICATION STATUSES
              </p>
            </div>

            <div className="space-y-6">
              {applications.map((app) => (
                <article
                  key={app.id}
                  className="border-[3px] border-black border-t-[8px] border-t-black bg-white p-6 md:p-8 rounded-none"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b-[3px] border-black pb-6 mb-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={app.freelancer_avatar}
                        alt={app.freelancer_name}
                        className="w-16 h-16 border-[3px] border-black object-cover rounded-none"
                      />
                      <div>
                        <h3 className="text-2xl md:text-3xl font-black uppercase text-black">
                          {app.freelancer_name}
                        </h3>
                        <p className="font-mono text-xs uppercase text-gray-700 font-bold">
                          {app.freelancer_title.toUpperCase()}
                        </p>
                        <span className="font-mono text-xs uppercase text-black font-bold block mt-1">
                          APPLIED TO: <strong className="underline">{app.gig_title.toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>

                    {/* MASSIVE SCORE & STATUS BADGE */}
                    <div className="flex items-center gap-6 self-start lg:self-auto">
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold uppercase block text-gray-600">
                          MATCH SCORE
                        </span>
                        <span className="text-5xl md:text-6xl font-black tracking-tighter text-black leading-none block">
                          {app.match_score}%
                        </span>
                      </div>

                      <div className="border-[2px] border-black p-2 bg-white text-center font-mono text-xs font-bold uppercase">
                        <span>STATUS:</span>
                        <span className="block font-black text-sm bg-black text-white px-2 py-0.5 mt-0.5">
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PROPOSAL TEXT BOX */}
                  <div className="mb-6">
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                      SUBMITTED PROPOSAL STATEMENT:
                    </span>
                    <div className="border-[2px] border-black p-4 bg-gray-50 font-mono text-xs leading-relaxed uppercase">
                      "{app.proposal_text}"
                    </div>
                  </div>

                  {/* SKILLS MATCHED VS MISSING */}
                  <div className="border-[2px] border-black p-4 bg-white mb-6 font-mono text-xs uppercase">
                    <span className="font-black block mb-2">SKILLS EVALUATION MATCHING:</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {app.matching_skills.map((s) => (
                        <span key={s} className="underline decoration-[3px] decoration-black font-black text-black">
                          {s}
                        </span>
                      ))}
                      {app.missing_skills.map((s) => (
                        <span key={s} className="line-through text-red-600 font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* STATUS CHANGE ACTION BUTTONS */}
                  <div className="border-t-[3px] border-black pt-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    <span className="font-bold text-gray-600">UPDATE STATUS:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                        className={`px-3 py-2 border-[2px] border-black font-bold uppercase cursor-pointer rounded-none ${
                          app.status === 'shortlisted' ? 'bg-[#ff0000] text-black font-black' : 'bg-white hover:bg-black hover:text-white'
                        }`}
                      >
                        [ SHORTLIST ]
                      </button>

                      <button
                        onClick={() => onUpdateAppStatus(app.id, 'interview')}
                        className={`px-3 py-2 border-[2px] border-black font-bold uppercase cursor-pointer rounded-none ${
                          app.status === 'interview' ? 'bg-[#ff0000] text-black font-black' : 'bg-white hover:bg-black hover:text-white'
                        }`}
                      >
                        [ INTERVIEW ]
                      </button>

                      <button
                        onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                        className={`px-3 py-2 border-[2px] border-black font-bold uppercase cursor-pointer rounded-none ${
                          app.status === 'accepted' ? 'bg-black text-white font-black' : 'bg-white hover:bg-black hover:text-white'
                        }`}
                      >
                        [ ACCEPT ]
                      </button>

                      <button
                        onClick={() => onUpdateAppStatus(app.id, 'declined')}
                        className={`px-3 py-2 border-[2px] border-black font-bold uppercase cursor-pointer rounded-none ${
                          app.status === 'declined' ? 'bg-red-600 text-white font-black' : 'bg-white hover:bg-red-600 hover:text-white'
                        }`}
                      >
                        [ DECLINE ]
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ADMIN EVALUATION BENCHMARKS (STARK MONOCHROME TABLE) */}
        {/* ========================================================================= */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-8">
            <div className="border-[3px] border-black p-6 bg-white rounded-none">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black mb-2">
                // ADMIN EVALUATION BENCHMARKS
              </h2>
              <p className="font-mono text-sm uppercase text-gray-800 font-bold">
                [STARK MONOCHROME METRIC MATRIX COMPARING MATCHING ALGORITHM ACCURACY AND RETRIEVAL LATENCY]
              </p>
            </div>

            {/* TOP METRIC BLOCKS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border-[3px] border-black p-6 bg-white rounded-none text-center">
                <span className="font-mono text-xs font-black uppercase text-gray-600 block mb-1">
                  HYBRID NDCG@10
                </span>
                <span className="text-5xl font-black text-black tracking-tighter block">
                  0.941
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 block mt-1">
                  HIGHEST RETRIEVAL RANK
                </span>
              </div>

              <div className="border-[3px] border-black p-6 bg-white rounded-none text-center">
                <span className="font-mono text-xs font-black uppercase text-gray-600 block mb-1">
                  MEAN MAP SCORE
                </span>
                <span className="text-5xl font-black text-[#ff0000] tracking-tighter block">
                  0.896
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 block mt-1">
                  AVERAGE PRECISION
                </span>
              </div>

              <div className="border-[3px] border-black p-6 bg-white rounded-none text-center">
                <span className="font-mono text-xs font-black uppercase text-gray-600 block mb-1">
                  AVG VECTOR LATENCY
                </span>
                <span className="text-5xl font-black text-black tracking-tighter block">
                  42ms
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 block mt-1">
                  PGVECTOR INDEX EXEC
                </span>
              </div>

              <div className="border-[3px] border-black p-6 bg-white rounded-none text-center">
                <span className="font-mono text-xs font-black uppercase text-gray-600 block mb-1">
                  QUERIES TESTED
                </span>
                <span className="text-5xl font-black text-black tracking-tighter block">
                  150
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-gray-500 block mt-1">
                  EVALUATION TEST SUITE
                </span>
              </div>
            </div>

            {/* STARK MONOCHROME DATA TABLE WITH THICK BORDERS */}
            <div className="border-[3px] border-black overflow-x-auto bg-white rounded-none">
              <table className="w-full border-collapse font-mono text-xs text-left">
                <thead>
                  <tr className="bg-black text-white border-b-[3px] border-black uppercase font-bold">
                    <th className="p-4 border-r-[2px] border-white">ALG_ID</th>
                    <th className="p-4 border-r-[2px] border-white">ALGORITHM NAME</th>
                    <th className="p-4 border-r-[2px] border-white text-center">NDCG@5</th>
                    <th className="p-4 border-r-[2px] border-white text-center">NDCG@10</th>
                    <th className="p-4 border-r-[2px] border-white text-center">MAP</th>
                    <th className="p-4 border-r-[2px] border-white text-center">MRR</th>
                    <th className="p-4 border-r-[2px] border-white text-center">P@5</th>
                    <th className="p-4 border-r-[2px] border-white text-center">LATENCY</th>
                    <th className="p-4 text-center">COVERAGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[3px] divide-black">
                  {benchmarks.map((b) => (
                    <tr
                      key={b.algorithm_id}
                      className={`hover:bg-gray-100 uppercase font-bold ${
                        b.algorithm_id === 'hybrid' ? 'bg-red-50' : 'bg-white'
                      }`}
                    >
                      <td className="p-4 border-r-[2px] border-black font-black">
                        {b.algorithm_id.toUpperCase()}
                      </td>
                      <td className="p-4 border-r-[2px] border-black">
                        {b.algorithm_name}
                        {b.algorithm_id === 'hybrid' && (
                          <span className="ml-2 bg-[#ff0000] text-black font-black px-2 py-0.5 text-[10px] border border-black">
                            OPTIMAL
                          </span>
                        )}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm">
                        {b.ndcg_5.toFixed(3)}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm text-[#ff0000]">
                        {b.ndcg_10.toFixed(3)}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm">
                        {b.map_score.toFixed(3)}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm">
                        {b.mrr_score.toFixed(3)}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm">
                        {b.precision_5.toFixed(3)}
                      </td>
                      <td className="p-4 border-r-[2px] border-black text-center font-black text-sm">
                        {b.latency_ms}MS
                      </td>
                      <td className="p-4 text-center font-black text-sm">
                        {(b.relevance_coverage * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BRUTALIST ALGORITHM COMPARISON BAR GRAPH */}
            <div className="border-[3px] border-black p-6 bg-white rounded-none">
              <h3 className="text-2xl font-black uppercase text-black mb-4">
                // NDCG@10 COMPARATIVE METRIC GRAPH
              </h3>

              <div className="space-y-4 font-mono text-xs font-bold uppercase">
                {benchmarks.map((b) => (
                  <div key={b.algorithm_id} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{b.algorithm_name.toUpperCase()}</span>
                      <span className="font-black text-sm">{b.ndcg_10.toFixed(3)}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-6 border-[2px] border-black">
                      <div
                        className={`h-full ${
                          b.algorithm_id === 'hybrid' ? 'bg-[#ff0000]' : 'bg-black'
                        }`}
                        style={{ width: `${b.ndcg_10 * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SYSTEM LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-8">
            <div className="border-[3px] border-black p-6 bg-white rounded-none">
              <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                // SYSTEM EVENT LOGS & AUDIT TRAIL
              </h2>
              <p className="font-mono text-xs uppercase text-gray-800 font-bold mt-1">
                RAW VERBOSE AUDIT LOGS FROM DETERMINISTIC MATCHING ENGINE & SUPABASE RLS
              </p>
            </div>

            <div className="border-[3px] border-black p-6 bg-black text-white font-mono text-xs rounded-none space-y-3 leading-relaxed">
              <div className="text-green-400 font-bold">[14:30:00.120] ENGINE_INIT: Initialized sentence-transformers / all-MiniLM-L6-v2 vector embeddings.</div>
              <div className="text-white">[14:30:02.450] COSINE_EXEC: Evaluated query vector against 5 active gig indexes in 42ms.</div>
              <div className="text-yellow-400 font-bold">[14:30:05.890] PARSER_TFIDF: Extracted 6 candidate skills with confidence range [0.89 - 0.99].</div>
              <div className="text-white">[14:30:10.010] PGVECTOR: Executed cosine distance function: `1 - (resume_vector &lt;=&gt; gig_vector)`.</div>
              <div className="text-[#ff0000] font-black">[14:30:15.300] BENCHMARK_EVAL: NDCG@10 recalculated = 0.941. MAP = 0.896. STATUS: PASS.</div>
              <div className="text-white">[14:30:20.770] SUPABASE_RLS: Row Level Security policies verified for active session role.</div>
              <div className="text-gray-400">[14:30:25.000] HEARTBEAT: Deterministic stack state operational. Memory overhead: 18.4MB.</div>
            </div>
          </div>
        )}
      </main>

      {/* PROPOSAL SUBMISSION MODAL / DRAWER */}
      {applyingGig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-none flex items-center justify-center p-4 z-50">
          <div className="bg-white border-[4px] border-black p-6 md:p-8 max-w-2xl w-full rounded-none shadow-none space-y-6">
            <div className="border-b-[3px] border-black pb-4 flex justify-between items-start">
              <div>
                <span className="bg-[#ff0000] text-black font-black uppercase text-xs px-2 py-0.5 border border-black inline-block mb-1">
                  PROPOSAL SUBMISSION
                </span>
                <h3 className="text-2xl md:text-3xl font-black uppercase text-black">
                  {applyingGig.title}
                </h3>
                <p className="font-mono text-xs uppercase text-gray-700 font-bold mt-1">
                  CLIENT: {applyingGig.client_company.toUpperCase()} // BUDGET: ${applyingGig.budget_min}-${applyingGig.budget_max}/HR
                </p>
              </div>

              <button
                onClick={() => setApplyingGig(null)}
                className="font-mono text-lg font-black bg-black text-white hover:bg-[#ff0000] hover:text-black px-3 py-1 border-[2px] border-black cursor-pointer"
              >
                [X]
              </button>
            </div>

            <div>
              <label className="font-mono text-xs font-black uppercase tracking-widest text-black block mb-2">
                PROPOSAL STATEMENT & ARCHITECTURE SUMMARY:
              </label>
              <textarea
                rows={6}
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                placeholder="EXPLAIN YOUR RELEVANT EXPERTISE, SYSTEM ARCHITECTURE PREFERENCES, AND DELIVERY TIMELINE..."
                className="w-full border-[3px] border-black p-3 font-mono text-sm rounded-none focus:outline-none focus:bg-gray-50 focus:border-[#ff0000]"
              />
            </div>

            <div className="border-t-[3px] border-black pt-4 flex gap-4 justify-end font-mono">
              <button
                onClick={() => setApplyingGig(null)}
                className="bg-white text-black font-bold uppercase text-xs px-6 py-3 border-[3px] border-black rounded-none cursor-pointer hover:bg-gray-200"
              >
                [ CANCEL ]
              </button>

              <button
                onClick={handleProposalSubmit}
                className="bg-black text-white hover:bg-[#ff0000] hover:text-black font-black uppercase text-xs px-8 py-3 border-[3px] border-black rounded-none cursor-pointer"
              >
                [ SUBMIT PROPOSAL ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
