import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Cpu, Zap, Activity, ShieldCheck, Layers, GitCommit,
  BarChart3, Sliders, CheckCircle2, XCircle, ArrowRight
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

export const GraphMatrix: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedAlgo, setSelectedAlgo] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [activeGig, setActiveGig] = useState<Gig>(gigs[0]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'parser' | 'admin'>('matrix');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);

  const activeFreelancer = freelancers[0];

  const getScoreForAlgo = (gig: Gig) => {
    const match = gig.match_breakdown;
    if (!match) return 0;
    if (selectedAlgo === 'hybrid') return match.overall_score;
    if (selectedAlgo === 'semantic') return match.semantic_score;
    return match.keyword_score;
  };

  const handleParseResume = () => {
    setExtractedSkills(['React', 'TypeScript', 'FastAPI', 'Python', 'PyTorch / NLP', 'PostgreSQL / Supabase']);
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Intelligence Bar */}
      <div className="border-b border-cyan-900/40 bg-slate-950/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-sm font-bold tracking-wider text-cyan-400">
            GRAPH MATCH MATRIX // INTELLIGENCE CENTER
          </span>
        </div>

        {/* Live Algorithm Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-cyan-900/50 rounded-lg p-1 text-xs">
          <span className="text-slate-400 px-2 font-mono">MODEL MODE:</span>
          <button
            onClick={() => setSelectedAlgo('hybrid')}
            className={`px-3 py-1 rounded font-bold transition ${
              selectedAlgo === 'hybrid'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            HYBRID (Blend)
          </button>
          <button
            onClick={() => setSelectedAlgo('semantic')}
            className={`px-3 py-1 rounded font-bold transition ${
              selectedAlgo === 'semantic'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            SEMANTIC (Cosine)
          </button>
          <button
            onClick={() => setSelectedAlgo('keyword')}
            className={`px-3 py-1 rounded font-bold transition ${
              selectedAlgo === 'keyword'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            KEYWORD (BM25)
          </button>
        </div>
      </div>

      {/* Navigation Sub-header */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-6 py-2 flex gap-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`py-1 border-b-2 font-bold ${
            activeTab === 'matrix' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          [01] SKILL MATRIX & MATCH GRAPH
        </button>
        <button
          onClick={() => setActiveTab('parser')}
          className={`py-1 border-b-2 font-bold ${
            activeTab === 'parser' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          [02] PARSING MATRIX
        </button>
        {role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-1 border-b-2 font-bold ${
              activeTab === 'admin' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            [03] EVALUATION RUNNER BENCHMARKS
          </button>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {activeTab === 'matrix' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Gig List with Live Recalculated Scores */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>OPEN OPPORTUNITIES MATRIX</span>
                <span className="text-slate-400 font-normal">Ranked by {selectedAlgo.toUpperCase()}</span>
              </div>

              {gigs.map(g => {
                const score = getScoreForAlgo(g);
                const isSelected = g.id === activeGig.id;

                return (
                  <div
                    key={g.id}
                    onClick={() => setActiveGig(g)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-slate-100">{g.title}</span>
                      <div className="flex flex-col items-end">
                        <span className={`text-xl font-mono font-bold ${
                          score >= 90 ? 'text-emerald-400' : 'text-cyan-400'
                        }`}>
                          {score}%
                        </span>
                        <span className="text-[9px] uppercase font-mono text-slate-400">{selectedAlgo}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mt-2 font-mono">
                      {g.client_company} · ${g.budget_min}-${g.budget_max}/hr
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {g.required_skills.map(s => (
                        <span key={s} className="bg-slate-950 border border-slate-800 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Skill Gap Matrix Visualizer */}
            <div className="lg:col-span-7 border border-slate-800 bg-slate-900/80 rounded-xl p-6 space-y-6">
              {activeGig && (
                <>
                  <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-bold uppercase">GRAPH NODE DETAILS</span>
                      <h2 className="text-xl font-bold text-white mt-1">{activeGig.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{activeGig.client_company} · {activeGig.work_mode}</p>
                    </div>
                    <div className="bg-slate-950 border border-cyan-500/40 p-3 rounded-lg text-center font-mono">
                      <div className="text-[10px] text-slate-400 uppercase">Computed Match</div>
                      <div className="text-2xl font-bold text-cyan-400">{getScoreForAlgo(activeGig)}%</div>
                    </div>
                  </div>

                  {/* Skill Alignment Heatmap Grid */}
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-400" /> SKILL ALIGNMENT HEATMAP (REQUIRED VS FREELANCER)
                    </h3>

                    <div className="space-y-2">
                      {activeGig.required_skills.map(reqSkill => {
                        const freelancerHas = activeFreelancer.skills.some(
                          fs => fs.name.toLowerCase().includes(reqSkill.toLowerCase())
                        );

                        return (
                          <div
                            key={reqSkill}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs font-mono ${
                              freelancerHas
                                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                                : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {freelancerHas ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                              )}
                              <span className="font-bold">{reqSkill}</span>
                            </div>

                            <span className="text-[11px]">
                              {freelancerHas ? 'VERIFIED MATCH (1.00)' : 'SKILL GAP IDENTIFIED (0.00)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model Explanation Card */}
                  {activeGig.match_breakdown && (
                    <div className="border border-slate-800 bg-slate-950 p-4 rounded-lg space-y-2 font-mono text-xs">
                      <div className="text-cyan-400 font-bold">ALGORITHMIC JUSTIFICATION LOG:</div>
                      <p className="text-slate-300 leading-relaxed">
                        {activeGig.match_breakdown.justification}
                      </p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => alert(`Submitted proposal to node ${activeGig.id}`)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-500/20 transition"
                    >
                      EXECUTE MATCH PROPOSAL FOR {activeGig.id}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Parsing Matrix */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto border border-slate-800 bg-slate-900/80 rounded-xl p-6 space-y-6 font-mono">
            <h2 className="text-sm font-bold text-cyan-400 border-b border-slate-800 pb-3">
              NLP ENTITY & SKILL EXTRACTION TERMINAL
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleParseResume}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-5 py-2 rounded"
            >
              RUN PARSER ENGINE
            </button>

            {extractedSkills.length > 0 && (
              <div className="border border-cyan-500/30 bg-cyan-950/20 p-4 rounded space-y-3">
                <div className="text-xs text-cyan-400 font-bold">Extracted Skill Vector Tags:</div>
                <div className="flex flex-wrap gap-2">
                  {extractedSkills.map(s => (
                    <span key={s} className="bg-slate-950 border border-cyan-500/50 text-cyan-300 px-3 py-1 rounded text-xs">
                      {s} (0.95)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admin Evaluation benchmarks */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs">
            <h2 className="text-base font-bold text-amber-400 border-b border-slate-800 pb-2">
              ADMIN BENCHMARK METRIC DISTRIBUTION
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border border-slate-800 bg-slate-900 p-4 rounded-xl space-y-3">
                  <div className="text-cyan-400 font-bold">{b.algorithm_name}</div>
                  <div className="space-y-1 text-slate-300">
                    <div>NDCG@5: <span className="text-white font-bold">{b.ndcg_5}</span></div>
                    <div>NDCG@10: <span className="text-white font-bold">{b.ndcg_10}</span></div>
                    <div>MAP: <span className="text-white font-bold">{b.map_score}</span></div>
                    <div>MRR: <span className="text-white font-bold">{b.mrr_score}</span></div>
                    <div>Precision@5: <span className="text-white font-bold">{b.precision_5}</span></div>
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
