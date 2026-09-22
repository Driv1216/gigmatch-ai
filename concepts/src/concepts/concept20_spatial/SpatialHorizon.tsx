import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Compass, Layers, Sparkles, Send, Cpu,
  Search, ShieldCheck, Box, Orbit, Move3d, ChevronLeft, ChevronRight
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

export const SpatialHorizon: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [activeGigIndex, setActiveGigIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'3d_carousel' | 'parser' | 'post' | 'admin'>('3d_carousel');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isParsing, setIsParsing] = useState(false);

  // New gig
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs[activeGigIndex] || gigs[0];

  const handleNextGig = () => {
    setActiveGigIndex((prev) => (prev + 1) % gigs.length);
  };

  const handlePrevGig = () => {
    setActiveGigIndex((prev) => (prev - 1 + gigs.length) % gigs.length);
  };

  const handleParse = () => {
    setIsParsing(true);
    setTimeout(() => setIsParsing(false), 600);
  };

  const handlePostGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onPostGig({
      title: newTitle,
      required_skills: newSkills.split(',').map(s => s.trim()),
      budget_min: 90,
      budget_max: 135,
      client_company: 'Spatial Horizon Labs',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Opportunity projected to Spatial Horizon!');
  };

  return (
    <div className="min-h-screen bg-[#0b0d1b] text-slate-100 font-sans p-4 sm:p-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white flex flex-col justify-between">

      {/* 3D Ambient Glowing Spatial Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full mb-8 p-4 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/20 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Orbit className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight">GigMatch AI</h1>
            <p className="text-[11px] text-indigo-300 font-medium">Concept 20: 3D Spatial Carousel Horizon</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('3d_carousel')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === '3d_carousel'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            {role === 'client' ? '3D Applicant Carousel' : '3D Spatial Carousel'}
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'parser'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Spatial CV Vectorizer
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'post'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Project Requisition
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              Admin Metric Horizon
            </button>
          )}
        </div>
      </header>

      {/* Main 3D Viewport */}
      <main className="relative z-10 max-w-7xl mx-auto w-full mb-20 flex-1 flex flex-col justify-center">

        {/* Tab 1: 3D Stack Carousel */}
        {activeTab === '3d_carousel' && (
          <div className="space-y-8">

            {/* 3D Horizon Carousel Controls & Perspective Canvas */}
            <div className="relative min-h-[460px] flex items-center justify-center [perspective:1200px]">

              {/* Previous Card (Angled In 3D Background) */}
              <div
                onClick={handlePrevGig}
                className="hidden md:block absolute left-4 w-72 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-indigo-500/10 opacity-40 hover:opacity-70 transition-all cursor-pointer transform -rotate-y-12 scale-90 -translate-z-20"
              >
                <span className="text-[10px] text-indigo-400 font-bold uppercase">PREVIOUS NODE</span>
                <h3 className="font-bold text-white text-sm mt-1 truncate">{gigs[(activeGigIndex - 1 + gigs.length) % gigs.length]?.title}</h3>
                <div className="text-xs text-indigo-300 font-bold mt-2 font-mono">{gigs[(activeGigIndex - 1 + gigs.length) % gigs.length]?.match_breakdown?.overall_score || 90}% Match</div>
              </div>

              {/* Active Center Card (3D Front Space) */}
              <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-2xl border border-indigo-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(99,102,241,0.2)] space-y-6 transform hover:scale-[1.01] transition-all">

                <div className="flex justify-between items-start border-b border-indigo-500/20 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">3D HORIZON NODE [{activeGigIndex + 1} / {gigs.length}]</span>
                    <h2 className="text-2xl font-bold text-white mt-1">{activeGig.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{activeGig.client_company} · {activeGig.work_mode}</p>
                  </div>

                  {/* 3D Glowing Score Ring */}
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-500/40 text-center shadow-lg">
                    <div className="text-[10px] font-bold text-indigo-300 uppercase">3D Match Ring</div>
                    <div className="text-3xl font-black text-white mt-0.5">{activeGig.match_breakdown?.overall_score || 94}%</div>
                  </div>
                </div>

                {/* AI Vector Justification */}
                {activeGig.match_breakdown && (
                  <div className="bg-slate-950/80 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-indigo-300">
                      <span>VECTOR ALIGNMENT JUSTIFICATION</span>
                      <span>COVERAGE: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                    </div>
                    <p className="text-xs text-slate-300 italic leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20">
                      "{activeGig.match_breakdown.justification}"
                    </p>
                  </div>
                )}

                {/* Skill Pills */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeGig.required_skills.map(s => (
                      <span key={s} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Scope</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    {activeGig.description}
                  </p>
                </div>

              </div>

              {/* Next Card (Angled In 3D Background) */}
              <div
                onClick={handleNextGig}
                className="hidden md:block absolute right-4 w-72 p-6 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-indigo-500/10 opacity-40 hover:opacity-70 transition-all cursor-pointer transform rotate-y-12 scale-90 -translate-z-20"
              >
                <span className="text-[10px] text-indigo-400 font-bold uppercase">NEXT NODE</span>
                <h3 className="font-bold text-white text-sm mt-1 truncate">{gigs[(activeGigIndex + 1) % gigs.length]?.title}</h3>
                <div className="text-xs text-indigo-300 font-bold mt-2 font-mono">{gigs[(activeGigIndex + 1) % gigs.length]?.match_breakdown?.overall_score || 90}% Match</div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl space-y-6">
            <h2 className="text-base font-bold text-white border-b border-indigo-500/20 pb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" /> SPATIAL CV VECTORIZER & TAXONOMY SCANNER
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950/80 border border-indigo-500/20 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 leading-relaxed font-mono"
            />

            <button
              onClick={handleParse}
              disabled={isParsing}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30"
            >
              {isParsing ? 'Vectorizing Taxonomy...' : 'Execute Spatial Vectorizer'}
            </button>

            {!isParsing && (
              <div className="bg-slate-950/80 border border-indigo-500/20 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-indigo-300">Extracted Skills Taxonomy:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs">
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
          <div className="max-w-xl mx-auto bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-8 shadow-2xl space-y-6">
            <h2 className="text-base font-bold text-white border-b border-indigo-500/20 pb-4">
              PROJECT REQUISITION
            </h2>

            <form onSubmit={handlePostGig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Requisition Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-slate-950/80 border border-indigo-500/20 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30"
              >
                Project to Spatial Matrix
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-white border-b border-indigo-500/20 pb-4">
              SPATIAL ACCURACY BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-6 shadow-2xl space-y-3 text-xs">
                  <h3 className="font-bold text-indigo-300">{b.algorithm_name}</h3>
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

      {/* Floating 3D Curved Control Arc */}
      {activeTab === '3d_carousel' && (
        <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-2xl border border-indigo-500/40 p-3 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center gap-3 text-xs font-bold">
          <button
            onClick={handlePrevGig}
            className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600 text-white transition flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-indigo-300 px-3 font-mono">
            NODE {activeGigIndex + 1} / {gigs.length}
          </span>

          <button
            onClick={handleNextGig}
            className="p-2 rounded-full bg-slate-800 hover:bg-indigo-600 text-white transition flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="h-4 w-0.5 bg-indigo-500/40" />

          <button
            onClick={() => alert(`Transmitted proposal for ${activeGig.title}`)}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500 text-white font-bold transition shadow-lg shadow-indigo-500/30 flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Project Spatial Proposal
          </button>
        </footer>
      )}
    </div>
  );
};
