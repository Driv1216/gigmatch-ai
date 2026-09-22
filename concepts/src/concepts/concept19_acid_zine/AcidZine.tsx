import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Zap, Flame, Sparkles, Send, Cpu,
  Search, ShieldCheck, Tag, Play, Disc
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

export const AcidZine: React.FC<Props> = ({
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
  const [activeTab, setActiveTab] = useState<'zine' | 'parser' | 'post' | 'admin'>('zine');
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
      budget_min: 95,
      budget_max: 140,
      client_company: 'ACID_GRAPHIC_ZINE',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('STAMPED TO ACID ZINE!');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans p-4 sm:p-8 relative overflow-hidden selection:bg-[#ccff00] selection:text-black flex flex-col justify-between">

      {/* Top Diagonal Marquee Banner */}
      <div className="bg-[#ff5500] text-black font-black text-xs py-1.5 uppercase tracking-widest overflow-hidden whitespace-nowrap border-b-4 border-white transform -rotate-1 -mx-8 mb-6">
        <div className="inline-block animate-marquee">
          ★ ACID GIG MATCH ZINE ★ OVERALL MATCH SCORE 94% ★ HYBRID VECTOR ENGINE ONLINE ★ NO BORING CORPORATE UIs ALLOWED ★ GROUNDTRUTH REQUISITIONS ★
        </div>
      </div>

      {/* Main Zine Area */}
      <main className="max-w-7xl mx-auto w-full mb-16">

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-[#ccff00] text-black font-black flex items-center justify-center text-xl transform rotate-3 border-2 border-white shadow-[4px_4px_0px_#ff5500]">
              <Zap className="h-7 w-7 fill-black text-black" />
            </div>
            <h1 className="font-black text-3xl text-[#ccff00] tracking-tighter uppercase">
              ACID ZINE // VOL 19
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
            <button
              onClick={() => setActiveTab('zine')}
              className={`px-5 py-2.5 border-4 transition ${
                activeTab === 'zine'
                  ? 'bg-[#ccff00] text-black border-white shadow-[4px_4px_0px_#ff5500] transform -rotate-1'
                  : 'bg-black text-[#ccff00] border-white hover:bg-[#ccff00]/20'
              }`}
            >
              [01] ZINE SPREAD
            </button>

            {role === 'freelancer' && (
              <button
                onClick={() => setActiveTab('parser')}
                className={`px-5 py-2.5 border-4 transition ${
                  activeTab === 'parser'
                    ? 'bg-[#ccff00] text-black border-white shadow-[4px_4px_0px_#ff5500] transform -rotate-1'
                    : 'bg-black text-[#ccff00] border-white hover:bg-[#ccff00]/20'
                }`}
              >
                [02] RESUME RIPPER
              </button>
            )}

            {role === 'client' && (
              <button
                onClick={() => setActiveTab('post')}
                className={`px-5 py-2.5 border-4 transition ${
                  activeTab === 'post'
                    ? 'bg-[#ff5500] text-black border-white shadow-[4px_4px_0px_#ccff00] transform -rotate-1'
                    : 'bg-black text-[#ff5500] border-white hover:bg-[#ff5500]/20'
                }`}
              >
                [02] STAMP REQUISITION
              </button>
            )}

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-5 py-2.5 border-4 transition ${
                  activeTab === 'admin'
                    ? 'bg-[#ff0055] text-white border-white shadow-[4px_4px_0px_#ccff00] transform -rotate-1'
                    : 'bg-black text-[#ff0055] border-white hover:bg-[#ff0055]/20'
                }`}
              >
                [03] ACCURACY BENCHMARKS
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Acid Zine Poster Collage Spread */}
        {activeTab === 'zine' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Poster Cards Collage */}
            <div className="lg:col-span-5 space-y-4">
              {filteredGigs.map((g, idx) => {
                const isSelected = g.id === selectedGigId;
                const match = g.match_breakdown;

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGigId(g.id)}
                    className={`cursor-pointer p-5 border-4 transition-all relative ${
                      isSelected
                        ? 'border-[#ccff00] bg-black shadow-[8px_8px_0px_#ff5500] transform -rotate-1 scale-[1.02]'
                        : 'border-white bg-black hover:border-[#ccff00]'
                    }`}
                  >
                    {/* Simulated Tape Graphic */}
                    <div className="absolute -top-3 left-6 w-16 h-5 bg-white/30 backdrop-blur-sm border border-white/40 transform -rotate-6" />

                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black uppercase text-[#ff5500]">#{idx + 1} {g.client_company}</span>
                      {match && (
                        <span className="bg-[#ccff00] text-black text-xs font-black px-2.5 py-1 uppercase transform rotate-3">
                          ★ {match.overall_score}% MATCH
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-lg text-white mt-2 leading-tight uppercase tracking-tight">{g.title}</h3>

                    <div className="mt-3 flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-[#ccff00]">${g.budget_min}-${g.budget_max}/HR</span>
                      <span>{g.work_mode}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Main Zine Inspection Poster */}
            <div className="lg:col-span-7 border-4 border-white bg-black p-8 shadow-[12px_12px_0px_#ccff00] space-y-6 relative">

              {/* Tape Overlay */}
              <div className="absolute -top-4 right-10 w-24 h-6 bg-white/30 backdrop-blur-sm border border-white/40 transform rotate-3" />

              {activeGig && (
                <>
                  <div className="border-b-4 border-white pb-6 flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black uppercase text-[#ccff00] bg-black border border-[#ccff00] px-2 py-0.5">
                        ZINE FEATURE // {activeGig.id}
                      </span>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight mt-2">{activeGig.title}</h2>
                      <p className="text-xs text-white/70 font-mono mt-1">{activeGig.client_company} · {activeGig.work_mode}</p>
                    </div>

                    <div className="bg-[#ccff00] text-black p-4 text-center font-black transform rotate-3 border-2 border-white shadow-[4px_4px_0px_#ff5500]">
                      <div className="text-[10px] uppercase">SCORE STAMP</div>
                      <div className="text-4xl font-black">{activeGig.match_breakdown?.overall_score || 94}%</div>
                    </div>
                  </div>

                  {/* AI Match Vector Box */}
                  {activeGig.match_breakdown && (
                    <div className="border-4 border-[#ccff00] bg-black p-5 space-y-4">
                      <div className="text-xs font-black text-[#ccff00] uppercase border-b-2 border-[#ccff00] pb-2 flex justify-between">
                        <span>VECTOR MATCH JUSTIFICATION</span>
                        <span>COVERAGE: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>

                      <p className="text-xs text-white leading-relaxed font-mono italic bg-white/10 p-4 border-2 border-white">
                        "{activeGig.match_breakdown.justification}"
                      </p>
                    </div>
                  )}

                  {/* Required Tags */}
                  <div>
                    <h4 className="text-xs font-black text-[#ccff00] uppercase tracking-wider mb-3">Required Skill Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeGig.required_skills.map(s => (
                        <span key={s} className="bg-[#ff5500] text-black px-3.5 py-1.5 text-xs font-black uppercase border-2 border-white">
                          #{s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-black text-[#ccff00] uppercase tracking-wider mb-2">Scope Manifesto</h4>
                    <p className="text-xs text-white/90 leading-relaxed font-mono bg-white/5 p-4 border-2 border-white">
                      {activeGig.description}
                    </p>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Resume Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto border-4 border-[#ccff00] bg-black p-8 space-y-6 shadow-[10px_10px_0px_#ff5500]">
            <h2 className="text-lg font-black uppercase text-[#ccff00] border-b-4 border-[#ccff00] pb-4">
              [02] RESUME RIPPER & SKILL EXTRACTION
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-black border-4 border-white p-4 text-xs font-mono text-[#ccff00] focus:outline-none focus:border-[#ccff00]"
            />

            <button
              onClick={handleParse}
              disabled={isParsing}
              className="bg-[#ccff00] hover:bg-white text-black font-black text-xs px-8 py-4 uppercase tracking-widest border-4 border-white shadow-[6px_6px_0px_#ff5500]"
            >
              {isParsing ? 'RIPPING ENTITIES...' : 'EXECUTE RESUME RIPPER'}
            </button>

            {!isParsing && (
              <div className="border-4 border-white p-5 space-y-3 bg-white/5">
                <h3 className="text-xs font-black uppercase text-[#ccff00]">EXTRACTED SKILLS TAXONOMY:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="border-2 border-[#ccff00] bg-black p-3 text-xs font-mono">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-[#ccff00] mt-0.5">Conf: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto border-4 border-[#ff5500] bg-black p-8 space-y-6 shadow-[10px_10px_0px_#ccff00]">
            <h2 className="text-lg font-black uppercase text-[#ff5500] border-b-4 border-[#ff5500] pb-4">
              [02] STAMP REQUISITION
            </h2>

            <form onSubmit={handlePostGig} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-black text-white uppercase mb-1">REQUISITION TITLE</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black border-4 border-white p-3 text-[#ccff00] focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block font-black text-white uppercase mb-1">REQUIRED SKILLS (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-black border-4 border-white p-3 text-[#ccff00] focus:outline-none focus:border-[#ff5500]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#ff5500] hover:bg-white text-black font-black py-4 border-4 border-white uppercase tracking-widest text-xs shadow-[6px_6px_0px_#ccff00]"
              >
                STAMP TO ACID MATRIX
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-lg font-black uppercase text-[#ff0055] border-b-4 border-[#ff0055] pb-4">
              [03] ACCURACY BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border-4 border-white bg-black p-6 space-y-3 text-xs font-mono">
                  <h3 className="font-black text-sm uppercase text-[#ccff00]">{b.algorithm_name}</h3>
                  <div className="space-y-1.5 text-white">
                    <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-bold text-[#ccff00]">{b.ndcg_10}</span></div>
                    <div className="flex justify-between"><span>MAP Score:</span> <span className="font-bold text-[#ccff00]">{b.map_score}</span></div>
                    <div className="flex justify-between"><span>MRR Score:</span> <span className="font-bold text-[#ccff00]">{b.mrr_score}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Floating Cassette Tape Control Bar */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#ccff00] text-black border-4 border-white p-3 shadow-[8px_8px_0px_#ff5500] flex items-center gap-4 text-xs font-black uppercase">
        <div className="flex items-center gap-2">
          <Disc className="h-5 w-5 animate-spin-slow text-black" />
          <span>CASSETTE TAPE PLAYBACK: {activeGig.id}</span>
        </div>

        <button
          onClick={() => alert(`Stamping proposal to ${activeGig.title}`)}
          className="bg-black text-[#ccff00] hover:bg-white hover:text-black px-4 py-2 border-2 border-black font-black uppercase transition"
        >
          [STAMP PROPOSAL NOW]
        </button>
      </footer>
    </div>
  );
};
