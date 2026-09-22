import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Terminal, Search, Filter, Cpu, CheckCircle2, AlertCircle,
  ArrowRight, Code, Zap, RefreshCw, Send, Layers
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

export const PrecisionWorkbench: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigs[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'matches' | 'parser' | 'post' | 'eval'>('matches');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isParsing, setIsParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  // New gig form state
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');
  const [newBudget, setNewBudget] = useState('90');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleParse = () => {
    setIsParsing(true);
    setParseSuccess(false);
    setTimeout(() => {
      setIsParsing(false);
      setParseSuccess(true);
    }, 600);
  };

  const handleCreateGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onPostGig({
      title: newTitle,
      required_skills: newSkills.split(',').map(s => s.trim()),
      budget_min: Number(newBudget),
      budget_max: Number(newBudget) + 30,
      client_company: 'Vanguard Systems',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Gig posted successfully in Workbench!');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-mono text-slate-200">
      {/* Workbench Navigation Ribbon */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-sky-400">
            <Terminal className="h-4 w-4" /> WORKBENCH OS v2.4
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedTab('matches')}
              className={`px-3 py-1 rounded font-semibold transition ${
                selectedTab === 'matches' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {role === 'client' ? '[1] Applicant Matrix' : '[1] Gig Discovery & Matches'}
            </button>
            {role === 'freelancer' && (
              <button
                onClick={() => setSelectedTab('parser')}
                className={`px-3 py-1 rounded font-semibold transition ${
                  selectedTab === 'parser' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                [2] Resume Parser Console
              </button>
            )}
            {role === 'client' && (
              <button
                onClick={() => setSelectedTab('post')}
                className={`px-3 py-1 rounded font-semibold transition ${
                  selectedTab === 'post' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                [2] Post New Gig
              </button>
            )}
            {role === 'admin' && (
              <button
                onClick={() => setSelectedTab('eval')}
                className={`px-3 py-1 rounded font-semibold transition ${
                  selectedTab === 'eval' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                [3] AI Ranking Evaluation
              </button>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-400">
          <span>Search: <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-sky-400">⌘K</kbd></span>
          <span>Switch: <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-sky-400">Tab</kbd></span>
        </div>
      </div>

      {/* Main Workbench Body */}
      <div className="p-4">
        {selectedTab === 'matches' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Left Column: Dense Data Table */}
            <div className="lg:col-span-5 border border-slate-800 bg-slate-900/60 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter gigs by title or skill (e.g. FastAPI, React)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                {filteredGigs.map((g) => {
                  const isSelected = g.id === activeGig.id;
                  const match = g.match_breakdown;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`cursor-pointer rounded border p-3 transition text-xs ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/30'
                          : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-slate-100 truncate max-w-[240px]">{g.title}</span>
                        {match && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            match.overall_score >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                          }`}>
                            SCORE: {match.overall_score}%
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mb-2">
                        {g.client_company} · ${g.budget_min}-${g.budget_max}/hr · {g.work_mode}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {g.required_skills.slice(0, 4).map(s => (
                          <span key={s} className="bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Deep Inspector Panel */}
            <div className="lg:col-span-7 border border-slate-800 bg-slate-900/60 rounded-lg p-5">
              {activeGig && (
                <div className="space-y-5">
                  {/* Header info */}
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400">INSPECTION NODE: {activeGig.id}</span>
                        <h2 className="text-lg font-bold text-white mt-1">{activeGig.title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{activeGig.client_company} · Posted {new Date(activeGig.posted_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-emerald-400">${activeGig.budget_min}-${activeGig.budget_max}/hr</div>
                        <div className="text-[10px] text-slate-400">{activeGig.work_mode}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Match Breakdown Box */}
                  {activeGig.match_breakdown && (
                    <div className="border border-sky-500/30 bg-sky-950/20 rounded p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-sky-900/50 pb-2">
                        <span className="font-bold text-sky-300 flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5" /> AI MATCH BREAKDOWN
                        </span>
                        <span className="font-mono text-slate-300">Coverage: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center py-1">
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-400">HYBRID SCORE</div>
                          <div className="text-lg font-bold text-sky-400">{activeGig.match_breakdown.overall_score}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-400">KEYWORD BM25</div>
                          <div className="text-lg font-bold text-indigo-400">{activeGig.match_breakdown.keyword_score}%</div>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-400">SEMANTIC SIM</div>
                          <div className="text-lg font-bold text-emerald-400">{activeGig.match_breakdown.semantic_score}%</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
                        <span className="text-sky-400 font-bold">Justification: </span>
                        {activeGig.match_breakdown.justification}
                      </div>
                    </div>
                  )}

                  {/* Gig Description */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scope of Work</h3>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800/80">
                      {activeGig.description}
                    </p>
                  </div>

                  {/* Applications / Actions */}
                  {role === 'client' ? (
                    <div className="border-t border-slate-800 pt-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Applicant Actions</h3>
                      <div className="space-y-2">
                        {applications.map(app => (
                          <div key={app.id} className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800 text-xs">
                            <div>
                              <div className="font-bold text-white">{app.freelancer_name}</div>
                              <div className="text-[10px] text-slate-400">{app.freelancer_title} · Score: {app.match_score}%</div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                                className="px-2 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/40 rounded text-[10px] hover:bg-sky-500/30"
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                                className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[10px] hover:bg-emerald-500/30"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => alert(`Application submitted for ${activeGig.title}`)}
                        className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 shadow-lg"
                      >
                        <Send className="h-3.5 w-3.5" /> SUBMIT PROPOSAL FOR {activeGig.id}
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Resume Parser Console */}
        {selectedTab === 'parser' && (
          <div className="max-w-4xl mx-auto border border-slate-800 bg-slate-900/60 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Code className="h-4 w-4" /> DETERMINISTIC RESUME PARSER & SKILL EXTRACTOR
              </h2>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">MODEL: spaCy / sentence-transformers</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Paste Raw Resume Text:</label>
              <textarea
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs focus:outline-none focus:border-sky-500 font-mono text-slate-200"
              />
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleParse}
                disabled={isParsing}
                className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-5 py-2 rounded flex items-center gap-2"
              >
                {isParsing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {isParsing ? 'EXTRACTING SKILLS...' : 'RUN PARSER'}
              </button>

              {parseSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Parsed 7 Skills with high confidence!
                </span>
              )}
            </div>

            {parseSuccess && (
              <div className="border border-emerald-500/30 bg-emerald-950/20 p-4 rounded space-y-3">
                <h3 className="text-xs font-bold text-emerald-400">Extracted Skill Matrix:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="bg-slate-950 p-2 rounded border border-slate-800">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post Gig Form (Client) */}
        {selectedTab === 'post' && (
          <div className="max-w-2xl mx-auto border border-slate-800 bg-slate-900/60 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-bold text-sky-400 border-b border-slate-800 pb-2">POST NEW GIG OPPORTUNITY</h2>
            <form onSubmit={handleCreateGig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Gig Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior FastAPI & React Developer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Required Skills (comma separated):</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hourly Budget Min ($/hr):</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded">
                PUBLISH GIG TO MARKETPLACE
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Evaluation Benchmarks (Admin) */}
        {selectedTab === 'eval' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="border border-amber-500/30 bg-amber-950/10 p-5 rounded-lg">
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 border-b border-amber-800/50 pb-2">
                <Layers className="h-4 w-4" /> ADMIN MATCHING ENGINE BENCHMARKS
              </h2>
              <p className="text-xs text-slate-300 mt-2">
                Evaluating Keyword (BM25) vs. Semantic (Vector Cosine) vs. Hybrid Blend over 150 ground-truth query pairs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border border-slate-800 bg-slate-900 p-4 rounded-lg space-y-3 text-xs">
                  <div className="font-bold text-sky-400 border-b border-slate-800 pb-1.5">{b.algorithm_name}</div>
                  <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between"><span>NDCG@5:</span> <span className="font-bold text-white">{b.ndcg_5}</span></div>
                    <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-bold text-white">{b.ndcg_10}</span></div>
                    <div className="flex justify-between"><span>MAP Score:</span> <span className="font-bold text-white">{b.map_score}</span></div>
                    <div className="flex justify-between"><span>MRR Score:</span> <span className="font-bold text-white">{b.mrr_score}</span></div>
                    <div className="flex justify-between"><span>Avg Latency:</span> <span className="font-bold text-emerald-400">{b.latency_ms} ms</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
