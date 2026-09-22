import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Radar, Radio, Crosshair, Search, Cpu, CheckCircle2,
  Send, RefreshCw, Layers, ShieldCheck, Zap, Target, Lock
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

export const SoftNeumorphic: React.FC<Props> = ({
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
  const [activeTab, setActiveTab] = useState<'sonar' | 'parser' | 'post' | 'admin'>('sonar');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isSweeping, setIsSweeping] = useState(false);

  // New gig form
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSweepParser = () => {
    setIsSweeping(true);
    setTimeout(() => setIsSweeping(false), 600);
  };

  const handlePostGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onPostGig({
      title: newTitle,
      required_skills: newSkills.split(',').map(s => s.trim()),
      budget_min: 95,
      budget_max: 135,
      client_company: 'Radar Sonar Hub',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Target node deployed to Radar Sonar Grid!');
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-mono p-4 sm:p-8 relative overflow-hidden selection:bg-emerald-500 selection:text-black flex flex-col justify-between">

      {/* Background Radial Rings Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-emerald-500/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-emerald-500/15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-emerald-500/20 pointer-events-none" />

      {/* Top Radar Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full mb-8 bg-[#0d1522]/90 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-emerald-400 text-sm tracking-wider uppercase">RADAR SWEEP // SONAR TARGET GRID</h1>
            <p className="text-[10px] text-slate-400">Concept 11 (Bold Radar Sweep & Target Acquisition)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sonar')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'sonar'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            [01] SONAR GRID
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'parser'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                  : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              [02] RESUME SWEEPER
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'post'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                  : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              [02] DEPLOY TARGET
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                  : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              [03] METRIC RADAR
            </button>
          )}
        </div>
      </header>

      {/* Main Radar Screen */}
      <main className="relative z-10 max-w-7xl mx-auto w-full mb-16">

        {/* Tab 1: Sonar Target Screen */}
        {activeTab === 'sonar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Radar Target Node List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0d1522] border border-emerald-500/30 p-2.5 rounded-xl flex items-center">
                <Search className="h-4 w-4 text-emerald-400 ml-2 mr-2" />
                <input
                  type="text"
                  placeholder="FILTER SONAR TARGETS BY SKILL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-emerald-300 focus:outline-none placeholder:text-emerald-700"
                />
              </div>

              <div className="space-y-3">
                {filteredGigs.map((g, idx) => {
                  const isSelected = g.id === activeGig.id;
                  const match = g.match_breakdown;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'border-slate-800 bg-[#0d1522]/80 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-emerald-400 font-bold tracking-wider">TARGET NODE {idx + 1} // {g.client_company}</span>
                        {match && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded">
                            {match.overall_score}% MATCH
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-xs mt-2">{g.title}</h3>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                        <span className="text-emerald-400">${g.budget_min}-${g.budget_max}/HR</span>
                        <span>{g.work_mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Radar Circular Target Inspection Panel */}
            <div className="lg:col-span-7 bg-[#0d1522]/90 border border-emerald-500/30 rounded-2xl p-8 space-y-6">
              {activeGig && (
                <>
                  <div className="border-b border-emerald-500/30 pb-5 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <Target className="h-4 w-4 animate-spin-slow" /> RADAR TARGET ACQUIRED
                      </div>
                      <h2 className="text-xl font-bold text-white mt-1">{activeGig.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{activeGig.client_company} · {activeGig.work_mode}</p>
                    </div>

                    <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-950/60 text-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <div className="text-[9px] font-bold text-emerald-400 uppercase">Match Score</div>
                      <div className="text-2xl font-black text-white mt-0.5">{activeGig.match_breakdown?.overall_score || 94}%</div>
                    </div>
                  </div>

                  {/* Sonar Concentric Arc Analysis */}
                  {activeGig.match_breakdown && (
                    <div className="bg-[#070b12] border border-emerald-500/30 rounded-xl p-5 space-y-4">
                      <div className="flex justify-between text-xs text-emerald-400 font-bold border-b border-emerald-500/20 pb-2">
                        <span>SONAR VECTOR FIT ANALYSIS</span>
                        <span>COVERAGE: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="p-3 bg-[#0d1522] border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-400">HYBRID BLEND</div>
                          <div className="text-lg font-bold text-emerald-400">{activeGig.match_breakdown.overall_score}%</div>
                        </div>
                        <div className="p-3 bg-[#0d1522] border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-400">KEYWORD BM25</div>
                          <div className="text-lg font-bold text-emerald-300">{activeGig.match_breakdown.keyword_score}%</div>
                        </div>
                        <div className="p-3 bg-[#0d1522] border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-400">SEMANTIC COSINE</div>
                          <div className="text-lg font-bold text-emerald-300">{activeGig.match_breakdown.semantic_score}%</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed italic bg-[#0d1522] p-3 border border-slate-800 rounded-lg">
                        "{activeGig.match_breakdown.justification}"
                      </p>
                    </div>
                  )}

                  {/* Skills Grid */}
                  <div>
                    <h4 className="text-xs text-emerald-400 uppercase font-bold tracking-wider mb-3">Required Target Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeGig.required_skills.map(s => (
                        <span key={s} className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                          [TAG] {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Requisition Scope</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-[#070b12] p-4 border border-slate-800 rounded-xl">
                      {activeGig.description}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => alert(`Target locked! Proposal sent for ${activeGig.title}`)}
                      className="px-6 py-3 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" /> LOCK TARGET & SUBMIT PROPOSAL
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Resume Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto bg-[#0d1522] border border-emerald-500/30 rounded-2xl p-8 space-y-6">
            <h2 className="text-base font-bold text-emerald-400 border-b border-emerald-500/30 pb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5" /> RADAR RESUME SWEEPER & TAXONOMY SCANNER
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-[#070b12] border border-slate-800 rounded-xl p-4 text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 leading-relaxed"
            />

            <button
              onClick={handleSweepParser}
              disabled={isSweeping}
              className="px-6 py-3 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {isSweeping ? 'Sweeping Frequencies...' : 'Execute Radar Sweeper'}
            </button>

            {!isSweeping && (
              <div className="bg-[#070b12] border border-slate-800 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-emerald-400">Extracted Target Skills:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="p-3 rounded-lg bg-[#0d1522] border border-emerald-500/30 text-xs">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post Gig */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto bg-[#0d1522] border border-emerald-500/30 rounded-2xl p-8 space-y-6">
            <h2 className="text-base font-bold text-emerald-400 border-b border-emerald-500/30 pb-4">
              DEPLOY TARGET REQUISITION
            </h2>

            <form onSubmit={handlePostGigSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Requisition Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#070b12] border border-slate-800 rounded-xl p-3 text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-[#070b12] border border-slate-800 rounded-xl p-3 text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                Deploy Target Node to Sonar Grid
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin Benchmarks */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-emerald-400 border-b border-emerald-500/30 pb-4">
              RADAR METRIC EVALUATION BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-[#0d1522] border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-3 text-xs">
                  <h3 className="font-bold text-emerald-400">{b.algorithm_name}</h3>
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-bold text-white">{b.ndcg_10}</span></div>
                    <div className="flex justify-between"><span>MAP Score:</span> <span className="font-bold text-white">{b.map_score}</span></div>
                    <div className="flex justify-between"><span>MRR Score:</span> <span className="font-bold text-white">{b.mrr_score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
