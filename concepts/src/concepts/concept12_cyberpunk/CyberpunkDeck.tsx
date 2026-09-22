import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Terminal, ShieldCheck, Zap, Activity, Radio, Crosshair,
  Cpu, Send, AlertTriangle, Layers, BarChart2, Code, TerminalSquare
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

export const CyberpunkDeck: React.FC<Props> = ({
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
  const [activeTab, setActiveTab] = useState<'repl' | 'parser' | 'post' | 'telemetry'>('repl');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isScanning, setIsScanning] = useState(false);

  // New gig
  const [gigTitle, setGigTitle] = useState('');
  const [gigSkills, setGigSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleScanResume = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 500);
  };

  const handlePostGig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigTitle) return;
    onPostGig({
      title: gigTitle,
      required_skills: gigSkills.split(',').map(s => s.trim()),
      budget_min: 95,
      budget_max: 140,
      client_company: 'CYBER_CORP_01',
      work_mode: 'Remote',
    });
    setGigTitle('');
    alert('REQUISITION DEPLOYED TO CYBER MATRIX REPL!');
  };

  return (
    <div className="min-h-screen bg-[#040407] text-[#00f0ff] font-mono p-4 sm:p-6 relative overflow-hidden selection:bg-[#ffe600] selection:text-black flex flex-col justify-between">
      {/* Background Matrix Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f1122_1px,transparent_1px),linear-gradient(to_bottom,#0f1122_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

      {/* Cybernetic HUD Header */}
      <header className="relative z-10 border-2 border-[#00f0ff] bg-[#090a12]/90 p-4 mb-6 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#ffe600] text-black font-extrabold flex items-center justify-center text-sm shadow-[0_0_15px_#ffe600] transform -rotate-3">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#ffe600] tracking-widest text-sm uppercase">CYBER_DECK // MATRIX REPL 12</span>
              <span className="text-[9px] bg-[#ff0055]/20 text-[#ff0055] px-2 py-0.5 border border-[#ff0055]/50 font-bold uppercase">HOLOGRAPHIC MODE</span>
            </div>
            <p className="text-[10px] text-slate-400">Cybernetic Telemetry Node Network v5.0</p>
          </div>
        </div>

        {/* HUD Tab Controls */}
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
          <button
            onClick={() => setActiveTab('repl')}
            className={`px-4 py-1.5 transition ${
              activeTab === 'repl'
                ? 'bg-[#00f0ff] text-black font-black shadow-[0_0_15px_#00f0ff]'
                : 'bg-[#11121c] text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/20'
            }`}
          >
            [01] MATRIX REPL
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-4 py-1.5 transition ${
                activeTab === 'parser'
                  ? 'bg-[#00f0ff] text-black font-black shadow-[0_0_15px_#00f0ff]'
                  : 'bg-[#11121c] text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/20'
              }`}
            >
              [02] RESUME PARSER
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-4 py-1.5 transition ${
                activeTab === 'post'
                  ? 'bg-[#ffe600] text-black font-black shadow-[0_0_15px_#ffe600]'
                  : 'bg-[#11121c] text-[#ffe600] border border-[#ffe600]/40 hover:bg-[#ffe600]/20'
              }`}
            >
              [02] DEPLOY REQUISITION
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-4 py-1.5 transition ${
                activeTab === 'telemetry'
                  ? 'bg-[#ff0055] text-white font-black shadow-[0_0_15px_#ff0055]'
                  : 'bg-[#11121c] text-[#ff0055] border border-[#ff0055]/40 hover:bg-[#ff0055]/20'
              }`}
            >
              [03] ACCURACY TELEMETRY
            </button>
          )}
        </div>
      </header>

      {/* Main Cyber Matrix Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full mb-16">

        {/* Tab 1: Matrix REPL & Holographic Node Diagnostic Panel */}
        {activeTab === 'repl' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Cyber Code Stream & Requisitions */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border-2 border-[#00f0ff]/40 bg-[#090a12] p-2 flex items-center">
                <TerminalSquare className="h-4 w-4 text-[#ffe600] ml-2 mr-2" />
                <input
                  type="text"
                  placeholder="SEARCH REQUISITIONS BY TAG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#00f0ff] focus:outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-3">
                {filteredGigs.map(g => {
                  const isSelected = g.id === activeGig.id;
                  const match = g.match_breakdown;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`cursor-pointer p-4 border-2 transition-all ${
                        isSelected
                          ? 'border-[#ffe600] bg-[#1a1805] shadow-[0_0_15px_rgba(255,230,0,0.3)]'
                          : 'border-slate-800 bg-[#090a12] hover:border-[#00f0ff]/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-[#00f0ff] tracking-widest uppercase">{g.client_company}</span>
                        {match && (
                          <span className="text-xs font-bold text-[#ffe600] bg-[#ffe600]/10 border border-[#ffe600]/40 px-2 py-0.5">
                            MATCH: {match.overall_score}%
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-xs mt-1.5 uppercase">{g.title}</h3>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-[#ffe600]">${g.budget_min}-${g.budget_max}/HR</span>
                        <span>{g.work_mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Holographic Node Diagnostic Panel */}
            <div className="lg:col-span-7 border-2 border-[#00f0ff] bg-[#090a12]/90 p-6 space-y-6 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              {activeGig && (
                <>
                  <div className="border-b border-[#00f0ff]/40 pb-4 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] text-[#ff0055] font-bold tracking-widest uppercase">NODE DIAGNOSTIC // {activeGig.id}</span>
                      <h2 className="text-lg font-bold text-white uppercase mt-1">{activeGig.title}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{activeGig.client_company} · {activeGig.work_mode}</p>
                    </div>

                    <div className="border-2 border-[#ffe600] bg-[#ffe600]/10 p-3 text-center min-w-[110px]">
                      <div className="text-[9px] text-[#ffe600] font-bold uppercase">SCORE MATRIX</div>
                      <div className="text-2xl font-bold text-[#ffe600] mt-0.5">{activeGig.match_breakdown?.overall_score || 94}%</div>
                    </div>
                  </div>

                  {/* AI Hybrid Vector Diagnostics */}
                  {activeGig.match_breakdown && (
                    <div className="border border-[#00f0ff]/40 bg-[#05060b] p-4 space-y-3">
                      <div className="flex justify-between text-xs text-[#00f0ff] font-bold border-b border-[#00f0ff]/20 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="h-4 w-4" /> AI VECTOR STREAM LOG
                        </span>
                        <span>COVERAGE: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="border border-slate-800 bg-[#0d0f18] p-2">
                          <div className="text-[9px] text-slate-500">OVERALL</div>
                          <div className="text-sm font-bold text-[#ffe600]">{activeGig.match_breakdown.overall_score}%</div>
                        </div>
                        <div className="border border-slate-800 bg-[#0d0f18] p-2">
                          <div className="text-[9px] text-slate-500">BM25 KEYWORD</div>
                          <div className="text-sm font-bold text-[#00f0ff]">{activeGig.match_breakdown.keyword_score}%</div>
                        </div>
                        <div className="border border-slate-800 bg-[#0d0f18] p-2">
                          <div className="text-[9px] text-slate-500">COSINE SEMANTIC</div>
                          <div className="text-sm font-bold text-[#ff0055]">{activeGig.match_breakdown.semantic_score}%</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 bg-[#0a0b12] p-3 border border-slate-800 leading-relaxed">
                        <span className="text-[#ffe600] font-bold">JUSTIFICATION: </span>
                        {activeGig.match_breakdown.justification}
                      </div>
                    </div>
                  )}

                  {/* Vector Tag Cloud */}
                  <div>
                    <h4 className="text-xs text-[#00f0ff] uppercase font-bold tracking-wider mb-2">Required Vector Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeGig.required_skills.map(s => (
                        <span key={s} className="bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/40 px-3 py-1 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Requisition Scope */}
                  <div>
                    <h4 className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Requisition Scope</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-[#05060b] p-3 border border-slate-800">
                      {activeGig.description}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => alert(`Submitted proposal to node ${activeGig.id}`)}
                      className="bg-[#ffe600] hover:bg-[#e6d000] text-black font-bold text-xs px-6 py-3 border border-[#ffe600] flex items-center gap-2 shadow-[0_0_15px_rgba(255,230,0,0.3)] transition"
                    >
                      <Zap className="h-4 w-4" /> SYS_EXECUTE_PROPOSAL()
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Resume Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto border-2 border-[#00f0ff] bg-[#090a12] p-6 space-y-6">
            <h2 className="text-sm font-bold text-[#00f0ff] border-b border-[#00f0ff]/30 pb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" /> RESUME ENTITY EXTRACTION REPL
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-[#05060b] border border-slate-800 p-3 text-xs text-[#00f0ff] focus:outline-none focus:border-[#00f0ff]"
            />

            <button
              onClick={handleScanResume}
              disabled={isScanning}
              className="bg-[#00f0ff] hover:bg-[#00d0df] text-black font-bold text-xs px-6 py-3 border border-[#00f0ff] shadow-[0_0_15px_#00f0ff]"
            >
              {isScanning ? 'SCANNING REPL...' : 'EXECUTE CYBER SCANNER'}
            </button>

            {!isScanning && (
              <div className="border border-slate-800 bg-[#05060b] p-4 space-y-3 text-xs">
                <div className="text-[#ffe600] font-bold">EXTRACTED VECTOR ENTITIES:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="border border-[#00f0ff]/30 bg-[#090a12] p-2">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto border-2 border-[#ffe600] bg-[#090a12] p-6 space-y-5">
            <h2 className="text-sm font-bold text-[#ffe600] border-b border-[#ffe600]/30 pb-3">
              DEPLOY REQUISITION TO MATRIX
            </h2>

            <form onSubmit={handlePostGig} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">REQUISITION TITLE</label>
                <input
                  type="text"
                  required
                  value={gigTitle}
                  onChange={(e) => setGigTitle(e.target.value)}
                  className="w-full bg-[#05060b] border border-slate-800 p-2.5 text-[#ffe600]"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">REQUIRED VECTOR TAGS (Comma separated)</label>
                <input
                  type="text"
                  value={gigSkills}
                  onChange={(e) => setGigSkills(e.target.value)}
                  className="w-full bg-[#05060b] border border-slate-800 p-2.5 text-[#ffe600]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#ffe600] hover:bg-[#e6d000] text-black font-bold py-3 shadow-[0_0_15px_#ffe600]"
              >
                DEPLOY TO CYBER MATRIX
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'telemetry' && (
          <div className="max-w-4xl mx-auto space-y-6 text-xs">
            <h2 className="text-base font-bold text-[#ff0055] border-b border-[#ff0055]/30 pb-2">
              ACCURACY METRIC TELEMETRY
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border border-[#ff0055]/30 bg-[#090a12] p-4 space-y-3">
                  <div className="text-[#00f0ff] font-bold">{b.algorithm_name}</div>
                  <div className="space-y-1 text-slate-300">
                    <div>NDCG@10: <span className="text-[#ffe600] font-bold">{b.ndcg_10}</span></div>
                    <div>MAP: <span className="text-[#ffe600] font-bold">{b.map_score}</span></div>
                    <div>MRR: <span className="text-[#ffe600] font-bold">{b.mrr_score}</span></div>
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
