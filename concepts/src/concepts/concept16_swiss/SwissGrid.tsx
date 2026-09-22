import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  FileText, Search, ArrowRight, Check, Send, Cpu,
  Layers, ShieldCheck, ArrowDown, ChevronRight, Sliders
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

export const SwissGrid: React.FC<Props> = ({
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
  const [activeMode, setActiveMode] = useState<'spec' | 'parser' | 'post' | 'admin'>('spec');
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
      client_company: 'Swiss Design System',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Published to Swiss International Registry.');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#e63946] selection:text-white flex flex-col justify-between">

      {/* Signal Red Baseline Line */}
      <div className="h-3 bg-[#e63946] w-full" />

      {/* Main Structural Layout: Left Vertical Spine + Center Content */}
      <div className="flex-1 flex flex-col md:flex-row">

        {/* Left Vertical Spine (Column 1) */}
        <aside className="w-full md:w-20 border-r-2 border-black bg-slate-50 p-4 flex flex-row md:flex-col items-center justify-between shrink-0">
          <div className="font-black text-xs uppercase tracking-widest md:[writing-mode:vertical-lr] md:rotate-180 text-[#e63946] py-4">
            SWISS INTERNATIONAL GRID // 1957
          </div>
          <div className="font-black text-2xl font-mono text-black">
            01
          </div>
          <div className="font-mono text-[10px] text-slate-500 md:[writing-mode:vertical-lr]">
            MÜLLER-BROCKMANN SYSTEM
          </div>
        </aside>

        {/* Center Main Area (Columns 2 & 3 Asymmetric Spec Sheet) */}
        <div className="flex-1 p-6 md:p-12 space-y-10">

          {/* Header Specification Title Block */}
          <div className="border-b-4 border-black pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <span className="text-xs font-black text-[#e63946] uppercase tracking-widest">
                SPECIFICATION SHEET 01 / REQUISITION MATRIX
              </span>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black mt-2 leading-none">
                {activeMode === 'spec' ? activeGig.title : activeMode === 'parser' ? 'TAXONOMY EXTRACTOR' : activeMode === 'post' ? 'NEW SPECIFICATION' : 'METRIC AUDIT GRID'}
              </h1>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-wider border-2 border-black p-1 bg-white">
              <button
                onClick={() => setActiveMode('spec')}
                className={`px-3 py-1.5 transition ${activeMode === 'spec' ? 'bg-black text-white' : 'text-black hover:text-[#e63946]'}`}
              >
                01. SPEC SHEET
              </button>
              {role === 'freelancer' && (
                <button
                  onClick={() => setActiveMode('parser')}
                  className={`px-3 py-1.5 transition ${activeMode === 'parser' ? 'bg-black text-white' : 'text-black hover:text-[#e63946]'}`}
                >
                  02. PARSER
                </button>
              )}
              {role === 'client' && (
                <button
                  onClick={() => setActiveMode('post')}
                  className={`px-3 py-1.5 transition ${activeMode === 'post' ? 'bg-black text-white' : 'text-black hover:text-[#e63946]'}`}
                >
                  02. DRAFT
                </button>
              )}
              {role === 'admin' && (
                <button
                  onClick={() => setActiveMode('admin')}
                  className={`px-3 py-1.5 transition ${activeMode === 'admin' ? 'bg-black text-white' : 'text-black hover:text-[#e63946]'}`}
                >
                  03. AUDIT
                </button>
              )}
            </div>
          </div>

          {/* Mode 1: Full-Width Asymmetric Spec Sheet */}
          {activeMode === 'spec' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Asymmetric Index (Cols 1-4) */}
              <div className="lg:col-span-4 border-2 border-black p-6 space-y-4">
                <div className="text-xs font-black uppercase tracking-wider border-b-2 border-black pb-2 flex justify-between">
                  <span>INDEX UNITS</span>
                  <span className="font-mono text-[#e63946]">{filteredGigs.length} REQS</span>
                </div>

                <div className="space-y-3">
                  {filteredGigs.map((g, idx) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`cursor-pointer p-4 border-2 transition-all font-mono text-xs ${
                        g.id === activeGig.id
                          ? 'border-[#e63946] bg-slate-50 text-black font-bold'
                          : 'border-black hover:border-[#e63946]'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-[#e63946] font-sans font-black">[{idx + 1}] {g.client_company}</span>
                        <span className="font-black">{g.match_breakdown?.overall_score || 90}%</span>
                      </div>
                      <div className="font-sans font-bold text-sm uppercase leading-tight">{g.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Architectural Spec Sheet (Cols 5-12) */}
              <div className="lg:col-span-8 space-y-8">

                {/* Score & Rate Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="border-4 border-black p-6 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">MATCH INDEX</span>
                    <div className="text-5xl font-black font-mono mt-1 text-black">{activeGig.match_breakdown?.overall_score || 94}%</div>
                  </div>

                  <div className="border-2 border-black p-6 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">HOURLY RATE</span>
                    <div className="text-3xl font-black font-mono mt-2 text-black">${activeGig.budget_min}-${activeGig.budget_max}</div>
                  </div>

                  <div className="border-2 border-black p-6 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">WORK MODE</span>
                    <div className="text-2xl font-black uppercase mt-3 text-black">{activeGig.work_mode}</div>
                  </div>
                </div>

                {/* Algorithmic Spec Breakdown */}
                {activeGig.match_breakdown && (
                  <div className="border-2 border-black p-6 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#e63946]">
                      ALGORITHMIC VECTOR ANALYSIS // COVERAGE {activeGig.match_breakdown.skill_coverage_pct}%
                    </h3>
                    <p className="text-sm text-black leading-relaxed italic border-l-4 border-[#e63946] pl-4 py-1">
                      "{activeGig.match_breakdown.justification}"
                    </p>
                  </div>
                )}

                {/* Technical Competencies Grid */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-black">REQUIRED TECHNICAL COMPETENCIES</h3>
                  <div className="flex flex-wrap gap-2">
                    {activeGig.required_skills.map(s => (
                      <span key={s} className="border-2 border-black px-4 py-2 text-xs font-black uppercase bg-white">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Project Scope */}
                <div className="border-2 border-black p-6">
                  <h3 className="text-xs font-black uppercase tracking-wider mb-2 text-black">PROJECT SPECIFICATION BRIEF</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activeGig.description}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* Mode 2: Parser */}
          {activeMode === 'parser' && (
            <div className="max-w-3xl border-4 border-black p-8 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-black border-b-2 border-black pb-4">
                TAXONOMY EXTRACTION ENGINE
              </h2>

              <textarea
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full border-2 border-black p-4 text-xs font-mono text-black focus:outline-none focus:border-[#e63946]"
              />

              <button
                onClick={handleParse}
                disabled={isParsing}
                className="bg-black hover:bg-[#e63946] text-white text-xs font-black uppercase tracking-widest px-8 py-4"
              >
                {isParsing ? 'PARSING TAXONOMY...' : 'EXECUTE TAXONOMY PARSER'}
              </button>

              {!isParsing && (
                <div className="border-2 border-black p-6 space-y-3">
                  <h3 className="text-xs font-black uppercase text-[#e63946]">EXTRACTED SKILLS MATRIX:</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {freelancers[0]?.skills.map(s => (
                      <div key={s.name} className="border border-black p-3">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-[10px] text-slate-500">Conf: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Post */}
          {activeMode === 'post' && (
            <div className="max-w-xl border-4 border-black p-8 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-black border-b-2 border-black pb-4">
                REGISTER SPECIFICATION
              </h2>

              <form onSubmit={handlePostGig} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block font-black uppercase mb-1">SPECIFICATION TITLE</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border-2 border-black p-3 text-black focus:outline-none focus:border-[#e63946]"
                  />
                </div>

                <div>
                  <label className="block font-black uppercase mb-1">REQUIRED SKILLS (Comma separated)</label>
                  <input
                    type="text"
                    value={newSkills}
                    onChange={(e) => setNewSkills(e.target.value)}
                    className="w-full border-2 border-black p-3 text-black focus:outline-none focus:border-[#e63946]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black hover:bg-[#e63946] text-white py-4 font-black uppercase tracking-widest text-xs transition"
                >
                  PUBLISH TO SWISS REGISTRY
                </button>
              </form>
            </div>
          )}

          {/* Mode 4: Admin */}
          {activeMode === 'admin' && (
            <div className="max-w-4xl space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-black border-b-2 border-black pb-4">
                METRIC EVALUATION GRID
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {benchmarks.map(b => (
                  <div key={b.algorithm_id} className="border-4 border-black p-6 space-y-3 text-xs font-mono">
                    <h3 className="font-black text-sm uppercase text-[#e63946]">{b.algorithm_name}</h3>
                    <div className="space-y-1.5 text-black">
                      <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-bold">{b.ndcg_10}</span></div>
                      <div className="flex justify-between"><span>MAP Score:</span> <span className="font-bold">{b.map_score}</span></div>
                      <div className="flex justify-between"><span>MRR Score:</span> <span className="font-bold">{b.mrr_score}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Fixed Action Ribbon */}
      <footer className="border-t-4 border-black bg-black text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[#e63946] font-bold">● SWISS SYSTEM READY</span>
          <span>UNIT ID: {activeGig.id}</span>
        </div>

        <button
          onClick={() => alert(`Proposal executed for ${activeGig.title}`)}
          className="bg-[#e63946] hover:bg-white hover:text-black text-white px-6 py-2 font-black uppercase tracking-wider transition"
        >
          EXECUTE SPEC PROPOSAL →
        </button>
      </footer>
    </div>
  );
};
