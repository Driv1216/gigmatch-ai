import React, { useState, useMemo } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Columns,
  Plus,
  Search,
  Filter,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Upload,
  BrainCircuit,
  Check,
  ChevronRight,
  Briefcase,
  DollarSign,
  MapPin,
  User,
  SlidersHorizontal,
  Award,
  Zap,
  BarChart3,
  Building2,
  X,
  Send,
  Eye,
  RefreshCw,
  Layers,
  ChevronDown
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

type FreelancerStage = 'Discovered' | 'Interested' | 'Applied' | 'In Review';
type ClientStage = 'New Applicants' | 'Shortlisted' | 'Interview' | 'Accepted' | 'Declined';
type AdminStage = 'Keyword Model' | 'Semantic Model' | 'Hybrid Model';

const DEFAULT_SAMPLE_RESUME = `ELENA ROSTOVA
Senior Full-Stack AI Engineer | San Francisco, CA

SUMMARY:
Senior AI Backend & Full-Stack Engineer with 8+ years experience building intelligent talent search systems, vector recommendation engines, and microservices. Expert in FastAPI, Python, React, TypeScript, PyTorch, Supabase, and PostgreSQL pgvector.

TECHNICAL SKILLS:
• Frontend: React 19, TypeScript, Tailwind CSS, Next.js, Redux Toolkit
• Backend: Python 3.11, FastAPI, Node.js, REST APIs, Supabase RLS
• Data & AI: PyTorch, HuggingFace sentence-transformers, Cosine Similarity, pgvector, Scikit-learn
• Cloud & DevOps: Docker, CI/CD, GitHub Actions, AWS ECS

EXPERIENCE:
Lead AI Systems Engineer @ Synthetix Cloud (2023 - Present)
- Engineered hybrid embedding-based candidate retrieval engine with cosine similarity ranking.
- Achieved 94.1% NDCG@10 precision on real-time gig matching queries.`;

