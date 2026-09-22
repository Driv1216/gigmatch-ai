import React, { useState, useEffect } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile, Skill } from '../../types';
import {
  Sparkles,
  Search,
  Filter,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Upload,
  RefreshCw,
  BarChart3,
  Layers,
  Plus,
  AlertCircle,
  User,
  Building,
  MapPin,
  DollarSign,
  Cpu,
  Activity,
  TrendingUp,
  Sliders,
  Check,
  Star,
  Eye,
  Info,
  SlidersHorizontal,
  BrainCircuit,
  Terminal,
  CheckCheck
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

export const AuroraDark: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  // Navigation tab state based on active role default
  const [activeTab, setActiveTab] = useState<'discover' | 'parser' | 'applicants' | 'post' | 'benchmarks'>('discover');

  // Set default tab on role switch
  useEffect(() => {
    if (role === 'client') {
      setActiveTab('applicants');
    } else if (role === 'admin') {
      setActiveTab('benchmarks');
    } else {
      setActiveTab('discover');
    }
  }, [role]);

  // Gig Discovery Filters & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [inspectGig, setInspectGig] = useState<Gig | null>(null);
  const [appliedGigIds, setAppliedGigIds] = useState<Set<string>>(new Set());

  // Resume Parser state
  const activeFreelancer = freelancers[0] || null;
  const [resumeText, setResumeText] = useState<string>(
    activeFreelancer?.parsed_resume_text ||
      `Senior Full Stack Engineer with 7+ years of experience specializing in React, TypeScript, Node.js, and Python backend services. Proven track record in building high-throughput machine learning inference APIs with FastAPI and PyTorch. Expert in PostgreSQL database tuning, AWS ECS microservices, and Tailwind CSS design systems.`
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState(0);
  const [parsedSkills, setParsedSkills] = useState<Skill[]>(activeFreelancer?.skills || []);
  const [hasParsed, setHasParsed] = useState(false);

  // Client Post Gig state
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('Vanguard Labs AI');
  const [newSkillsInput, setNewSkillsInput] = useState('React, TypeScript, Python, PyTorch');
  const [newBudgetMin, setNewBudgetMin] = useState('90');
  const [newBudgetMax, setNewBudgetMax] = useState('140');
  const [newWorkMode, setNewWorkMode] = useState<'Remote' | 'Hybrid' | 'Onsite'>('Remote');
  const [newDescription, setNewDescription] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  // Client Application Filter
  const [selectedGigIdForApps, setSelectedGigIdForApps] = useState<string>('all');

  // Admin Benchmark algorithm selection
  const [activeAlgo, setActiveAlgo] = useState<'keyword' | 'semantic' | 'hybrid'>('hybrid');

  // Filtered Gigs
  const filteredGigs = gigs.filter((gig) => {
    const matchesSearch =
      gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.client_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || gig.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesWorkMode = selectedWorkMode === 'all' || gig.work_mode.toLowerCase() === selectedWorkMode.toLowerCase();
    const matchesMinScore = (gig.match_breakdown?.overall_score || 75) >= minScore;

    return matchesSearch && matchesCategory && matchesWorkMode && matchesMinScore;
  });

  // Extract unique categories
  const categories = Array.from(new Set(gigs.map((g) => g.category)));

  // Resume Parsing simulation function
  const handleSimulateParsing = () => {
    setIsParsing(true);
    setHasParsed(false);
    setParsingStep(1);

    setTimeout(() => setParsingStep(2), 500);
    setTimeout(() => setParsingStep(3), 1000);
    setTimeout(() => {
      setIsParsing(false);
      setHasParsed(true);
      setParsingStep(0);

      // Create rich parsed skills
      const extracted: Skill[] = [
        { name: 'React', category: 'frontend', proficiency: 'expert', extracted_confidence: 0.98, experience_years: 6 },
        { name: 'TypeScript', category: 'frontend', proficiency: 'expert', extracted_confidence: 0.96, experience_years: 5 },
        { name: 'FastAPI', category: 'backend', proficiency: 'advanced', extracted_confidence: 0.92, experience_years: 3 },
        { name: 'PyTorch', category: 'ai_ml', proficiency: 'advanced', extracted_confidence: 0.89, experience_years: 3 },
        { name: 'PostgreSQL', category: 'database', proficiency: 'advanced', extracted_confidence: 0.91, experience_years: 4 },
        { name: 'AWS ECS', category: 'devops', proficiency: 'intermediate', extracted_confidence: 0.85, experience_years: 2 },
        { name: 'Tailwind CSS', category: 'frontend', proficiency: 'expert', extracted_confidence: 0.95, experience_years: 4 },
      ];
      setParsedSkills(extracted);
    }, 1600);
  };

  // Post gig submit
  const handlePostGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const skillsArray = newSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onPostGig({
      title: newTitle,
      client_company: newCompany,
      required_skills: skillsArray.length > 0 ? skillsArray : ['React', 'TypeScript'],
      budget_min: Number(newBudgetMin) || 80,
      budget_max: Number(newBudgetMax) || 120,
      work_mode: newWorkMode,
      description: newDescription || 'Seeking experienced engineer for high impact project.',
    });

    setPostSuccess(true);
    setTimeout(() => {
      setPostSuccess(false);
      setNewTitle('');
      setNewDescription('');
      setActiveTab('applicants');
    }, 1500);
  };

  // Toggle apply gig
  const handleApplyGig = (gigId: string) => {
    setAppliedGigIds((prev) => {
      const next = new Set(prev);
      if (next.has(gigId)) {
        next.delete(gigId);
      } else {
        next.add(gigId);
      }
      return next;
    });
  };

  // Filtered applications for Client
  const filteredApps = applications.filter((app) => {
    if (selectedGigIdForApps === 'all') return true;
    return app.gig_id === selectedGigIdForApps;
  });

  return (
    <div className="min-h-screen bg-[#111111] text-[#e8e6e3] font-sans antialiased relative selection:bg-violet-500/30 selection:text-white">
      {/* Aurora Ambient Backdrop Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-teal-500/10 blur-[120px] rounded-full opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/10 via-violet-600/5 to-fuchsia-600/10 blur-[120px] rounded-full opacity-40" />
      </div>

      {/* Top Aurora Line Header */}
      <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 relative z-20" />

      {/* Header Container */}
      <header className="relative z-10 border-b border-[#222222] bg-[#111111]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Logo & Vision Headline */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18181a] border border-[#26262a] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 via-fuchsia-500/10 to-teal-400/20 opacity-80" />
                <Sparkles className="w-5 h-5 text-[#e8e6e3] relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-[#e8e6e3]">GIGMATCH</span>
                  <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                    Aurora Dark
                  </span>
                </div>
                <p className="text-xs text-white/50 font-normal">
                  Vector Match Engine & Candidate Intelligence
                </p>
              </div>
            </div>

            {/* Aurora Pill Navigation Bar */}
            <nav className="inline-flex items-center p-1 rounded-full bg-[#18181a] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] self-start md:self-auto">
              <button
                onClick={() => setActiveTab('discover')}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'discover'
                    ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Discover Gigs</span>
              </button>

              <button
                onClick={() => setActiveTab('parser')}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'parser'
                    ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Resume Parser</span>
              </button>

              <button
                onClick={() => setActiveTab('applicants')}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'applicants'
                    ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <UsersIcon className="w-3.5 h-3.5" />
                <span>Client Hub</span>
              </button>

              <button
                onClick={() => setActiveTab('post')}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'post'
                    ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Gig</span>
              </button>

              <button
                onClick={() => setActiveTab('benchmarks')}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                  activeTab === 'benchmarks'
                    ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/25'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Admin Eval</span>
              </button>
            </nav>

            {/* Current Active Role Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161618] border border-[#26262a] text-xs text-white/70">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-medium text-white/40 uppercase tracking-widest text-[10px]">Role:</span>
              <span className="font-semibold text-[#e8e6e3] capitalize">{role}</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* TAB 1: GIG DISCOVERY */}
        {activeTab === 'discover' && (
          <div className="space-y-8">

            {/* Top Discovery Hero Banner */}
            <div className="relative bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 md:p-8 overflow-hidden">
              <div className="max-w-2xl space-y-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-white/80">
                  <Zap className="w-3.5 h-3.5 text-teal-400" />
                  <span>Real-time Semantic & Keyword Vector Scoring</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#e8e6e3]">
                  High-Precision Gig Opportunities
                </h1>
                <p className="text-sm text-white/60 leading-relaxed font-normal">
                  Our hybrid vector matcher analyzes candidates against project requirements, yielding dense match scores with transparent skill gap analysis.
                </p>
              </div>

              {/* Minimalist Summary Badges */}
              <div className="mt-6 pt-6 border-t border-[#222222] grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-white/40 font-medium">Available Gigs</span>
                  <span className="text-xl font-bold text-[#e8e6e3]">{gigs.length}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-white/40 font-medium">Top Match Score</span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-teal-300">
                    96%
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-white/40 font-medium">Avg Latency</span>
                  <span className="text-xl font-bold text-[#e8e6e3]">18ms</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-white/40 font-medium">Active Freelancer</span>
                  <span className="text-xl font-bold text-[#e8e6e3]">{activeFreelancer?.full_name || 'Alex Morgan'}</span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">

              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by gig title, company, or required skill (e.g. React, PyTorch)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111111] border border-[#26262a] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e8e6e3] placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Dropdowns & Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Category Selector */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#111111] border border-[#26262a] rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50 transition-colors"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Work Mode Filter */}
                <div className="flex items-center p-1 rounded-xl bg-[#111111] border border-[#26262a]">
                  {['all', 'Remote', 'Hybrid', 'Onsite'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedWorkMode(mode)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedWorkMode === mode
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {mode === 'all' ? 'All Modes' : mode}
                    </button>
                  ))}
                </div>

                {/* Score Slider */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111111] border border-[#26262a] rounded-xl">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Min Score:</span>
                  <span className="text-xs font-bold text-teal-400 w-8">{minScore}%</span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-20 accent-teal-400 bg-white/10"
                  />
                </div>
              </div>
            </div>

            {/* Gig Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGigs.map((gig) => {
                const score = gig.match_breakdown?.overall_score || 85;
                const isApplied = appliedGigIds.has(gig.id);

                return (
                  <div
                    key={gig.id}
                    className="relative bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 overflow-hidden group hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Left-side 3px Aurora Accent Line */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-teal-400" />

                    <div className="space-y-4">
                      {/* Top Row: Company Info & Budget */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={gig.client_avatar}
                            alt={gig.client_company}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10"
                          />
                          <div>
                            <h3 className="font-bold text-base text-[#e8e6e3] group-hover:text-white transition-colors">
                              {gig.title}
                            </h3>
                            <p className="text-xs text-white/50">{gig.client_company} • {gig.location}</p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-semibold text-white/90 shrink-0">
                          ${gig.budget_min}-${gig.budget_max}/hr
                        </span>
                      </div>

                      {/* Description snippet */}
                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed font-normal">
                        {gig.description}
                      </p>

                      {/* Required Ghost Skill Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {gig.required_skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-transparent border border-white/20 text-white/80 hover:border-white/40 transition-colors"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {/* Match Score Display */}
                      <div className="pt-3 border-t border-[#222222] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-violet-400" />
                            Match Fit Score
                          </span>
                          <span className="font-extrabold text-xs text-[#e8e6e3] tracking-tight">
                            {score}% Match
                          </span>
                        </div>

                        {/* Thin Aurora Progress Bar */}
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-between gap-3">
                      <button
                        onClick={() => setInspectGig(gig)}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Fit</span>
                      </button>

                      <button
                        onClick={() => handleApplyGig(gig.id)}
                        className={`px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                          isApplied
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md shadow-violet-500/20 hover:opacity-95'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            Applied
                          </>
                        ) : (
                          <>
                            <span>Apply Now</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: RESUME PARSER CONSOLE */}
        {activeTab === 'parser' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 md:p-8 space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#222222] pb-6">
                <div>
                  <div className="flex items-center gap-2 text-violet-400 text-xs font-medium tracking-widest uppercase mb-1">
                    <BrainCircuit className="w-4 h-4" />
                    <span>Neural Skill Extractor</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#e8e6e3] tracking-tight">
                    AI Resume Parsing & Skill Vectorizer
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                  Model: Claude-Vector-v4
                </span>
              </div>

              {/* Text Input Console */}
              <div className="space-y-3">
                <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                  Paste Resume Raw Text / Bio
                </label>
                <textarea
                  rows={6}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your CV text here..."
                  className="w-full bg-[#111111] border border-[#26262a] rounded-xl p-4 text-xs font-mono text-[#e8e6e3] focus:outline-none focus:border-violet-500/50 leading-relaxed transition-colors"
                />
              </div>

              {/* Parse Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSimulateParsing}
                  disabled={isParsing}
                  className="px-6 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 hover:opacity-95 shadow-lg shadow-violet-500/20 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Parsing Profile...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract & Vectorize Profile</span>
                    </>
                  )}
                </button>

                {hasParsed && (
                  <span className="text-xs text-teal-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Successfully Extracted 7 Verified Skills
                  </span>
                )}
              </div>

              {/* Parsing Loading Step Indicator */}
              {isParsing && (
                <div className="p-4 rounded-xl bg-[#111111] border border-[#26262a] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 font-medium">
                      {parsingStep === 1 && 'Tokenizing resume text & cleaning artifacts...'}
                      {parsingStep === 2 && 'Extracting skill entities & taxonomy matching...'}
                      {parsingStep === 3 && 'Generating 1536-dim vector embeddings & confidence levels...'}
                    </span>
                    <span className="text-violet-400 font-mono font-bold">Step {parsingStep}/3</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${(parsingStep / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Skill Tags with Fade-in Effect */}
              {parsedSkills.length > 0 && (
                <div className="pt-4 border-t border-[#222222] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50">
                      Extracted Skill Taxonomy ({parsedSkills.length})
                    </h3>
                    <span className="text-[10px] text-white/40">Confidence Range: 85% - 98%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedSkills.map((skill, idx) => {
                      const confidencePct = Math.round((skill.extracted_confidence || 0.9) * 100);
                      return (
                        <div
                          key={skill.name}
                          className="bg-[#111111] border border-[#26262a] rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                          style={{
                            animation: `fadeIn 0.4s ease-out ${idx * 0.08}s both`,
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#e8e6e3]">{skill.name}</span>
                              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                                {skill.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40">
                              {skill.experience_years ? `${skill.experience_years} yrs exp` : 'Verified proficiency'}
                            </p>
                          </div>

                          {/* Thin Progress bar & confidence label */}
                          <div className="w-24 text-right space-y-1">
                            <span className="text-[10px] font-mono font-bold text-teal-400">{confidencePct}%</span>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full"
                                style={{ width: `${confidencePct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 3: CLIENT APPLICANTS MANAGEMENT */}
        {activeTab === 'applicants' && (
          <div className="space-y-8">

            {/* Header & Filter by Gig */}
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#e8e6e3]">Client Candidate Pipeline</h2>
                <p className="text-xs text-white/50">Review candidate match scores and update hiring status</p>
              </div>

              {/* Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 uppercase tracking-widest font-medium">Filter Opportunity:</span>
                <select
                  value={selectedGigIdForApps}
                  onChange={(e) => setSelectedGigIdForApps(e.target.value)}
                  className="bg-[#111111] border border-[#26262a] rounded-xl px-3 py-2 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                >
                  <option value="all">All Opportunities ({applications.length})</option>
                  {gigs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {filteredApps.map((app) => {
                return (
                  <div
                    key={app.id}
                    className="relative bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 overflow-hidden hover:border-zinc-700/80 transition-all space-y-4"
                  >
                    {/* Left Aurora Border */}
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-teal-400" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      {/* Candidate Avatar & Meta */}
                      <div className="flex items-center gap-4">
                        <img
                          src={app.freelancer_avatar}
                          alt={app.freelancer_name}
                          className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-[#e8e6e3]">{app.freelancer_name}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-white/5 border border-white/10 text-white/70">
                              {app.status}
                            </span>
                          </div>
                          <p className="text-xs text-white/50">{app.freelancer_title} • Applied for: <span className="text-white/80 font-medium">{app.gig_title}</span></p>
                        </div>
                      </div>

                      {/* Match Score Indicator */}
                      <div className="w-full md:w-56 space-y-1.5 bg-[#111111] p-3 rounded-xl border border-[#26262a]">
                        <div className="flex justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-widest text-white/40">AI Fit Score</span>
                          <span className="font-extrabold text-xs text-[#e8e6e3]">{app.match_score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full"
                            style={{ width: `${app.match_score}%` }}
                          />
                        </div>
                      </div>

                    </div>

                    {/* Proposal Snippet */}
                    <div className="p-3.5 rounded-xl bg-[#111111]/80 border border-[#26262a]/60 text-xs text-white/70 font-normal leading-relaxed">
                      "{app.proposal_text}"
                    </div>

                    {/* Matching vs Missing Skills */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium mr-1">Matching:</span>
                        {app.matching_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 border border-teal-500/30 text-teal-300"
                          >
                            ✓ {s}
                          </span>
                        ))}
                        {app.missing_skills.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300/80"
                          >
                            ! {s}
                          </span>
                        ))}
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            app.status === 'shortlisted'
                              ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                          }`}
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'interview')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            app.status === 'interview'
                              ? 'bg-teal-500/30 text-teal-300 border border-teal-500/50'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                          }`}
                        >
                          Interview
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            app.status === 'accepted'
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                          }`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onUpdateAppStatus(app.id, 'declined')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            app.status === 'declined'
                              ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                          }`}
                        >
                          Decline
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CLIENT POST GIG */}
        {activeTab === 'post' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 md:p-8 space-y-6">

              <div className="border-b border-[#222222] pb-6">
                <h2 className="text-xl font-bold text-[#e8e6e3] tracking-tight">Post New Opportunity</h2>
                <p className="text-xs text-white/50 mt-1">
                  Create a new role definition to trigger automatic vector match indexing
                </p>
              </div>

              {postSuccess && (
                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Gig posted successfully! Indexes updated in real-time.</span>
                </div>
              )}

              <form onSubmit={handlePostGigSubmit} className="space-y-6">
                {/* Title & Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                      Gig Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior AI Research Engineer"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="Company / Org Name"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                {/* Required Skills */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                    Required Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="React, TypeScript, PyTorch, FastAPI"
                    value={newSkillsInput}
                    onChange={(e) => setNewSkillsInput(e.target.value)}
                    className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Budget Min/Max & Work Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                      Min Budget ($/hr)
                    </label>
                    <input
                      type="number"
                      value={newBudgetMin}
                      onChange={(e) => setNewBudgetMin(e.target.value)}
                      className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                      Max Budget ($/hr)
                    </label>
                    <input
                      type="number"
                      value={newBudgetMax}
                      onChange={(e) => setNewBudgetMax(e.target.value)}
                      className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                      Work Mode
                    </label>
                    <select
                      value={newWorkMode}
                      onChange={(e) => setNewWorkMode(e.target.value as any)}
                      className="w-full bg-[#111111] border border-[#26262a] rounded-xl px-4 py-2.5 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Onsite">Onsite</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-widest text-white/50 font-medium">
                    Job Description & Scope
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe role responsibilities, team setup, and key deliverables..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-[#111111] border border-[#26262a] rounded-xl p-4 text-xs text-[#e8e6e3] focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-[#222222]">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-semibold text-xs tracking-wider uppercase text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 hover:opacity-95 shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publish & Vector Index Gig</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN EVALUATION BENCHMARKS */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-8">

            {/* Top Overview Bar */}
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                  <span>Evaluation Suite v3.2</span>
                </div>
                <h2 className="text-2xl font-bold text-[#e8e6e3] tracking-tight">
                  AI Retrieval Benchmarks & Model Evaluation
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Empirical evaluation of vector search precision, NDCG metrics, and latency across matching algorithms.
                </p>
              </div>

              {/* Algorithm Switcher */}
              <div className="flex items-center p-1.5 rounded-full bg-[#111111] border border-[#26262a] self-start md:self-auto">
                <button
                  onClick={() => setActiveAlgo('keyword')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activeAlgo === 'keyword'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  BM25 Keyword
                </button>
                <button
                  onClick={() => setActiveAlgo('semantic')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activeAlgo === 'semantic'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Dense Semantic
                </button>
                <button
                  onClick={() => setActiveAlgo('hybrid')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activeAlgo === 'hybrid'
                      ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 text-white shadow-md'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Hybrid Aurora (Active)
                </button>
              </div>
            </div>

            {/* Clean Dark Metrics Grid with Gradient Sparkline Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Metric 1: NDCG@5 */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">nDCG @ 5 Score</span>
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +4.2%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">0.892</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Rank Target</span>
                    <span>89.2%</span>
                  </div>
                  {/* Sparkline horizontal bar with Aurora gradient */}
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '89.2%' }} />
                  </div>
                </div>
              </div>

              {/* Metric 2: NDCG@10 */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">nDCG @ 10 Score</span>
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +3.8%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">0.915</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Rank Target</span>
                    <span>91.5%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '91.5%' }} />
                  </div>
                </div>
              </div>

              {/* Metric 3: MAP Score */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Mean Avg Precision (MAP)</span>
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +5.1%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">0.864</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Accuracy Target</span>
                    <span>86.4%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '86.4%' }} />
                  </div>
                </div>
              </div>

              {/* Metric 4: MRR Score */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Reciprocal Rank (MRR)</span>
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +2.9%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">0.941</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>First Relevant Hit</span>
                    <span>94.1%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '94.1%' }} />
                  </div>
                </div>
              </div>

              {/* Metric 5: Precision @ 5 */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Precision @ 5</span>
                  <span className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +6.0%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">0.880</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>Top 5 Relevance</span>
                    <span>88.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '88.0%' }} />
                  </div>
                </div>
              </div>

              {/* Metric 6: Query Latency */}
              <div className="bg-[#161618] border border-[#26262a] rounded-2xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Vector Latency</span>
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Sub-20ms
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-[#e8e6e3] tracking-tight">18 <span className="text-base text-white/40 font-normal">ms</span></span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>HNSW Index Speed</span>
                    <span>96% fast</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 rounded-full" style={{ width: '96%' }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Comprehensive Algorithm Benchmark Table */}
            <div className="bg-[#161618] border border-[#26262a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">
                Algorithm Performance Comparison
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white/80">
                  <thead>
                    <tr className="border-b border-[#222222] text-[10px] uppercase tracking-widest text-white/40">
                      <th className="pb-3 font-medium">Algorithm</th>
                      <th className="pb-3 font-medium">nDCG@5</th>
                      <th className="pb-3 font-medium">nDCG@10</th>
                      <th className="pb-3 font-medium">MAP</th>
                      <th className="pb-3 font-medium">MRR</th>
                      <th className="pb-3 font-medium">Precision@5</th>
                      <th className="pb-3 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                    {benchmarks.map((bm) => {
                      const isCurrent = (activeAlgo === 'hybrid' && bm.algorithm_id === 'hybrid') ||
                                        (activeAlgo === 'keyword' && bm.algorithm_id === 'keyword') ||
                                        (activeAlgo === 'semantic' && bm.algorithm_id === 'semantic');

                      return (
                        <tr key={bm.algorithm_id} className={`hover:bg-white/[0.02] transition-colors ${isCurrent ? 'bg-violet-500/[0.04]' : ''}`}>
                          <td className="py-4 font-bold text-[#e8e6e3] flex items-center gap-2">
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-teal-400" />}
                            {bm.algorithm_name}
                          </td>
                          <td className="py-4 font-mono">{bm.ndcg_5.toFixed(3)}</td>
                          <td className="py-4 font-mono">{bm.ndcg_10.toFixed(3)}</td>
                          <td className="py-4 font-mono">{bm.map_score.toFixed(3)}</td>
                          <td className="py-4 font-mono">{bm.mrr_score.toFixed(3)}</td>
                          <td className="py-4 font-mono">{bm.precision_5.toFixed(3)}</td>
                          <td className="py-4 font-mono text-teal-400 font-semibold">{bm.latency_ms} ms</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* INSPECT FIT DRAWER / MODAL */}
      {inspectGig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#161618] border border-[#26262a] shadow-2xl rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 relative overflow-hidden">
            {/* Left Aurora Border */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-teal-400" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#222222] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
                  AI Fit Vector Analysis
                </span>
                <h2 className="text-xl font-bold text-[#e8e6e3] mt-0.5">{inspectGig.title}</h2>
                <p className="text-xs text-white/50">{inspectGig.client_company} • {inspectGig.work_mode}</p>
              </div>

              <button
                onClick={() => setInspectGig(null)}
                className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Scores breakdown */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#111111] rounded-xl border border-[#26262a]">
                <span className="block text-[10px] uppercase tracking-widest text-white/40">Overall Match</span>
                <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-teal-300">
                  {inspectGig.match_breakdown?.overall_score || 88}%
                </span>
              </div>
              <div className="p-3 bg-[#111111] rounded-xl border border-[#26262a]">
                <span className="block text-[10px] uppercase tracking-widest text-white/40">Keyword Fit</span>
                <span className="text-xl font-extrabold text-[#e8e6e3]">
                  {inspectGig.match_breakdown?.keyword_score || 85}%
                </span>
              </div>
              <div className="p-3 bg-[#111111] rounded-xl border border-[#26262a]">
                <span className="block text-[10px] uppercase tracking-widest text-white/40">Semantic Score</span>
                <span className="text-xl font-extrabold text-[#e8e6e3]">
                  {inspectGig.match_breakdown?.semantic_score || 92}%
                </span>
              </div>
            </div>

            {/* Justification Text */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                AI Match Justification
              </span>
              <div className="p-4 rounded-xl bg-[#111111] border border-[#26262a] text-xs text-white/80 leading-relaxed">
                {inspectGig.match_breakdown?.justification ||
                  'High semantic overlap in core frontend architecture, state management, and real-time data flow pipelines. Candidate exceeds baseline experience criteria.'}
              </div>
            </div>

            {/* Skill Breakdown */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                Skill Alignment Breakdown
              </span>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-teal-400 font-semibold mr-2">Matched:</span>
                  {(inspectGig.match_breakdown?.matching_skills || inspectGig.required_skills.slice(0, 3)).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-teal-500/10 border border-teal-500/30 text-teal-300"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>

                {(inspectGig.match_breakdown?.missing_skills || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-rose-400 font-semibold mr-2">Gaps:</span>
                    {inspectGig.match_breakdown?.missing_skills.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300"
                      >
                        ! {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 border-t border-[#222222] flex items-center justify-between">
              <button
                onClick={() => setInspectGig(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Close Analysis
              </button>

              <button
                onClick={() => {
                  handleApplyGig(inspectGig.id);
                  setInspectGig(null);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-teal-400 hover:opacity-95 shadow-md shadow-violet-500/20"
              >
                {appliedGigIds.has(inspectGig.id) ? 'Application Submitted' : 'Submit Application'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon component for users tab
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
