import React, { useState, useEffect, useRef } from 'react';
import {
  UserRole,
  Gig,
  Application,
  EvaluationBenchmark,
  FreelancerProfile,
} from '../../types';
import {
  Terminal,
  Play,
  Check,
  X,
  Search,
  Cpu,
  FileText,
  Plus,
  RefreshCw,
  ChevronRight,
  Database,
  User,
  Briefcase,
  Shield,
  Zap,
  Code,
  List,
  Server,
  Activity,
  Maximize2,
  Sliders,
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

interface CommandLog {
  id: string;
  time: string;
  type: 'cmd' | 'out' | 'err' | 'sys';
  text: string;
}

export const TerminalNoir: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'gigs' | 'resume' | 'post' | 'benchmarks' | 'apps'>('gigs');

  // Terminal Command Bar State
  const [commandInput, setCommandInput] = useState('');
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([
    {
      id: '1',
      time: '05:40:01',
      type: 'sys',
      text: 'GIGMATCH OS v4.8.2-PROD [KERNEL: 6.8.0-PHOSPHOR] ONLINE.',
    },
    {
      id: '2',
      time: '05:40:02',
      type: 'sys',
      text: `SESSION INITIALIZED AS: ROLE [${role.toUpperCase()}] | EMBEDDING ENGINE: ACTIVE (1536-DIM).`,
    },
    {
      id: '3',
      time: '05:40:03',
      type: 'out',
      text: 'Type "help" or click quick commands below to execute CLI directives.',
    },
  ]);

  // Gig Discovery Filters & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  // Resume Parsing Workflow State
  const [resumeText, setResumeText] = useState<string>(
    freelancers[0]?.parsed_resume_text ||
      'Alex Mercer | Senior Full-Stack & AI Engineer\nSkills: React, TypeScript, Node.js, Python, FastAPI, PyTorch, GraphQL, PostgreSQL, Docker\nExperience: 7+ years building distributed AI pipelines & high-throughput React frontends.\nEducation: B.S. Computer Science, Stanford University.'
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parseLogs, setParseLogs] = useState<string[]>([]);
  const [parsedSkillsOutput, setParsedSkillsOutput] = useState<
    { name: string; category: string; confidence: number }[]
  >([]);

  // Client Gig Posting Form State
  const [postFormData, setPostFormData] = useState({
    title: '',
    client_company: '',
    description: '',
    required_skills: '',
    budget_min: 80,
    budget_max: 140,
    work_mode: 'Remote' as 'Remote' | 'Hybrid' | 'Onsite',
  });
  const [postNotification, setPostNotification] = useState<string | null>(null);

  // Application Modal & Proposal State
  const [applyModalGig, setApplyModalGig] = useState<Gig | null>(null);
  const [proposalText, setProposalText] = useState('');
  const [appliedGigs, setAppliedGigs] = useState<Set<string>>(new Set());

  // Admin Eval Benchmark State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalLogs, setEvalLogs] = useState<string[]>([]);
  const [evalFilterAlgo, setEvalFilterAlgo] = useState<'all' | 'keyword' | 'semantic' | 'hybrid'>('all');

  // Terminal scroll ref
  const terminalLogEndRef = useRef<HTMLDivElement>(null);
  const resumeLogEndRef = useRef<HTMLDivElement>(null);
  const evalLogEndRef = useRef<HTMLDivElement>(null);

  // Role default tab sync
  useEffect(() => {
    if (role === 'admin') {
      setActiveTab('benchmarks');
    } else if (role === 'client') {
      setActiveTab('post');
    } else {
      setActiveTab('gigs');
    }
  }, [role]);

  // Scroll to bottom of command history
  useEffect(() => {
    terminalLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commandLogs]);

  // Helper for block progress bar (e.g. ████████░░ 80%)
  const renderBlockProgressBar = (score: number, totalBlocks = 10): string => {
    const normalized = Math.max(0, Math.min(100, score));
    const filledCount = Math.round((normalized / 100) * totalBlocks);
    const emptyCount = totalBlocks - filledCount;
    return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  };

  // Timestamp generator
  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  // Command Execution Handler
  const handleRunCommand = (cmdStr?: string) => {
    const rawCmd = cmdStr !== undefined ? cmdStr : commandInput;
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    const time = getTimestamp();
    const newLogs: CommandLog[] = [
      ...commandLogs,
      { id: String(Date.now()), time, type: 'cmd', text: `gigmatch@terminal:~$ ${trimmed}` },
    ];

    const lower = trimmed.toLowerCase();

    if (lower === 'clear') {
      setCommandLogs([]);
      setCommandInput('');
      return;
    } else if (lower === 'help') {
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: 'AVAILABLE CLI COMMANDS:\n  - search <query>      : Filter gigs by keyword or skill\n  - list gigs          : Switch to Gig Discovery view\n  - parse resume       : Launch Resume Parser Engine\n  - post gig           : Open Client Requisition Form\n  - eval benchmarks    : Run Admin Matching Algorithm Evaluation\n  - list apps          : View submitted applications log\n  - status             : Print OS system telemetry & active session\n  - whoami             : Display current user role and session ID\n  - clear              : Wipe command buffer',
      });
    } else if (lower.startsWith('search ')) {
      const q = trimmed.slice(7).trim();
      setSearchQuery(q);
      setActiveTab('gigs');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Filtering active network gigs with search filter: "${q}"`,
      });
    } else if (lower === 'list gigs' || lower === 'gigs') {
      setActiveTab('gigs');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Switched display context to GIG DISCOVERY & MATCHING MATRIX.`,
      });
    } else if (lower === 'parse resume' || lower === 'resume') {
      setActiveTab('resume');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Switched display context to RESUME PARSER STACK & VECTOR LOGS.`,
      });
    } else if (lower === 'post gig' || lower === 'post') {
      setActiveTab('post');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Switched display context to CLIENT REQUISITION POSTING PORT.`,
      });
    } else if (lower === 'eval benchmarks' || lower === 'eval' || lower === 'benchmarks') {
      setActiveTab('benchmarks');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Switched display context to ADMIN EVALUATION & ALGORITHM BENCHMARKS.`,
      });
    } else if (lower === 'list apps' || lower === 'apps') {
      setActiveTab('apps');
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'out',
        text: `[EXEC] Switched display context to APPLICATIONS AUDIT LOG.`,
      });
    } else if (lower === 'status') {
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'sys',
        text: `[TELEMETRY] CPU: 4.2% | MEM: 412MB / 4096MB | ACTIVE_GIGS: ${gigs.length} | APPS: ${applications.length} | BENCHMARKS: ${benchmarks.length} | NODE: US-EAST-1`,
      });
    } else if (lower === 'whoami') {
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'sys',
        text: `CURRENT USER: USER-8849 | ROLE: [${role.toUpperCase()}] | PERMISSIONS: FULL_EXECUTE`,
      });
    } else {
      newLogs.push({
        id: String(Date.now() + 1),
        time,
        type: 'err',
        text: `[ERR_UNKNOWN_DIRECTIVE] "${trimmed}" is not recognized as a valid CLI command. Type "help" for syntax.`,
      });
    }

    setCommandLogs(newLogs);
    setCommandInput('');
  };

  // Resume Parsing Stream Simulation
  const handleStartResumeParse = () => {
    setIsParsing(true);
    setParseLogs([]);
    const lines = [
      `[${getTimestamp()}] [SYS_INIT] Initializing LLM Resume Extraction Pipeline v4.8...`,
      `[${getTimestamp()}] [FILE_READ] Raw buffer loaded: ${resumeText.length} bytes.`,
      `[${getTimestamp()}] [TOKENIZE] Executing BPE tokenization... 384 tokens generated.`,
      `[${getTimestamp()}] [NLP_ENTITY] Extracting Named Entities (Skills, Experience, Certifications)...`,
      `[${getTimestamp()}] [CONFIDENCE] Evaluated skill confidence vectors:`,
      `                      └─ React (98% confidence)`,
      `                      └─ TypeScript (96% confidence)`,
      `                      └─ Python / PyTorch (92% confidence)`,
      `                      └─ FastAPI / Node.js (89% confidence)`,
      `[${getTimestamp()}] [VECTOR_EMBED] Generating 1536-dimensional dense embedding vector...`,
      `[${getTimestamp()}] [INDEX_UPDATE] Profile vector successfully written to Milvus Vector DB.`,
      `[${getTimestamp()}] [SUCCESS] Resume parsing finalized in 412ms. 8 core competencies mapped.`,
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < lines.length) {
        const nextLine = lines[currentStep];
        setParseLogs((prev) => [...prev, nextLine]);
        resumeLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        currentStep++;
      } else {
        clearInterval(interval);
        setIsParsing(false);
        setParsedSkillsOutput([
          { name: 'React', category: 'frontend', confidence: 0.98 },
          { name: 'TypeScript', category: 'frontend', confidence: 0.96 },
          { name: 'Python', category: 'ai_ml', confidence: 0.94 },
          { name: 'PyTorch', category: 'ai_ml', confidence: 0.92 },
          { name: 'Node.js', category: 'backend', confidence: 0.89 },
          { name: 'FastAPI', category: 'backend', confidence: 0.88 },
          { name: 'GraphQL', category: 'database', confidence: 0.85 },
          { name: 'Docker', category: 'devops', confidence: 0.84 },
        ]);
      }
    }, 250);
  };

  // Client Post Gig Handler
  const handlePostGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postFormData.title || !postFormData.client_company) return;

    const skillsArray = postFormData.required_skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onPostGig({
      title: postFormData.title,
      client_company: postFormData.client_company,
      description: postFormData.description || 'High priority engineering project.',
      required_skills: skillsArray.length ? skillsArray : ['React', 'TypeScript'],
      budget_min: Number(postFormData.budget_min) || 80,
      budget_max: Number(postFormData.budget_max) || 140,
      work_mode: postFormData.work_mode,
    });

    const time = getTimestamp();
    setPostNotification(
      `[SYS_OK] Gig Requisition "${postFormData.title}" published to network index.`
    );
    setCommandLogs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        time,
        type: 'sys',
        text: `[GIG_PUBLISHED] New client requisition registered: "${postFormData.title}" @ $${postFormData.budget_min}-$${postFormData.budget_max}/hr.`,
      },
    ]);

    setPostFormData({
      title: '',
      client_company: '',
      description: '',
      required_skills: '',
      budget_min: 80,
      budget_max: 140,
      work_mode: 'Remote',
    });

    setTimeout(() => {
      setPostNotification(null);
    }, 4000);
  };

  // Application Submit Handler
  const handleApplySubmit = () => {
    if (!applyModalGig) return;
    setAppliedGigs((prev) => new Set(prev).add(applyModalGig.id));
    const time = getTimestamp();
    setCommandLogs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        time,
        type: 'sys',
        text: `[APPLICATION_SUBMITTED] Application logged for gig "${applyModalGig.title}" [MATCH: ${applyModalGig.match_breakdown?.overall_score || 88}%].`,
      },
    ]);
    setApplyModalGig(null);
    setProposalText('');
  };

  // Admin Benchmark Evaluation Runner
  const handleRunAdminEval = () => {
    setIsEvaluating(true);
    setEvalLogs([]);

    const steps = [
      `[${getTimestamp()}] [EVAL_START] Initializing Benchmark Suite across ${benchmarks.length} algorithmic variants...`,
      `[${getTimestamp()}] [DATASET] Loaded 1,000 synthetic test queries + 500 ground-truth relevance labels.`,
      `[${getTimestamp()}] [BENCHMARK_1] Testing "Lexical BM25 / TF-IDF" pipeline...`,
      `                      └─ Mean Latency: 14.2 ms | NDCG@5: 0.7420 | Precision@5: 0.7200`,
      `[${getTimestamp()}] [BENCHMARK_2] Testing "Dense Vector Semantic Embeddings (1536-dim)"...`,
      `                      └─ Mean Latency: 84.5 ms | NDCG@5: 0.8950 | Precision@5: 0.8800`,
      `[${getTimestamp()}] [BENCHMARK_3] Testing "Hybrid Reciprocal Rank Fusion (BM25 + Dense Vector)"...`,
      `                      └─ Mean Latency: 42.1 ms | NDCG@5: 0.9410 | Precision@5: 0.9350`,
      `[${getTimestamp()}] [HYPOTHESIS_CHECK] Hybrid RRF outperforms Pure Keyword by +26.8% NDCG@5 (p < 0.001).`,
      `[${getTimestamp()}] [EVAL_FINAL] All test suites passed. Telemetry matrix compiled.`,
    ];

    let idx = 0;
    const timer = setInterval(() => {
      if (idx < steps.length) {
        setEvalLogs((prev) => [...prev, steps[idx]]);
        evalLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        idx++;
      } else {
        clearInterval(timer);
        setIsEvaluating(false);
      }
    }, 300);
  };

  // Filter Gigs logic
  const filteredGigs = gigs.filter((gig) => {
    const matchesSearch =
      searchQuery === '' ||
      gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.client_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSkill =
      skillFilter === 'ALL' ||
      gig.required_skills.some((s) => s.toLowerCase() === skillFilter.toLowerCase());

    return matchesSearch && matchesSkill;
  });

  // Extract all unique skills across gigs
  const allUniqueSkills = Array.from(
    new Set(gigs.flatMap((g) => g.required_skills))
  ).sort();

  return (
    <div className="relative min-h-screen bg-black text-[#00ff41] font-mono selection:bg-[#00ff41] selection:text-black overflow-x-hidden border-t-2 border-[#00ff41]/60">
      {/* Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-40"></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4">
        {/* Top OS Telemetry Header */}
        <div className="border border-[#00ff41]/40 bg-[#001100]/80 p-3 shadow-[0_0_15px_rgba(0,255,65,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#00ff41]/30 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#00ff41] animate-pulse" />
              <span className="font-bold tracking-widest text-[#00ff41]">
                GIGMATCH_OS v4.8.2-PROD
              </span>
              <span className="text-[#008f11]">|</span>
              <span className="text-[#00cc33]">[KERNEL: PHOSPHOR-X64]</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#00aa2c]">
              <span>[NODE: US-EAST-1]</span>
              <span>[UPTIME: 99.98%]</span>
              <span>[LATENCY: 12ms]</span>
              <span className="text-[#00ff41] bg-[#00ff41]/20 px-1.5 py-0.5 border border-[#00ff41]/40 uppercase font-bold">
                [{role}]
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#00cc33]">
            <div className="bg-[#002200]/40 p-1.5 border border-[#00ff41]/20">
              <span className="text-[#008f11]">ACTIVE GIGS:</span> {gigs.length} REQUISITIONS
            </div>
            <div className="bg-[#002200]/40 p-1.5 border border-[#00ff41]/20">
              <span className="text-[#008f11]">TALENT INDEX:</span> {freelancers.length} PROFILES
            </div>
            <div className="bg-[#002200]/40 p-1.5 border border-[#00ff41]/20">
              <span className="text-[#008f11]">APPLICATIONS:</span> {applications.length} SUBMITTED
            </div>
            <div className="bg-[#002200]/40 p-1.5 border border-[#00ff41]/20">
              <span className="text-[#008f11]">ALGO EVAL:</span> {benchmarks.length} BENCHMARKS
            </div>
          </div>
        </div>

        {/* Command Line Input & Console Output Log */}
        <div className="border border-[#00ff41]/40 bg-black p-3 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-[#00ff41]/20 pb-1.5 text-[#00aa2c]">
            <span className="flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5" /> SYSTEM INTERACTIVE CLI COMMAND BAR
            </span>
            <span className="text-[10px] text-[#008f11]">
              TYPE 'help', 'search &lt;query&gt;', 'parse resume', 'eval', 'clear'
            </span>
          </div>

          {/* Console Buffer View */}
          <div className="max-h-36 overflow-y-auto space-y-1 text-xs bg-[#000d00] p-2.5 border border-[#00ff41]/20 font-mono">
            {commandLogs.map((log) => (
              <div key={log.id} className="whitespace-pre-wrap leading-relaxed">
                <span className="text-[#008f11]">[{log.time}]</span>{' '}
                {log.type === 'cmd' && <span className="text-[#00ff41] font-bold">{log.text}</span>}
                {log.type === 'out' && <span className="text-[#00cc33]">{log.text}</span>}
                {log.type === 'sys' && <span className="text-[#00e5ff]">{log.text}</span>}
                {log.type === 'err' && <span className="text-red-400 font-bold">{log.text}</span>}
              </div>
            ))}
            <div ref={terminalLogEndRef} />
          </div>

          {/* Active Prompt Input Bar */}
          <div className="flex items-center gap-2 bg-[#001a00] p-2 border border-[#00ff41]/40">
            <span className="text-[#00ff41] font-bold shrink-0">gigmatch@terminal:~$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunCommand();
              }}
              placeholder="Type CLI command or 'help'..."
              className="w-full bg-transparent text-[#00ff41] placeholder-[#008f11] focus:outline-none text-xs font-mono"
            />
            <span className="w-2 h-4 bg-[#00ff41] animate-pulse shrink-0"></span>
            <button
              onClick={() => handleRunCommand()}
              className="bg-[#00ff41] text-black px-3 py-1 text-xs font-bold hover:bg-[#00cc33] transition-colors border border-[#00ff41] shrink-0"
            >
              [EXEC]
            </button>
          </div>

          {/* Quick Command Buttons Bar */}
          <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
            <span className="text-[#008f11] self-center">QUICK DIRECTIVES:</span>
            {[
              { label: 'help', cmd: 'help' },
              { label: 'list gigs', cmd: 'list gigs' },
              { label: 'parse resume', cmd: 'parse resume' },
              { label: 'post gig', cmd: 'post gig' },
              { label: 'eval benchmarks', cmd: 'eval benchmarks' },
              { label: 'status', cmd: 'status' },
              { label: 'clear', cmd: 'clear' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleRunCommand(item.cmd)}
                className="bg-[#002b00] hover:bg-[#00ff41] text-[#00ff41] hover:text-black px-2 py-0.5 border border-[#00ff41]/40 transition-colors text-[11px]"
              >
                [{item.label}]
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border border-[#00ff41]/40 bg-[#001100] p-2">
          {[
            { id: 'gigs', label: 'F1: GIG DISCOVERY', icon: Search },
            { id: 'resume', label: 'F2: RESUME PARSER', icon: FileText },
            { id: 'post', label: 'F3: CLIENT REQUISITION', icon: Plus },
            { id: 'benchmarks', label: 'F4: ADMIN ALGO BENCHMARKS', icon: Cpu },
            { id: 'apps', label: `F5: APPLICATIONS AUDIT (${applications.length})`, icon: List },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-[#00ff41] text-black border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                    : 'bg-black text-[#00ff41] border-[#00ff41]/30 hover:border-[#00ff41] hover:bg-[#002200]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-black' : 'text-[#00ff41]'}`} />
                <span>[{tab.label}]</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: GIG DISCOVERY & MATCHING */}
        {activeTab === 'gigs' && (
          <div className="space-y-4">
            {/* Search & Skill Filter Controls */}
            <div className="border border-[#00ff41]/40 bg-[#000d00] p-3 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#00ff41]/20 pb-2">
                <span className="font-bold text-[#00ff41] flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" /> GIG QUERY PARAMETERS
                </span>
                <span className="text-[11px] text-[#008f11]">
                  MATCHING ENGINE: REASONING &amp; SEMANTIC COCOSINE
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 flex items-center bg-black border border-[#00ff41]/40 px-2 py-1">
                  <span className="text-[#008f11] text-xs mr-2">search&gt;</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by gig title, company, or keyword..."
                    className="w-full bg-transparent text-[#00ff41] placeholder-[#008f11] focus:outline-none text-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[#008f11] hover:text-[#00ff41] text-xs px-1"
                    >
                      [x]
                    </button>
                  )}
                </div>

                {/* Skill Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[#008f11]">SKILL:</span>
                  <button
                    onClick={() => setSkillFilter('ALL')}
                    className={`px-2 py-0.5 border text-[11px] ${
                      skillFilter === 'ALL'
                        ? 'bg-[#00ff41] text-black border-[#00ff41] font-bold'
                        : 'bg-black text-[#00ff41] border-[#00ff41]/30 hover:bg-[#002200]'
                    }`}
                  >
                    [ALL]
                  </button>
                  {allUniqueSkills.slice(0, 7).map((skill) => (
                    <button
                      key={skill}
                      onClick={() => setSkillFilter(skill)}
                      className={`px-2 py-0.5 border text-[11px] ${
                        skillFilter === skill
                          ? 'bg-[#00ff41] text-black border-[#00ff41] font-bold'
                          : 'bg-black text-[#00ff41] border-[#00ff41]/30 hover:bg-[#002200]'
                      }`}
                    >
                      [{skill}]
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gig Output Blocks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#008f11] px-1">
                <span>&gt; FOUND {filteredGigs.length} REQUISITION BLOCKS MATCHING FILTER</span>
                <span>SORT BY: OVERALL MATCH SCORE (DESC)</span>
              </div>

              {filteredGigs.length === 0 ? (
                <div className="border border-[#00ff41]/30 bg-black p-6 text-center text-xs text-[#008f11]">
                  [NO REQUISITIONS MATCHED YOUR SEARCH PARAMETERS. TYPE 'clear' OR ADJUST FILTERS]
                </div>
              ) : (
                filteredGigs.map((gig) => {
                  const match = gig.match_breakdown;
                  const score = match?.overall_score || 85;
                  const isApplied = appliedGigs.has(gig.id);

                  return (
                    <div
                      key={gig.id}
                      className="border border-[#00ff41]/40 bg-black p-4 space-y-3 relative hover:border-[#00ff41] transition-colors"
                    >
                      {/* Top Bar of ASCII Card */}
                      <div className="text-xs text-[#008f11]">
                        ┌─ [{gig.id}] {gig.client_company.toUpperCase()} ────────────────────────────────────────── [MODE: {gig.work_mode.toUpperCase()}] ─┐
                      </div>

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pt-1">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00ff41] font-bold text-sm hover:underline cursor-pointer" onClick={() => setSelectedGig(gig)}>
                              &gt; {gig.title}
                            </span>
                            <span className="bg-[#002200] text-[#00ff41] px-1.5 py-0.5 border border-[#00ff41]/30 text-[10px]">
                              [{gig.category}]
                            </span>
                          </div>

                          <div className="text-xs text-[#00cc33] flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>CLIENT: <strong className="text-[#00ff41]">{gig.client_name}</strong> (@{gig.client_company})</span>
                            <span>BUDGET: <strong className="text-[#00ff41]">${gig.budget_min} - ${gig.budget_max}/hr</strong></span>
                            <span>POSTED: {new Date(gig.posted_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Match Score Progress Bar Block */}
                        <div className="border border-[#00ff41]/30 bg-[#001100] p-2.5 space-y-1 text-right min-w-[220px]">
                          <div className="text-[11px] text-[#008f11] flex justify-between">
                            <span>MATCH SCORE:</span>
                            <span className="text-[#00ff41] font-bold">{score}%</span>
                          </div>
                          <div className="text-xs tracking-wider text-[#00ff41] font-bold">
                            [{renderBlockProgressBar(score, 10)}]
                          </div>
                          {match && (
                            <div className="text-[10px] text-[#00aa2c] flex justify-between pt-0.5">
                              <span>KW: {match.keyword_score}%</span>
                              <span>SEM: {match.semantic_score}%</span>
                              <span>COV: {match.skill_coverage_pct}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Snippet */}
                      <div className="text-xs text-[#00cc33] line-clamp-2 bg-[#000a00] p-2 border-l-2 border-[#00ff41]/40">
                        {gig.description}
                      </div>

                      {/* Required Skills */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[#008f11] text-[11px]">REQUIRED SKILLS:</span>
                        {gig.required_skills.map((skill) => (
                          <span
                            key={skill}
                            className="bg-[#001c00] text-[#00ff41] px-1.5 py-0.5 border border-[#00ff41]/30 text-[11px]"
                          >
                            [{skill}]
                          </span>
                        ))}
                      </div>

                      {/* Bottom Controls / ASCII Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#00ff41]/20 pt-3">
                        <button
                          onClick={() => setSelectedGig(gig)}
                          className="bg-[#002200] hover:bg-[#00ff41] text-[#00ff41] hover:text-black px-3 py-1 text-xs border border-[#00ff41]/40 transition-colors flex items-center gap-1"
                        >
                          <Maximize2 className="h-3 w-3" />
                          [INSPECT MATCH BREAKDOWN]
                        </button>

                        {isApplied ? (
                          <span className="bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41] px-3 py-1 text-xs font-bold">
                            [APPLICATION SUBMITTED]
                          </span>
                        ) : (
                          <button
                            onClick={() => setApplyModalGig(gig)}
                            className="bg-[#00ff41] text-black hover:bg-[#00cc33] font-bold px-4 py-1 text-xs border border-[#00ff41] transition-colors"
                          >
                            [SUBMIT APPLICATION &gt;]
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-[#008f11]">
                        └──────────────────────────────────────────────────────────────────────────────────────────┘
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: RESUME PARSER WORKFLOW */}
        {activeTab === 'resume' && (
          <div className="space-y-4">
            <div className="border border-[#00ff41]/40 bg-[#000d00] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#00ff41]/20 pb-2">
                <span className="font-bold text-[#00ff41] flex items-center gap-2">
                  <FileText className="h-4 w-4" /> RESUME LLM PARSER &amp; VECTORIZATION ENGINE
                </span>
                <span className="text-[11px] text-[#008f11]">[MODEL: CLAUDE-PARSER-V4]</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Pane: Raw Resume Input */}
                <div className="space-y-2">
                  <div className="text-xs text-[#008f11] flex justify-between">
                    <span>&gt; RAW CANDIDATE RESUME BUFFER</span>
                    <span>{resumeText.length} CHARS</span>
                  </div>
                  <textarea
                    rows={12}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="w-full bg-black text-[#00ff41] border border-[#00ff41]/40 p-3 text-xs font-mono focus:outline-none focus:border-[#00ff41] leading-relaxed"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartResumeParse}
                      disabled={isParsing}
                      className={`flex-1 py-2 px-4 text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                        isParsing
                          ? 'bg-[#003300] text-[#00aa2c] border-[#008f11] cursor-not-allowed'
                          : 'bg-[#00ff41] text-black border-[#00ff41] hover:bg-[#00cc33]'
                      }`}
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          [PARSING RESUME VECTORS...]
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          [EXECUTE RESUME PARSER SCAN]
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setResumeText(
                          'Jane Doe | Lead AI Systems Architect\nExpertise: Python, PyTorch, LangChain, React, TypeScript, Vector Databases, AWS, Kubernetes.\nExperience: 8+ years developing high-throughput ML pipelines and enterprise software.'
                        )
                      }
                      className="bg-[#002200] hover:bg-[#003b00] text-[#00ff41] px-3 py-2 text-xs border border-[#00ff41]/40"
                    >
                      [LOAD PRESET]
                    </button>
                  </div>
                </div>

                {/* Right Pane: Streaming Log Terminal Output */}
                <div className="space-y-2 flex flex-col">
                  <div className="text-xs text-[#008f11]">
                    &gt; PARSER STDOUT REAL-TIME STREAMING LOG
                  </div>
                  <div className="flex-1 min-h-[260px] max-h-[340px] overflow-y-auto bg-[#000a00] border border-[#00ff41]/40 p-3 space-y-1.5 text-xs text-[#00cc33] font-mono leading-relaxed">
                    {parseLogs.length === 0 ? (
                      <div className="text-[#008f11] text-center pt-12">
                        [PARSER IDLE. CLICK &apos;EXECUTE RESUME PARSER SCAN&apos; TO STREAM LOGS]
                      </div>
                    ) : (
                      parseLogs.map((logLine, idx) => (
                        <div key={idx} className="whitespace-pre-wrap">
                          {logLine}
                        </div>
                      ))
                    )}
                    <div ref={resumeLogEndRef} />
                  </div>
                </div>
              </div>

              {/* Parsed Extracted Skill Breakdown Matrix */}
              {parsedSkillsOutput.length > 0 && (
                <div className="border-t border-[#00ff41]/30 pt-3 space-y-2">
                  <div className="text-xs text-[#00ff41] font-bold">
                    &gt; EXTRACTED SKILL ENTITY CONFIDENCE MATRIX:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {parsedSkillsOutput.map((item) => {
                      const confPct = Math.round(item.confidence * 100);
                      return (
                        <div
                          key={item.name}
                          className="bg-black p-2 border border-[#00ff41]/30 text-xs space-y-1"
                        >
                          <div className="flex justify-between font-bold">
                            <span>[{item.name}]</span>
                            <span>{confPct}%</span>
                          </div>
                          <div className="text-[10px] text-[#008f11] uppercase">
                            CAT: {item.category}
                          </div>
                          <div className="text-[11px] text-[#00ff41]">
                            [{renderBlockProgressBar(confPct, 8)}]
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

        {/* TAB 3: CLIENT GIG POSTING REQUISITION */}
        {activeTab === 'post' && (
          <div className="space-y-4">
            <div className="border border-[#00ff41]/40 bg-[#000d00] p-4 space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-[#00ff41]/20 pb-2">
                <span className="font-bold text-[#00ff41] flex items-center gap-2">
                  <Plus className="h-4 w-4" /> CLIENT REQUISITION WIZARD: POST NEW GIG
                </span>
                <span className="text-[11px] text-[#008f11]">[SYSTEM: POST_PERMISSIONS_OK]</span>
              </div>

              {postNotification && (
                <div className="bg-[#00ff41]/20 border border-[#00ff41] text-[#00ff41] p-3 text-xs font-bold">
                  {postNotification}
                </div>
              )}

              <form onSubmit={handlePostGigSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#008f11] block">title &gt; [ REQUISITION TITLE ]</label>
                    <input
                      type="text"
                      required
                      value={postFormData.title}
                      onChange={(e) => setPostFormData({ ...postFormData, title: e.target.value })}
                      placeholder="e.g. Senior React Architect & AI Specialist"
                      className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#008f11] block">company &gt; [ HIRING ENTITY ]</label>
                    <input
                      type="text"
                      required
                      value={postFormData.client_company}
                      onChange={(e) =>
                        setPostFormData({ ...postFormData, client_company: e.target.value })
                      }
                      placeholder="e.g. CyberDyne Systems Labs"
                      className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#008f11] block">budget_min ($/hr) &gt;</label>
                    <input
                      type="number"
                      value={postFormData.budget_min}
                      onChange={(e) =>
                        setPostFormData({ ...postFormData, budget_min: Number(e.target.value) })
                      }
                      className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#008f11] block">budget_max ($/hr) &gt;</label>
                    <input
                      type="number"
                      value={postFormData.budget_max}
                      onChange={(e) =>
                        setPostFormData({ ...postFormData, budget_max: Number(e.target.value) })
                      }
                      className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#008f11] block">work_mode &gt;</label>
                    <select
                      value={postFormData.work_mode}
                      onChange={(e) =>
                        setPostFormData({
                          ...postFormData,
                          work_mode: e.target.value as 'Remote' | 'Hybrid' | 'Onsite',
                        })
                      }
                      className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    >
                      <option value="Remote">[REMOTE]</option>
                      <option value="Hybrid">[HYBRID]</option>
                      <option value="Onsite">[ONSITE]</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[#008f11] block">
                    required_skills (comma-separated) &gt;
                  </label>
                  <input
                    type="text"
                    value={postFormData.required_skills}
                    onChange={(e) =>
                      setPostFormData({ ...postFormData, required_skills: e.target.value })
                    }
                    placeholder="e.g. React, TypeScript, Python, PyTorch, GraphQL"
                    className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#008f11] block">description &gt; [ SPECIFICATION ]</label>
                  <textarea
                    rows={4}
                    value={postFormData.description}
                    onChange={(e) =>
                      setPostFormData({ ...postFormData, description: e.target.value })
                    }
                    placeholder="Detailed project requirements and tech stack requirements..."
                    className="w-full bg-black border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#00ff41] text-black font-bold border border-[#00ff41] hover:bg-[#00cc33] transition-colors text-xs"
                >
                  [EXECUTE: POST GIG REQUISITION TO NETWORK]
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN ALGORITHM EVALUATION BENCHMARKS */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-4">
            <div className="border border-[#00ff41]/40 bg-[#000d00] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00ff41]/20 pb-2 text-xs">
                <span className="font-bold text-[#00ff41] flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> ADMIN ALGORITHM MATCHING EVALUATION MATRIX
                </span>
                <button
                  onClick={handleRunAdminEval}
                  disabled={isEvaluating}
                  className={`px-3 py-1 text-xs font-bold border transition-colors ${
                    isEvaluating
                      ? 'bg-[#002200] text-[#008f11] border-[#008f11] cursor-not-allowed'
                      : 'bg-[#00ff41] text-black border-[#00ff41] hover:bg-[#00cc33]'
                  }`}
                >
                  {isEvaluating ? '[RUNNING EVAL BENCHMARKS...]' : '[RUN BENCHMARK SUITE]'}
                </button>
              </div>

              {/* Algorithm Filter Radio Options */}
              <div className="flex items-center gap-2 text-xs text-[#008f11]">
                <span>FILTER ALGO:</span>
                {(['all', 'keyword', 'semantic', 'hybrid'] as const).map((algo) => (
                  <button
                    key={algo}
                    onClick={() => setEvalFilterAlgo(algo)}
                    className={`px-2 py-0.5 border text-[11px] uppercase ${
                      evalFilterAlgo === algo
                        ? 'bg-[#00ff41] text-black border-[#00ff41] font-bold'
                        : 'bg-black text-[#00ff41] border-[#00ff41]/30 hover:bg-[#002200]'
                    }`}
                  >
                    [{algo}]
                  </button>
                ))}
              </div>

              {/* CLI Formatted Benchmark Output Table */}
              <div className="overflow-x-auto bg-black border border-[#00ff41]/30 p-2 font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#00ff41]/40 text-[#00ff41]">
                      <th className="p-2">| ALGORITHM ID</th>
                      <th className="p-2">| ALGORITHM NAME</th>
                      <th className="p-2 text-right">| NDCG@5</th>
                      <th className="p-2 text-right">| NDCG@10</th>
                      <th className="p-2 text-right">| MAP SCORE</th>
                      <th className="p-2 text-right">| MRR SCORE</th>
                      <th className="p-2 text-right">| PRECISION@5</th>
                      <th className="p-2 text-right">| LATENCY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#00ff41]/20 text-[#00cc33]">
                    {benchmarks
                      .filter(
                        (b) => evalFilterAlgo === 'all' || b.algorithm_id === evalFilterAlgo
                      )
                      .map((bm) => (
                        <tr key={bm.algorithm_id} className="hover:bg-[#001c00]">
                          <td className="p-2 font-bold text-[#00ff41]">| {bm.algorithm_id}</td>
                          <td className="p-2">| {bm.algorithm_name}</td>
                          <td className="p-2 text-right text-[#00ff41] font-bold">
                            | {bm.ndcg_5.toFixed(4)}
                          </td>
                          <td className="p-2 text-right">| {bm.ndcg_10.toFixed(4)}</td>
                          <td className="p-2 text-right">| {bm.map_score.toFixed(4)}</td>
                          <td className="p-2 text-right">| {bm.mrr_score.toFixed(4)}</td>
                          <td className="p-2 text-right">| {bm.precision_5.toFixed(4)}</td>
                          <td className="p-2 text-right">| {bm.latency_ms} ms</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Benchmark Execution Logs Terminal View */}
              {evalLogs.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-[#008f11]">
                    &gt; BENCHMARK SUITE EXECUTION STDOUT LOGS
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-[#000a00] border border-[#00ff41]/30 p-2 text-xs text-[#00cc33] space-y-1 font-mono">
                    {evalLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                    <div ref={evalLogEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APPLICATIONS AUDIT LOG */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="border border-[#00ff41]/40 bg-[#000d00] p-4 space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-[#00ff41]/20 pb-2">
                <span className="font-bold text-[#00ff41] flex items-center gap-2">
                  <List className="h-4 w-4" /> APPLICATIONS AUDIT LOG &amp; CANDIDATE EVALUATION
                </span>
                <span className="text-[11px] text-[#008f11]">
                  TOTAL RECORDED: {applications.length}
                </span>
              </div>

              <div className="space-y-3">
                {applications.map((app) => {
                  const statusBracket = `[${app.status.toUpperCase()}]`;
                  return (
                    <div
                      key={app.id}
                      className="border border-[#00ff41]/30 bg-black p-3 space-y-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00ff41]/20 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#00ff41] font-bold">
                            &gt; [{app.id}] {app.freelancer_name}
                          </span>
                          <span className="text-[#008f11]">({app.freelancer_title})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[#008f11]">REQUISITION:</span>
                          <span className="text-[#00ff41] font-bold">{app.gig_title}</span>
                          <span
                            className={`px-2 py-0.5 border font-bold text-[11px] ${
                              app.status === 'accepted' || app.status === 'shortlisted'
                                ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]'
                                : app.status === 'declined'
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-[#002200] text-[#00cc33] border-[#008f11]'
                            }`}
                          >
                            {statusBracket}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                        <div>
                          MATCH SCORE: [{renderBlockProgressBar(app.match_score, 10)}] ({app.match_score}%)
                        </div>
                        <div className="text-[#008f11]">
                          KW SCORE: {app.keyword_score}% | SEM SCORE: {app.semantic_score}% | APPLIED: {app.applied_at}
                        </div>
                      </div>

                      {app.proposal_text && (
                        <div className="bg-[#000a00] p-2 border-l-2 border-[#00ff41]/40 text-[#00cc33]">
                          <strong className="text-[#008f11]">PROPOSAL:</strong> "{app.proposal_text}"
                        </div>
                      )}

                      {/* Status Update Actions for Client Role */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#00ff41]/20">
                        <span className="text-[#008f11] text-[11px]">UPDATE STATUS:</span>
                        {(['pending', 'shortlisted', 'accepted', 'declined'] as const).map(
                          (statusVal) => (
                            <button
                              key={statusVal}
                              onClick={() => onUpdateAppStatus(app.id, statusVal)}
                              className={`px-2 py-0.5 text-[11px] border uppercase transition-colors ${
                                app.status === statusVal
                                  ? 'bg-[#00ff41] text-black border-[#00ff41] font-bold'
                                  : 'bg-black text-[#00ff41] border-[#00ff41]/30 hover:bg-[#002200]'
                              }`}
                            >
                              [{statusVal}]
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: GIG MATCH BREAKDOWN INSPECTOR */}
        {selectedGig && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-black border-2 border-[#00ff41] p-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-[0_0_30px_rgba(0,255,65,0.2)]">
              <div className="flex items-center justify-between border-b border-[#00ff41]/40 pb-2 text-xs">
                <span className="font-bold text-[#00ff41]">
                  ┌─ GIG INSPECTOR DIAGNOSTIC: [{selectedGig.id}] ─┐
                </span>
                <button
                  onClick={() => setSelectedGig(null)}
                  className="bg-black text-[#00ff41] hover:bg-[#00ff41] hover:text-black border border-[#00ff41] px-2 py-0.5 text-xs font-bold"
                >
                  [CLOSE X]
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-[#00ff41]">&gt; {selectedGig.title}</div>
                <div className="text-xs text-[#00cc33] flex flex-wrap gap-4">
                  <span>COMPANY: {selectedGig.client_company}</span>
                  <span>BUDGET: ${selectedGig.budget_min} - ${selectedGig.budget_max}/hr</span>
                  <span>WORK: {selectedGig.work_mode}</span>
                </div>
              </div>

              {/* Match Score Matrix */}
              <div className="border border-[#00ff41]/40 bg-[#001100] p-3 space-y-2 text-xs">
                <div className="font-bold text-[#00ff41] border-b border-[#00ff41]/20 pb-1">
                  &gt; AI MATCH REASONING &amp; BREAKDOWN MATRIX:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-black p-2 border border-[#00ff41]/30">
                    <div className="text-[#008f11] text-[10px]">OVERALL FIT</div>
                    <div className="text-base font-bold text-[#00ff41]">
                      {selectedGig.match_breakdown?.overall_score || 88}%
                    </div>
                    <div className="text-[10px]">
                      [{renderBlockProgressBar(selectedGig.match_breakdown?.overall_score || 88, 6)}]
                    </div>
                  </div>
                  <div className="bg-black p-2 border border-[#00ff41]/30">
                    <div className="text-[#008f11] text-[10px]">KEYWORD MATCH</div>
                    <div className="text-base font-bold text-[#00ff41]">
                      {selectedGig.match_breakdown?.keyword_score || 90}%
                    </div>
                    <div className="text-[10px]">
                      [{renderBlockProgressBar(selectedGig.match_breakdown?.keyword_score || 90, 6)}]
                    </div>
                  </div>
                  <div className="bg-black p-2 border border-[#00ff41]/30">
                    <div className="text-[#008f11] text-[10px]">SEMANTIC FIT</div>
                    <div className="text-base font-bold text-[#00ff41]">
                      {selectedGig.match_breakdown?.semantic_score || 94}%
                    </div>
                    <div className="text-[10px]">
                      [{renderBlockProgressBar(selectedGig.match_breakdown?.semantic_score || 94, 6)}]
                    </div>
                  </div>
                </div>

                {selectedGig.match_breakdown?.justification && (
                  <div className="bg-[#000a00] p-2 border-l-2 border-[#00ff41] text-[#00cc33] text-xs leading-relaxed pt-2">
                    <strong className="text-[#00ff41]">[SYS_JUSTIFICATION]:</strong>{' '}
                    {selectedGig.match_breakdown.justification}
                  </div>
                )}
              </div>

              {/* Skills Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-black border border-[#00ff41]/30 p-2.5 space-y-1.5">
                  <div className="text-[#00ff41] font-bold">
                    [+] MATCHING SKILLS ({selectedGig.match_breakdown?.matching_skills.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedGig.match_breakdown?.matching_skills || selectedGig.required_skills).map(
                      (sk) => (
                        <span
                          key={sk}
                          className="bg-[#002b00] text-[#00ff41] px-1.5 py-0.5 border border-[#00ff41]/40 text-[11px]"
                        >
                          [+ {sk}]
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-black border border-[#00ff41]/30 p-2.5 space-y-1.5">
                  <div className="text-amber-400 font-bold">
                    [-] MISSING SKILLS ({selectedGig.match_breakdown?.missing_skills.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedGig.match_breakdown?.missing_skills || []).length === 0 ? (
                      <span className="text-[#008f11] text-[11px]">[NONE - 100% COVERAGE]</span>
                    ) : (
                      selectedGig.match_breakdown?.missing_skills.map((sk) => (
                        <span
                          key={sk}
                          className="bg-amber-950 text-amber-300 px-1.5 py-0.5 border border-amber-700 text-[11px]"
                        >
                          [- {sk}]
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#00ff41]/30 text-xs">
                <button
                  onClick={() => setSelectedGig(null)}
                  className="bg-black text-[#00ff41] hover:bg-[#002200] border border-[#00ff41]/40 px-3 py-1.5"
                >
                  [BACK TO GIGS]
                </button>
                <button
                  onClick={() => {
                    const g = selectedGig;
                    setSelectedGig(null);
                    setApplyModalGig(g);
                  }}
                  className="bg-[#00ff41] text-black font-bold hover:bg-[#00cc33] border border-[#00ff41] px-4 py-1.5"
                >
                  [SUBMIT APPLICATION NOW]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: APPLICATION SUBMISSION PROMPT */}
        {applyModalGig && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-black border-2 border-[#00ff41] p-4 max-w-xl w-full space-y-3 shadow-[0_0_30px_rgba(0,255,65,0.2)] text-xs">
              <div className="flex items-center justify-between border-b border-[#00ff41]/40 pb-2">
                <span className="font-bold text-[#00ff41]">
                  ┌─ SUBMIT REQUISITION APPLICATION ─┐
                </span>
                <button
                  onClick={() => setApplyModalGig(null)}
                  className="bg-black text-[#00ff41] border border-[#00ff41] px-2 py-0.5 text-xs"
                >
                  [X]
                </button>
              </div>

              <div>
                <div className="text-[#00ff41] font-bold">&gt; TARGET: {applyModalGig.title}</div>
                <div className="text-[#008f11]">
                  CLIENT: {applyModalGig.client_company} | BUDGET: ${applyModalGig.budget_min}-${applyModalGig.budget_max}/hr
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#008f11] block">&gt; ENTER CANDIDATE PROPOSAL BRIEF:</label>
                <textarea
                  rows={4}
                  value={proposalText}
                  onChange={(e) => setProposalText(e.target.value)}
                  placeholder="Outline relevant background, availability, and key tech stack align..."
                  className="w-full bg-[#000a00] border border-[#00ff41]/40 p-2 text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#00ff41]/30">
                <button
                  onClick={() => setApplyModalGig(null)}
                  className="bg-black text-[#00ff41] border border-[#00ff41]/40 px-3 py-1"
                >
                  [CANCEL]
                </button>
                <button
                  onClick={handleApplySubmit}
                  className="bg-[#00ff41] text-black font-bold border border-[#00ff41] hover:bg-[#00cc33] px-4 py-1"
                >
                  [TRANSMIT PROPOSAL]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