export const KanbanPipeline: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('All');

  // Local stage assignment for Freelancer Gigs
  const [freelancerGigStages, setFreelancerGigStages] = useState<Record<string, FreelancerStage>>({
    'gig-201': 'In Review',
    'gig-202': 'Applied',
    'gig-203': 'Interested',
    'gig-204': 'Discovered',
    'gig-205': 'Discovered',
  });

  // Modal Overlays
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeInputText, setResumeInputText] = useState(DEFAULT_SAMPLE_RESUME);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parsedResults, setParsedResults] = useState<{
    skills: { name: string; confidence: number; category: string }[];
    summary: string;
    parsedAt: string;
  } | null>(null);

  // Inline Gig Creation Form inside Column 1
  const [showGigForm, setShowGigForm] = useState(false);
  const [newGig, setNewGig] = useState({
    title: '',
    client_company: '',
    description: '',
    required_skills: 'React, TypeScript, FastAPI',
    budget_min: 80,
    budget_max: 120,
    work_mode: 'Remote' as 'Remote' | 'Hybrid' | 'Onsite',
  });

  // Card Detail View Modal
  const [selectedCardDetail, setSelectedCardDetail] = useState<{
    type: 'gig' | 'application' | 'benchmark';
    data: any;
  } | null>(null);

  // Drag & Drop simulation state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);

  // Apply proposal modal state for Freelancers
  const [applyingGig, setApplyingGig] = useState<Gig | null>(null);
  const [proposalInputText, setProposalInputText] = useState('');

  // Extract all available skill tags for filter dropdown
  const allSkillsList = useMemo(() => {
    const set = new Set<string>();
    gigs.forEach(g => g.required_skills?.forEach(s => set.add(s)));
    return ['All', ...Array.from(set)];
  }, [gigs]);

  // --- HANDLERS ---
  const handleFreelancerMoveStage = (gigId: string, targetStage: FreelancerStage) => {
    setFreelancerGigStages(prev => ({
      ...prev,
      [gigId]: targetStage,
    }));
  };

  const handleClientMoveStatus = (appId: string, targetStatus: Application['status']) => {
    onUpdateAppStatus(appId, targetStatus);
  };

  const handleCreateGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGig.title.trim()) return;

    const skillsArray = newGig.required_skills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    onPostGig({
      title: newGig.title,
      client_company: newGig.client_company || 'Vanguard Tech Labs',
      description: newGig.description || 'Full-stack AI integration and frontend development engagement.',
      required_skills: skillsArray.length > 0 ? skillsArray : ['React', 'FastAPI'],
      budget_min: Number(newGig.budget_min) || 75,
      budget_max: Number(newGig.budget_max) || 125,
      work_mode: newGig.work_mode,
    });

    setNewGig({
      title: '',
      client_company: '',
      description: '',
      required_skills: 'React, TypeScript, FastAPI',
      budget_min: 80,
      budget_max: 120,
      work_mode: 'Remote',
    });
    setShowGigForm(false);
  };

  const handleSimulateResumeParse = () => {
    setIsParsingResume(true);
    setTimeout(() => {
      setParsedResults({
        summary: 'Senior Full-Stack AI Developer with high-density vector search experience and FastAPI mastery.',
        parsedAt: new Date().toLocaleTimeString(),
        skills: [
          { name: 'React', confidence: 0.98, category: 'frontend' },
          { name: 'TypeScript', confidence: 0.96, category: 'frontend' },
          { name: 'FastAPI', confidence: 0.94, category: 'backend' },
          { name: 'Python', confidence: 0.99, category: 'backend' },
          { name: 'PyTorch / NLP', confidence: 0.89, category: 'ai_ml' },
          { name: 'PostgreSQL / Supabase', confidence: 0.92, category: 'database' },
        ],
      });
      setIsParsingResume(false);
    }, 700);
  };

  const handleQuickSubmitApplication = () => {
    if (!applyingGig) return;
    handleFreelancerMoveStage(applyingGig.id, 'Applied');
    setApplyingGig(null);
    setProposalInputText('');
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDropOnColumn = (columnName: string) => {
    if (!draggedItemId) return;

    if (role === 'freelancer') {
      const validStages: FreelancerStage[] = ['Discovered', 'Interested', 'Applied', 'In Review'];
      if (validStages.includes(columnName as FreelancerStage)) {
        handleFreelancerMoveStage(draggedItemId, columnName as FreelancerStage);
      }
    } else if (role === 'client') {
      const statusMap: Record<ClientStage, Application['status']> = {
        'New Applicants': 'pending',
        'Shortlisted': 'shortlisted',
        'Interview': 'interview',
        'Accepted': 'accepted',
        'Declined': 'declined',
      };
      const newStatus = statusMap[columnName as ClientStage];
      if (newStatus) {
        handleClientMoveStatus(draggedItemId, newStatus);
      }
    }

    setDraggedItemId(null);
    setActiveDropColumn(null);
  };

  // Helper score color formatter
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 80) return 'bg-sky-100 text-sky-800 border-sky-300';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  // Filtered Gigs
  const filteredGigs = useMemo(() => {
    return gigs.filter(g => {
      const matchesSearch =
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.client_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill = selectedSkillFilter === 'All' || g.required_skills?.includes(selectedSkillFilter);
      return matchesSearch && matchesSkill;
    });
  }, [gigs, searchQuery, selectedSkillFilter]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      const matchesSearch =
        a.freelancer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.freelancer_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.gig_title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill = selectedSkillFilter === 'All' ||
        a.matching_skills?.includes(selectedSkillFilter) ||
        a.missing_skills?.includes(selectedSkillFilter);

      return matchesSearch && matchesSkill;
    });
  }, [applications, searchQuery, selectedSkillFilter]);


  // RENDER COLUMN CONTENT FOR FREELANCER VIEW
  const renderFreelancerBoard = () => {
    const columns: { title: FreelancerStage; tint: string; borderAccent: string; badgeBg: string }[] = [
      { title: 'Discovered', tint: 'bg-slate-50/90 border-slate-200', borderAccent: 'border-l-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
      { title: 'Interested', tint: 'bg-amber-50/60 border-amber-200/70', borderAccent: 'border-l-amber-500', badgeBg: 'bg-amber-100 text-amber-800' },
      { title: 'Applied', tint: 'bg-indigo-50/60 border-indigo-200/70', borderAccent: 'border-l-indigo-500', badgeBg: 'bg-indigo-100 text-indigo-800' },
      { title: 'In Review', tint: 'bg-emerald-50/60 border-emerald-200/70', borderAccent: 'border-l-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
    ];

    return (
      <div className="flex gap-5 overflow-x-auto pb-6 items-start min-w-full">
        {columns.map(col => {
          const colGigs = filteredGigs.filter(g => (freelancerGigStages[g.id] || 'Discovered') === col.title);
          const isDropActive = activeDropColumn === col.title;

          return (
            <div
              key={col.title}
              onDragOver={(e) => {
                e.preventDefault();
                setActiveDropColumn(col.title);
              }}
              onDragLeave={() => setActiveDropColumn(null)}
              onDrop={() => handleDropOnColumn(col.title)}
              className={`w-80 flex-shrink-0 ${col.tint} border rounded-xl flex flex-col max-h-[calc(100vh-210px)] shadow-sm transition-all ${
                isDropActive ? 'ring-2 ring-indigo-400 bg-indigo-50/90 scale-[1.01]' : ''
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    col.title === 'Discovered' ? 'bg-blue-500' :
                    col.title === 'Interested' ? 'bg-amber-500' :
                    col.title === 'Applied' ? 'bg-indigo-500' : 'bg-emerald-500'
                  }`} />
                  <h3 className="font-semibold text-slate-800 text-sm tracking-tight">{col.title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${col.badgeBg}`}>
                  {colGigs.length}
                </span>
              </div>

              {/* Column Card List */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[420px]">
                {col.title === 'Discovered' && (
                  <button
                    onClick={() => setShowGigForm(!showGigForm)}
                    className="w-full py-2.5 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center justify-center gap-2 transition"
                  >
                    <Plus className="h-4 w-4" />
                    {showGigForm ? 'Hide Quick Post Form' : 'Quick Create Opportunity'}
                  </button>
                )}

                {/* Inline Gig Creation Card in Column 1 */}
                {col.title === 'Discovered' && showGigForm && (
                  <form onSubmit={handleCreateGigSubmit} className="bg-white p-3.5 rounded-lg border border-indigo-200 shadow-md space-y-2.5 text-xs animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1.5">
                      <span>Post New Opportunity</span>
                      <button type="button" onClick={() => setShowGigForm(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Gig Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Senior PyTorch Engineer"
                        value={newGig.title}
                        onChange={(e) => setNewGig({ ...newGig, title: e.target.value })}
                        className="w-full p-2 border rounded border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Client / Company</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Analytics"
                        value={newGig.client_company}
                        onChange={(e) => setNewGig({ ...newGig, client_company: e.target.value })}
                        className="w-full p-2 border rounded border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Min Rate ($/hr)</label>
                        <input
                          type="number"
                          value={newGig.budget_min}
                          onChange={(e) => setNewGig({ ...newGig, budget_min: Number(e.target.value) })}
                          className="w-full p-1.5 border rounded border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">Max Rate ($/hr)</label>
                        <input
                          type="number"
                          value={newGig.budget_max}
                          onChange={(e) => setNewGig({ ...newGig, budget_max: Number(e.target.value) })}
                          className="w-full p-1.5 border rounded border-slate-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Required Skills (comma separated)</label>
                      <input
                        type="text"
                        value={newGig.required_skills}
                        onChange={(e) => setNewGig({ ...newGig, required_skills: e.target.value })}
                        className="w-full p-2 border rounded border-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Publish & Match
                    </button>
                  </form>
                )}

                {colGigs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                    No opportunities in this stage
                  </div>
                ) : (
                  colGigs.map(gig => {
                    const matchScore = gig.match_breakdown?.overall_score || 85;
                    return (
                      <div
                        key={gig.id}
                        draggable
                        onDragStart={() => handleDragStart(gig.id)}
                        className={`bg-white rounded-lg p-3.5 border ${col.borderAccent} border-l-4 border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 group relative`}
                      >
                        {/* Header: Title & Score Pill */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4
                            onClick={() => setSelectedCardDetail({ type: 'gig', data: gig })}
                            className="font-bold text-slate-900 text-xs leading-snug hover:text-indigo-600 transition cursor-pointer line-clamp-2"
                          >
                            {gig.title}
                          </h4>
                          <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full border shrink-0 flex items-center gap-1 ${getScoreColor(matchScore)}`}>
                            <Sparkles className="h-3 w-3 text-indigo-600" />
                            {matchScore}%
                          </span>
                        </div>

                        {/* Company & Budget info */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2.5">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {gig.client_company}
                          </span>
                          <span className="flex items-center gap-0.5 text-slate-600">
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                            ${gig.budget_min}-${gig.budget_max}/h
                          </span>
                        </div>

                        {/* Skill Tags (2-3 tags) */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {gig.required_skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                              {skill}
                            </span>
                          ))}
                          {gig.required_skills.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{gig.required_skills.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Bottom Actions Toolbar */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <button
                            onClick={() => setSelectedCardDetail({ type: 'gig', data: gig })}
                            className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </button>

                          <div className="flex items-center gap-1">
                            {col.title !== 'In Review' && col.title !== 'Applied' && (
                              <button
                                onClick={() => setApplyingGig(gig)}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-[11px] transition shadow-xs flex items-center gap-1"
                              >
                                Apply Now
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            )}

                            {/* Stage Move Dropdown Select */}
                            <div className="relative group/select">
                              <select
                                value={col.title}
                                onChange={(e) => handleFreelancerMoveStage(gig.id, e.target.value as FreelancerStage)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold py-1 px-1.5 rounded border border-slate-300 cursor-pointer focus:outline-none"
                              >
                                <option value="Discovered">Discovered</option>
                                <option value="Interested">Interested</option>
                                <option value="Applied">Applied</option>
                                <option value="In Review">In Review</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // RENDER COLUMN CONTENT FOR CLIENT VIEW
  const renderClientBoard = () => {
    const columns: { title: ClientStage; status: Application['status']; tint: string; borderAccent: string; badgeBg: string }[] = [
      { title: 'New Applicants', status: 'pending', tint: 'bg-blue-50/60 border-blue-200/80', borderAccent: 'border-l-blue-500', badgeBg: 'bg-blue-100 text-blue-800' },
      { title: 'Shortlisted', status: 'shortlisted', tint: 'bg-indigo-50/60 border-indigo-200/80', borderAccent: 'border-l-indigo-500', badgeBg: 'bg-indigo-100 text-indigo-800' },
      { title: 'Interview', status: 'interview', tint: 'bg-amber-50/60 border-amber-200/80', borderAccent: 'border-l-amber-500', badgeBg: 'bg-amber-100 text-amber-800' },
      { title: 'Accepted', status: 'accepted', tint: 'bg-emerald-50/60 border-emerald-200/80', borderAccent: 'border-l-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
      { title: 'Declined', status: 'declined', tint: 'bg-rose-50/60 border-rose-200/80', borderAccent: 'border-l-rose-500', badgeBg: 'bg-rose-100 text-rose-800' },
    ];

    return (
      <div className="flex gap-4 overflow-x-auto pb-6 items-start min-w-full">
        {columns.map(col => {
          const colApps = filteredApplications.filter(a => a.status === col.status);
          const isDropActive = activeDropColumn === col.title;

          return (
            <div
              key={col.title}
              onDragOver={(e) => {
                e.preventDefault();
                setActiveDropColumn(col.title);
              }}
              onDragLeave={() => setActiveDropColumn(null)}
              onDrop={() => handleDropOnColumn(col.title)}
              className={`w-76 flex-shrink-0 ${col.tint} border rounded-xl flex flex-col max-h-[calc(100vh-210px)] shadow-sm transition-all ${
                isDropActive ? 'ring-2 ring-indigo-400 bg-indigo-50/90 scale-[1.01]' : ''
              }`}
            >
              {/* Header */}
              <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    col.status === 'pending' ? 'bg-blue-500' :
                    col.status === 'shortlisted' ? 'bg-indigo-500' :
                    col.status === 'interview' ? 'bg-amber-500' :
                    col.status === 'accepted' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                  <h3 className="font-semibold text-slate-800 text-xs tracking-tight">{col.title}</h3>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${col.badgeBg}`}>
                  {colApps.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1 min-h-[420px]">
                {col.title === 'New Applicants' && (
                  <button
                    onClick={() => setShowGigForm(!showGigForm)}
                    className="w-full py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" />
                    {showGigForm ? 'Hide Posting Form' : '+ Create New Gig'}
                  </button>
                )}

                {/* Inline Form if open */}
                {col.title === 'New Applicants' && showGigForm && (
                  <form onSubmit={handleCreateGigSubmit} className="bg-white p-3 rounded-lg border border-indigo-200 shadow-md space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b pb-1">
                      <span>Post New Gig</span>
                      <button type="button" onClick={() => setShowGigForm(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Gig Title"
                        value={newGig.title}
                        onChange={(e) => setNewGig({ ...newGig, title: e.target.value })}
                        className="w-full p-1.5 border rounded border-slate-300"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={newGig.client_company}
                        onChange={(e) => setNewGig({ ...newGig, client_company: e.target.value })}
                        className="w-full p-1.5 border rounded border-slate-300"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Required Skills (React, Python)"
                        value={newGig.required_skills}
                        onChange={(e) => setNewGig({ ...newGig, required_skills: e.target.value })}
                        className="w-full p-1.5 border rounded border-slate-300"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white font-medium py-1.5 rounded flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Publish Gig
                    </button>
                  </form>
                )}

                {colApps.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                    No candidates in {col.title.toLowerCase()}
                  </div>
                ) : (
                  colApps.map(app => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app.id)}
                      className={`bg-white rounded-lg p-3 border ${col.borderAccent} border-l-4 border-slate-200 shadow-sm hover:shadow-md transition duration-200 relative group`}
                    >
                      {/* Candidate Header */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <img
                          src={app.freelancer_avatar}
                          alt={app.freelancer_name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              onClick={() => setSelectedCardDetail({ type: 'application', data: app })}
                              className="font-bold text-slate-900 text-xs hover:text-indigo-600 transition cursor-pointer truncate"
                            >
                              {app.freelancer_name}
                            </h4>
                            <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full border shrink-0 ${getScoreColor(app.match_score)}`}>
                              {app.match_score}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{app.freelancer_title}</p>
                        </div>
                      </div>

                      {/* Applied Gig Title */}
                      <div className="bg-slate-50 px-2 py-1 rounded text-[10px] text-slate-600 font-medium mb-2 truncate border border-slate-100">
                        Target: {app.gig_title}
                      </div>

                      {/* Top Skills */}
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {app.matching_skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-emerald-200">
                            ✓ {skill}
                          </span>
                        ))}
                      </div>

                      {/* Status Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => setSelectedCardDetail({ type: 'application', data: app })}
                          className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Inspect
                        </button>

                        <select
                          value={app.status}
                          onChange={(e) => handleClientMoveStatus(app.id, e.target.value as Application['status'])}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold py-0.5 px-1.5 rounded border border-slate-300 focus:outline-none"
                        >
                          <option value="pending">New</option>
                          <option value="shortlisted">Shortlist</option>
                          <option value="interview">Interview</option>
                          <option value="accepted">Accept</option>
                          <option value="declined">Decline</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // RENDER COLUMN CONTENT FOR ADMIN VIEW
  const renderAdminBoard = () => {
    const columns: { title: AdminStage; algoId: 'keyword' | 'semantic' | 'hybrid'; tint: string; borderAccent: string; badgeBg: string }[] = [
      { title: 'Keyword Model', algoId: 'keyword', tint: 'bg-slate-50/90 border-slate-200', borderAccent: 'border-l-slate-500', badgeBg: 'bg-slate-200 text-slate-800' },
      { title: 'Semantic Model', algoId: 'semantic', tint: 'bg-purple-50/60 border-purple-200/70', borderAccent: 'border-l-purple-500', badgeBg: 'bg-purple-100 text-purple-800' },
      { title: 'Hybrid Model', algoId: 'hybrid', tint: 'bg-emerald-50/60 border-emerald-200/70', borderAccent: 'border-l-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
    ];

    return (
      <div className="flex gap-5 overflow-x-auto pb-6 items-start min-w-full">
        {columns.map(col => {
          const bench = benchmarks.find(b => b.algorithm_id === col.algoId);
          if (!bench) return null;

          return (
            <div
              key={col.title}
              className={`w-96 flex-shrink-0 ${col.tint} border rounded-xl flex flex-col max-h-[calc(100vh-210px)] shadow-sm`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    col.algoId === 'keyword' ? 'bg-slate-500' :
                    col.algoId === 'semantic' ? 'bg-purple-500' : 'bg-emerald-500'
                  }`} />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">{col.title}</h3>
                    <p className="text-[10px] text-slate-500">{bench.algorithm_name}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${col.badgeBg}`}>
                  {(bench.ndcg_10 * 100).toFixed(1)}% NDCG
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-3.5 overflow-y-auto space-y-3 flex-1">

                {/* Benchmark Card 1: Core Performance Metrics */}
                <div
                  onClick={() => setSelectedCardDetail({ type: 'benchmark', data: bench })}
                  className={`bg-white rounded-lg p-4 border ${col.borderAccent} border-l-4 border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer space-y-3`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-indigo-600" />
                      Core Ranking Performance
                    </span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">
                      {bench.total_queries_tested} Queries
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="text-[10px] text-slate-500">NDCG @ 10</div>
                      <div className="font-extrabold text-sm text-slate-900">{bench.ndcg_10.toFixed(3)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="text-[10px] text-slate-500">NDCG @ 5</div>
                      <div className="font-extrabold text-sm text-slate-900">{bench.ndcg_5.toFixed(3)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="text-[10px] text-slate-500">MAP Score</div>
                      <div className="font-extrabold text-sm text-slate-900">{bench.map_score.toFixed(3)}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="text-[10px] text-slate-500">MRR Score</div>
                      <div className="font-extrabold text-sm text-slate-900">{bench.mrr_score.toFixed(3)}</div>
                    </div>
                  </div>
                </div>

                {/* Benchmark Card 2: Latency & System Throughput */}
                <div className={`bg-white rounded-lg p-4 border ${col.borderAccent} border-l-4 border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Latency & Coverage Metrics
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Avg Search Latency
                    </span>
                    <span className="font-mono font-bold text-slate-900">{bench.latency_ms} ms</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-600">Relevance Coverage</span>
                    <span className="font-mono font-bold text-emerald-600">{(bench.relevance_coverage * 100).toFixed(1)}%</span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${col.algoId === 'keyword' ? 'bg-slate-500' : col.algoId === 'semantic' ? 'bg-purple-500' : 'bg-emerald-500'}`}
                      style={{ width: `${bench.relevance_coverage * 100}%` }}
                    />
                  </div>
                </div>

                {/* Benchmark Card 3: Architecture & Model Specs */}
                <div className={`bg-white rounded-lg p-4 border ${col.borderAccent} border-l-4 border-slate-200 shadow-sm hover:shadow-md transition space-y-2 text-xs`}>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                    <BrainCircuit className="h-4 w-4 text-sky-500" />
                    Model Architecture
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {col.algoId === 'keyword' && 'PostgreSQL tsvector full-text index with English stemming and exact token matching.'}
                    {col.algoId === 'semantic' && '384-dimensional dense vector embeddings generated via HuggingFace sentence-transformers (all-MiniLM-L6-v2).'}
                    {col.algoId === 'hybrid' && 'Reciprocal Rank Fusion (RRF) blending 60% semantic cosine vector score + 40% keyword overlap.'}
                  </p>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 font-sans flex flex-col">
      {/* Top Navigation & Toolbar Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">

          {/* Title & Role Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm">
              <Columns className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900">
                  GigMatch AI Pipeline
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {role.toUpperCase()} BOARD
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Spatial stage-based candidate & opportunity tracking
              </p>
            </div>
          </div>

          {/* Search, Filter & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Real-time Filter Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search board cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs w-48 sm:w-60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Skill Category Filter Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={selectedSkillFilter}
                onChange={(e) => setSelectedSkillFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                {allSkillsList.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>

            {/* AI Resume Parser Button (Triggers Modal Overlay) */}
            <button
              onClick={() => setShowResumeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <BrainCircuit className="h-4 w-4 text-indigo-600" />
              <span>AI Resume Parser</span>
            </button>

            {/* Post Gig Quick Action Button */}
            <button
              onClick={() => setShowGigForm(!showGigForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Post Gig</span>
            </button>
          </div>
        </div>

        {/* Board Statistics Banner */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                <strong className="text-slate-900">{gigs.length}</strong> Opportunities
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-sky-600" />
                <strong className="text-slate-900">{applications.length}</strong> Active Applications
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Avg Match Score: <strong className="text-emerald-700 font-extrabold">91.4%</strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-500">
              Drag cards across columns or use action controls to transition stages
            </div>
          </div>
        </div>
      </header>

      {/* Main Kanban Workspace Container */}
      <main className="flex-1 p-6 overflow-x-auto min-w-full">
        <div className="max-w-7xl mx-auto">
          {role === 'freelancer' && renderFreelancerBoard()}
          {role === 'client' && renderClientBoard()}
          {role === 'admin' && renderAdminBoard()}
        </div>
      </main>

      {/* --- RESUME PARSER MODAL OVERLAY --- */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                  <BrainCircuit className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">AI Resume & Skill Parser</h3>
                  <p className="text-xs text-indigo-200">Extract technical taxonomy & evaluate semantic embedding scores</p>
                </div>
              </div>
              <button
                onClick={() => setShowResumeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">

              {/* Text Input Area */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Resume Content (Raw Text / CV)</span>
                  <button
                    onClick={() => setResumeInputText(DEFAULT_SAMPLE_RESUME)}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold"
                  >
                    Load Sample Resume
                  </button>
                </label>
                <textarea
                  rows={6}
                  value={resumeInputText}
                  onChange={(e) => setResumeInputText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Trigger Parse Button */}
              <button
                onClick={handleSimulateResumeParse}
                disabled={isParsingResume}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                {isParsingResume ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Extracting Skill Embeddings & Running Matcher...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Extract Skills & Evaluate Match Score</span>
                  </>
                )}
              </button>

              {/* Parsed Extraction Results */}
              {parsedResults && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Extracted Skills & Taxonomy
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Parsed at {parsedResults.parsedAt}</span>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {parsedResults.skills.map((skill, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px]">{skill.name}</span>
                          <span className="text-[10px] font-mono text-indigo-600 font-extrabold">
                            {(skill.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${skill.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Match Evaluation Result */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-900">Overall Calculated Match Score</span>
                      <p className="text-[10px] text-emerald-700">94.8% Match with active opportunity: "Senior AI Engineer"</p>
                    </div>
                    <span className="text-lg font-black text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-300">
                      94.8%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowResumeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
              >
                Close & Return to Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROPOSAL SUBMIT MODAL FOR FREELANCER --- */}
      {applyingGig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Submit Application Proposal</h3>
                <p className="text-xs text-slate-500">{applyingGig.title}</p>
              </div>
              <button onClick={() => setApplyingGig(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proposal Note / Pitch</label>
              <textarea
                rows={4}
                placeholder="Explain why you are an ideal fit for this engagement..."
                value={proposalInputText}
                onChange={(e) => setProposalInputText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setApplyingGig(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickSubmitApplication}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
              >
                Submit & Move to Applied Stage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CARD DETAIL INSPECTOR MODAL --- */}
      {selectedCardDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {selectedCardDetail.type.toUpperCase()} INSPECTOR
                </span>
                <h3 className="font-extrabold text-base text-white">
                  {selectedCardDetail.type === 'gig' ? selectedCardDetail.data.title :
                   selectedCardDetail.type === 'application' ? selectedCardDetail.data.freelancer_name :
                   selectedCardDetail.data.algorithm_name}
                </h3>
              </div>
              <button onClick={() => setSelectedCardDetail(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">

              {/* If GIG Detail */}
              {selectedCardDetail.type === 'gig' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1">Description</h4>
                    <p className="text-slate-600 leading-relaxed">{selectedCardDetail.data.description}</p>
                  </div>

                  {selectedCardDetail.data.match_breakdown && (
                    <div className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-xl space-y-3">
                      <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        AI Semantic Match Breakdown
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white p-2 rounded border border-indigo-100">
                          <span className="text-[10px] text-slate-500">Overall</span>
                          <div className="font-extrabold text-sm text-indigo-700">{selectedCardDetail.data.match_breakdown.overall_score}%</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-indigo-100">
                          <span className="text-[10px] text-slate-500">Keyword</span>
                          <div className="font-extrabold text-sm text-sky-700">{selectedCardDetail.data.match_breakdown.keyword_score}%</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-indigo-100">
                          <span className="text-[10px] text-slate-500">Semantic</span>
                          <div className="font-extrabold text-sm text-purple-700">{selectedCardDetail.data.match_breakdown.semantic_score}%</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded border border-indigo-100 leading-relaxed">
                        <strong>AI Justification:</strong> {selectedCardDetail.data.match_breakdown.justification}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* If APPLICATION Detail */}
              {selectedCardDetail.type === 'application' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
                    <img src={selectedCardDetail.data.freelancer_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900">{selectedCardDetail.data.freelancer_name}</h4>
                      <p className="text-slate-500 text-[11px]">{selectedCardDetail.data.freelancer_title}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1">Proposal Text</h4>
                    <p className="text-slate-600 leading-relaxed">{selectedCardDetail.data.proposal_text}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">Matching Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCardDetail.data.matching_skills.map((s: string, idx: number) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-semibold">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* If BENCHMARK Detail */}
              {selectedCardDetail.type === 'benchmark' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900">{selectedCardDetail.data.algorithm_name}</h4>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-white p-2 rounded border">NDCG@10: {selectedCardDetail.data.ndcg_10}</div>
                      <div className="bg-white p-2 rounded border">MAP: {selectedCardDetail.data.map_score}</div>
                      <div className="bg-white p-2 rounded border">MRR: {selectedCardDetail.data.mrr_score}</div>
                      <div className="bg-white p-2 rounded border">Latency: {selectedCardDetail.data.latency_ms} ms</div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCardDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
