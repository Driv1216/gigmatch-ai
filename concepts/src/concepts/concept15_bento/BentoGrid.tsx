import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Grid, Sparkles, Cpu, CheckCircle2, ShieldCheck,
  Send, Layers, ArrowUpRight, Clock, DollarSign, Award, User, Box, Sliders
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

export const BentoGrid: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigs[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'bento' | 'parser' | 'post' | 'admin'>('bento');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isParsing, setIsParsing] = useState(false);

  // New gig
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  const handleParse = () => {
    setIsParsing(true);
    setTimeout(() => setIsParsing(false), 500);
  };

  const handlePostGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onPostGig({
      title: newTitle,
      required_skills: newSkills.split(',').map(s => s.trim()),
      budget_min: 90,
      budget_max: 130,
      client_company: 'Bento Modular Labs',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Opportunity published to Bento Grid Studio!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 selection:bg-emerald-500 selection:text-black flex flex-col justify-between">

      {/* Top Header */}
      <header className="max-w-7xl mx-auto w-full mb-8 p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight">GigMatch AI</h1>
            <p className="text-[11px] text-slate-400 font-medium">Concept 15: Asymmetric Bento Tile Matrix</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('bento')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'bento'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-extrabold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            {role === 'client' ? 'Applicant Bento Grid' : 'Opportunity Bento Grid'}
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'parser'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Resume Extraction Bento
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'post'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Post Opportunity
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-extrabold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Admin Benchmark Bento
            </button>
          )}
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-7xl mx-auto w-full mb-16">

        {/* Tab 1: Asymmetric Bento Matrix Canvas */}
        {activeTab === 'bento' && (
          <div className="space-y-6">

            {/* Top Selector Ribbon */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {gigs.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGigId(g.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    g.id === activeGig.id
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 shadow-lg'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {g.title.length > 28 ? `${g.title.slice(0, 28)}...` : g.title}
                </button>
              ))}
            </div>

            {/* Asymmetric Modular Bento Grid (6 Tiles of Completely Different Sizes & Functions) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

              {/* Tile 1 (2x2 Hero Feature Tile) */}
              <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-xl">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    BENTO ITEM // {activeGig.id}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-4 leading-tight">{activeGig.title}</h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{activeGig.description}</p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400 font-medium">
                  <span className="font-bold text-white">{activeGig.client_company}</span>
                  <span>·</span>
                  <span>{activeGig.work_mode}</span>
                  <span>·</span>
                  <span>Posted {new Date(activeGig.posted_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tile 2 (1x1 Circle Score Dial Tile) */}
              <div className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-2 shadow-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI MATCH SCORE</span>
                <div className="text-5xl font-black text-emerald-400 font-mono">{activeGig.match_breakdown?.overall_score || 94}%</div>
                <span className="text-[11px] text-emerald-300 font-medium">Coverage: {activeGig.match_breakdown?.skill_coverage_pct}%</span>
              </div>

              {/* Tile 3 (1x1 Compensation Metric Tile) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HOURLY RATE</span>
                <div>
                  <div className="text-3xl font-extrabold text-white font-mono">${activeGig.budget_min}-${activeGig.budget_max}</div>
                  <div className="text-xs text-slate-400 mt-0.5">USD per hour (Hourly)</div>
                </div>
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Intake</div>
              </div>

              {/* Tile 4 (2x1 Required Technical Stack Tile) */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REQUIRED TECHNICAL COMPETENCIES</span>
                <div className="flex flex-wrap gap-2">
                  {activeGig.required_skills.map(s => (
                    <span key={s} className="px-4 py-2 rounded-2xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tile 5 (2x1 Model Match Breakdown Tile) */}
              {activeGig.match_breakdown && (
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MODEL MATCH BREAKDOWN</span>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">BM25 KEYWORD</div>
                      <div className="text-lg font-bold text-sky-400">{activeGig.match_breakdown.keyword_score}%</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">COSINE SEMANTIC</div>
                      <div className="text-lg font-bold text-emerald-400">{activeGig.match_breakdown.semantic_score}%</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    "{activeGig.match_breakdown.justification}"
                  </p>
                </div>
              )}

              {/* Tile 6 (4x1 Full Row Action Tile) */}
              <div className="md:col-span-3 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <h3 className="font-bold text-white text-sm">Ready to apply for this opportunity?</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Submit your verified profile and parsed skill taxonomy.</p>
                </div>
                <button
                  onClick={() => alert(`Applied to ${activeGig.title}`)}
                  className="px-6 py-3 rounded-2xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" /> Submit Proposal
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Resume Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" /> RESUME EXTRACTION BENTO STUDIO
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 leading-relaxed font-mono"
            />

            <button
              onClick={handleParse}
              disabled={isParsing}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition"
            >
              {isParsing ? 'Processing Taxonomy...' : 'Run Bento Skill Extractor'}
            </button>

            {!isParsing && (
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 font-mono">
                <h3 className="text-xs font-bold text-emerald-400">Extracted Skills Taxonomy:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-4">
              POST OPPORTUNITY BRIEF
            </h2>

            <form onSubmit={handlePostGig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Opportunity Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 transition"
              >
                Publish Opportunity Brief
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-4">
              ADMINISTRATIVE RANKING BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 text-xs font-mono">
                  <h3 className="font-bold text-emerald-400">{b.algorithm_name}</h3>
                  <div className="space-y-1.5 text-slate-400">
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
