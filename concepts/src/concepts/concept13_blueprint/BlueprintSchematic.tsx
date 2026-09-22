import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  FileText, Compass, Ruler, Grid, Layers,
  CheckSquare, CheckCircle, Send, Cpu, ShieldCheck, PenTool
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

export const BlueprintSchematic: React.FC<Props> = ({
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
  const [activeTab, setActiveTab] = useState<'cad_board' | 'spec_parser' | 'post_spec' | 'benchmarks'>('cad_board');
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
      client_company: 'Blueprint Engineering Corp',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Specification published to CAD Blueprint Registry!');
  };

  return (
    <div className="min-h-screen bg-[#0a192f] text-cyan-100 font-mono p-4 sm:p-6 relative selection:bg-cyan-500 selection:text-black flex flex-col justify-between overflow-hidden">
      {/* CAD Grid & Rulers Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#112a4a_1px,transparent_1px),linear-gradient(to_bottom,#112a4a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-80 pointer-events-none" />

      {/* Top CAD Rulers Bar */}
      <div className="bg-[#0d223f] border-b-2 border-cyan-400 text-[10px] text-cyan-400 font-bold px-4 py-1 flex items-center justify-between relative z-10 -mx-6 -mt-6 mb-6">
        <div className="flex gap-8">
          <span>0mm</span><span>100mm</span><span>200mm</span><span>300mm</span><span>400mm</span><span>500mm</span><span>600mm</span>
        </div>
        <div>CAD DRAFTING CANVAS // VANGUARD SCHEMATIC</div>
      </div>

      {/* Header Block */}
      <header className="relative z-10 max-w-7xl mx-auto w-full mb-6 border-2 border-cyan-400/60 bg-[#0d223f]/90 p-4 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border-2 border-cyan-400 bg-cyan-950 flex items-center justify-center text-cyan-400 font-bold">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-cyan-300 tracking-wider text-sm uppercase">CAD DRAFTING BOARD // CONCEPT 13</span>
              <span className="text-[9px] border border-cyan-400/60 px-2 py-0.5 text-cyan-400 font-bold">AUTO-CAD REV 2.0</span>
            </div>
            <p className="text-[10px] text-cyan-400/70">Architectural Requisition & Dimensioned Skill Schematic</p>
          </div>
        </div>

        {/* Blueprint Navigation */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setActiveTab('cad_board')}
            className={`px-3 py-1.5 border-2 transition font-bold ${
              activeTab === 'cad_board'
                ? 'border-cyan-400 bg-cyan-400 text-black'
                : 'border-cyan-400/40 text-cyan-300 hover:border-cyan-400'
            }`}
          >
            [DWG-01] CAD BOARD
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('spec_parser')}
              className={`px-3 py-1.5 border-2 transition font-bold ${
                activeTab === 'spec_parser'
                  ? 'border-cyan-400 bg-cyan-400 text-black'
                  : 'border-cyan-400/40 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              [DWG-02] CV SPEC PARSER
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post_spec')}
              className={`px-3 py-1.5 border-2 transition font-bold ${
                activeTab === 'post_spec'
                  ? 'border-cyan-400 bg-cyan-400 text-black'
                  : 'border-cyan-400/40 text-cyan-300 hover:border-cyan-400'
              }`}
            >
              [DWG-02] DRAFT SCHEMATIC
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('benchmarks')}
              className={`px-3 py-1.5 border-2 transition font-bold ${
                activeTab === 'benchmarks'
                  ? 'border-amber-400 bg-amber-400 text-black'
                  : 'border-amber-400/40 text-amber-300 hover:border-amber-400'
              }`}
            >
              [DWG-03] AUDIT GRID
            </button>
          )}
        </div>
      </header>

      {/* Main CAD Board Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full mb-16">

        {/* Tab 1: CAD Drafting Board */}
        {activeTab === 'cad_board' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left CAD Requisition Selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="border-2 border-cyan-400/40 bg-[#0d223f] p-2 flex items-center">
                <Ruler className="h-4 w-4 text-cyan-400 ml-2 mr-2" />
                <input
                  type="text"
                  placeholder="SEARCH DRAWINGS BY TAG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-cyan-200 focus:outline-none placeholder:text-cyan-600"
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
                          ? 'border-cyan-400 bg-[#112a4a] text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'border-cyan-400/40 bg-[#0d223f]/80 hover:border-cyan-400/70'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-cyan-300 uppercase tracking-widest">{g.client_company}</span>
                        {match && (
                          <span className="text-xs font-bold text-cyan-400 border border-cyan-400 px-2 py-0.5">
                            |&lt;-- {match.overall_score}% --&gt;|
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-xs mt-2">{g.title}</h3>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-cyan-300">
                        <span>EST: ${g.budget_min}-${g.budget_max}/HR</span>
                        <span>{g.work_mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Architectural CAD Inspection Drawing */}
            <div className="lg:col-span-8 border-2 border-cyan-400/60 bg-[#0d223f]/90 p-6 space-y-6 relative">

              {/* CAD Title Block Seal in Corner */}
              <div className="border-2 border-cyan-400 bg-[#0a192f] p-4 text-xs font-mono space-y-1">
                <div className="flex justify-between border-b border-cyan-400/40 pb-2">
                  <span className="text-cyan-400 font-bold">PROJECT DRAFT: {activeGig.title}</span>
                  <span className="text-white">DRAWING NO: DWG-{activeGig.id}</span>
                </div>
                <div className="flex justify-between text-[11px] text-cyan-300 pt-1">
                  <span>CLIENT: {activeGig.client_company}</span>
                  <span>MATCH SCORE: |&lt;-- {activeGig.match_breakdown?.overall_score || 94}.00mm --&gt;|</span>
                </div>
              </div>

              {/* Dimensioned Breakdown */}
              {activeGig.match_breakdown && (
                <div className="border-2 border-cyan-400/40 bg-[#0a192f] p-4 space-y-3">
                  <div className="text-xs font-bold text-cyan-300 border-b border-cyan-400/30 pb-2 flex justify-between">
                    <span>SCHEMATIC ALIGNMENT BREAKDOWN</span>
                    <span>COVERAGE: {activeGig.match_breakdown.skill_coverage_pct}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="border border-cyan-400/30 bg-[#0d223f] p-2">
                      <div className="text-[9px] text-cyan-400">HYBRID BLEND</div>
                      <div className="text-sm font-bold text-white">{activeGig.match_breakdown.overall_score}%</div>
                    </div>
                    <div className="border border-cyan-400/30 bg-[#0d223f] p-2">
                      <div className="text-[9px] text-cyan-400">BM25 KEYWORD</div>
                      <div className="text-sm font-bold text-cyan-200">{activeGig.match_breakdown.keyword_score}%</div>
                    </div>
                    <div className="border border-cyan-400/30 bg-[#0d223f] p-2">
                      <div className="text-[9px] text-cyan-400">SEMANTIC COSINE</div>
                      <div className="text-sm font-bold text-cyan-200">{activeGig.match_breakdown.semantic_score}%</div>
                    </div>
                  </div>

                  <p className="text-xs text-cyan-200 bg-[#0d223f] p-3 border border-cyan-400/20 leading-relaxed italic">
                    "{activeGig.match_breakdown.justification}"
                  </p>
                </div>
              )}

              {/* Required Skills */}
              <div>
                <h4 className="text-xs text-cyan-300 uppercase font-bold tracking-wider mb-2">Required Architectural Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {activeGig.required_skills.map(s => (
                    <span key={s} className="border border-cyan-400 bg-cyan-950 text-cyan-200 px-3 py-1 text-xs font-bold">
                      [SPEC] {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scope Description */}
              <div>
                <h4 className="text-xs text-cyan-300 uppercase font-bold tracking-wider mb-2">Scope Specification</h4>
                <p className="text-xs text-cyan-200 leading-relaxed bg-[#0a192f] p-3 border border-cyan-400/30">
                  {activeGig.description}
                </p>
              </div>

              {/* Action */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => alert(`Submitted proposal for drawing DWG-${activeGig.id}`)}
                  className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs px-6 py-3 border-2 border-cyan-400 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" /> TRANSMIT CAD PROPOSAL
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Spec Parser */}
        {activeTab === 'spec_parser' && (
          <div className="max-w-3xl mx-auto border-2 border-cyan-400/60 bg-[#0d223f]/90 p-6 space-y-6">
            <h2 className="text-sm font-bold text-cyan-300 border-b border-cyan-400/30 pb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" /> CAD CV SPECIFICATION PARSER
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-[#0a192f] border-2 border-cyan-400/40 p-3 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
            />

            <button
              onClick={handleParse}
              disabled={isParsing}
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs px-6 py-3 border-2 border-cyan-400"
            >
              {isParsing ? 'PARSING DRAFT...' : 'RUN CAD SPEC PARSER'}
            </button>

            {!isParsing && (
              <div className="border-2 border-cyan-400/30 bg-[#0a192f] p-4 space-y-3 text-xs">
                <div className="text-cyan-300 font-bold">EXTRACTED SKILL TAXONOMY:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="border border-cyan-400/40 bg-[#0d223f] p-2">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-cyan-400">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post Spec */}
        {activeTab === 'post_spec' && (
          <div className="max-w-xl mx-auto border-2 border-cyan-400/60 bg-[#0d223f]/90 p-6 space-y-5">
            <h2 className="text-sm font-bold text-cyan-300 border-b border-cyan-400/30 pb-3">
              DRAFT NEW SCHEMATIC
            </h2>

            <form onSubmit={handlePostGig} className="space-y-4 text-xs">
              <div>
                <label className="block text-cyan-300 mb-1">SCHEMATIC TITLE</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0a192f] border-2 border-cyan-400/40 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-cyan-300 mb-1">REQUIRED SKILLS (Comma separated)</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full bg-[#0a192f] border-2 border-cyan-400/40 p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 border-2 border-cyan-400"
              >
                PUBLISH SCHEMATIC TO REGISTRY
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'benchmarks' && (
          <div className="max-w-4xl mx-auto space-y-6 text-xs">
            <h2 className="text-base font-bold text-amber-400 border-b border-amber-400/40 pb-2">
              CAD RANKING AUDIT BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border-2 border-cyan-400/40 bg-[#0d223f] p-4 space-y-3">
                  <div className="text-cyan-300 font-bold">{b.algorithm_name}</div>
                  <div className="space-y-1 text-cyan-100">
                    <div>NDCG@10: <span className="text-white font-bold">{b.ndcg_10}</span></div>
                    <div>MAP: <span className="text-white font-bold">{b.map_score}</span></div>
                    <div>MRR: <span className="text-white font-bold">{b.mrr_score}</span></div>
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
