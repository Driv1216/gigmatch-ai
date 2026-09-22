import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Sparkles, Search, Cpu, CheckCircle2, ShieldCheck,
  Send, Layers, Star, Zap, Eye, Compass, Flame
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

export const FrostGlass: React.FC<Props> = ({
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
  const [activeTab, setActiveTab] = useState<'frosted_orbs' | 'parser' | 'post' | 'admin'>('frosted_orbs');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isParsing, setIsParsing] = useState(false);

  // New gig
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      client_company: 'Frost Digital Studio',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Opportunity published to Frost Glass Studio!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 relative overflow-hidden selection:bg-purple-500 selection:text-white flex flex-col justify-between">

      {/* Background Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Frosted Glass Floating Header Pill */}
      <header className="relative z-10 max-w-7xl mx-auto w-full mb-8 p-4 rounded-full bg-slate-900/40 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 pl-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight">GigMatch AI</h1>
            <p className="text-[11px] text-purple-300 font-medium">Concept 14: Frosted Glass Floating Orbs</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pr-2">
          <button
            onClick={() => setActiveTab('frosted_orbs')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === 'frosted_orbs'
                ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {role === 'client' ? 'Applicant Glass Studio' : 'Frosted Opportunity Orbs'}
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'parser'
                  ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Resume Extraction Studio
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'post'
                  ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Post Opportunity
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Admin Metric Diagnostics
            </button>
          )}
        </div>
      </header>

      {/* Main Glass Canvas Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full mb-16">

        {/* Tab 1: Frosted Orbs & Glass Inspection */}
        {activeTab === 'frosted_orbs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Glass Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-purple-300" />
                <input
                  type="text"
                  placeholder="Filter frosted nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/40 backdrop-blur-2xl border border-white/20 rounded-full pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="space-y-4">
                {filteredGigs.map(g => {
                  const isSelected = g.id === activeGig.id;
                  const match = g.match_breakdown;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`cursor-pointer p-5 rounded-3xl border transition-all duration-300 backdrop-blur-2xl ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.2)] ring-1 ring-purple-400/40'
                          : 'bg-slate-900/40 border-white/15 hover:border-white/30 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">{g.client_company}</span>
                        {match && (
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            {match.overall_score}% Match
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-sm mt-2">{g.title}</h3>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-white">${g.budget_min}-${g.budget_max}/hr</span>
                        <span>{g.work_mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Frosted Glass Detail Panel */}
            <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
              {activeGig && (
                <>
                  <div className="border-b border-white/15 pb-6 flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">FROSTED AMBIENT NODE</span>
                      <h2 className="text-xl font-bold text-white mt-1">{activeGig.title}</h2>
                      <p className="text-xs text-slate-400 mt-1">{activeGig.client_company} · {activeGig.work_mode}</p>
                    </div>

                    <div className="px-5 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-center shadow-lg">
                      <div className="text-[10px] font-bold text-purple-300 uppercase">Match Ring</div>
                      <div className="text-2xl font-black text-white mt-0.5">{activeGig.match_breakdown?.overall_score || 94}%</div>
                    </div>
                  </div>

                  {/* AI Hybrid Vector Breakdown */}
                  {activeGig.match_breakdown && (
                    <div className="bg-slate-950/60 border border-white/15 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between text-xs font-bold text-white border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5 text-purple-300">
                          <Cpu className="h-4 w-4 text-purple-400" /> AI Hybrid Vector Engine
                        </span>
                        <span className="text-slate-400">Coverage: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="text-[10px] text-slate-400">HYBRID SCORE</div>
                          <div className="text-lg font-bold text-purple-300">{activeGig.match_breakdown.overall_score}%</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="text-[10px] text-slate-400">KEYWORD BM25</div>
                          <div className="text-lg font-bold text-sky-300">{activeGig.match_breakdown.keyword_score}%</div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="text-[10px] text-slate-400">SEMANTIC COSINE</div>
                          <div className="text-lg font-bold text-emerald-300">{activeGig.match_breakdown.semantic_score}%</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-3 rounded-xl border border-white/10">
                        "{activeGig.match_breakdown.justification}"
                      </p>
                    </div>
                  )}

                  {/* Skill Badges */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Required Skill Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeGig.required_skills.map(s => (
                        <span key={s} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Scope */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scope Brief</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      {activeGig.description}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => alert(`Proposal submitted for ${activeGig.title}`)}
                      className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" /> Transmit Glass Proposal
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Resume Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto bg-slate-900/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/15 pb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-400" /> RESUME EXTRACTION & SKILL TAXONOMY
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/20 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-purple-500/50 leading-relaxed"
            />

            <button
              onClick={handleParse}
              disabled={isParsing}
              className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-sky-600 shadow-lg shadow-purple-500/30"
            >
              {isParsing ? 'Extracting Taxonomy...' : 'Run Glass Resume Extractor'}
            </button>

            {!isParsing && (
              <div className="bg-slate-950/60 border border-white/20 p-5 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-purple-300">Extracted Skills Taxonomy:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
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
          <div className="max-w-xl mx-auto bg-slate-900/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/15 pb-4">
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
                  className="w-full bg-slate-950/60 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-sky-600 shadow-lg shadow-purple-500/30"
              >
                Publish Opportunity Brief
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/15 pb-4">
              ADMINISTRATIVE RANKING BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-slate-900/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-3 text-xs">
                  <h3 className="font-bold text-purple-300">{b.algorithm_name}</h3>
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
