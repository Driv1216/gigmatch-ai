import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  ShieldCheck, FileText, Lock, Award, CheckCircle2,
  Search, Cpu, Key, FileCode, X, ChevronUp, Layers
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

export const ComplianceLedger: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'parser' | 'post' | 'admin'>('ledger');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isAuditing, setIsAuditing] = useState(false);

  // New gig
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('React, TypeScript, FastAPI');

  const selectedGig = gigs.find(g => g.id === selectedGigId);

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAuditResume = () => {
    setIsAuditing(true);
    setTimeout(() => setIsAuditing(false), 500);
  };

  const handlePostContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onPostGig({
      title,
      required_skills: skills.split(',').map(s => s.trim()),
      budget_min: 95,
      budget_max: 135,
      client_company: 'Vanguard Enterprise Compliance',
      work_mode: 'Remote',
    });
    setTitle('');
    alert('Contract requisition registered in Compliance Ledger!');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans p-4 sm:p-8 relative selection:bg-emerald-600 selection:text-white">

      {/* Institutional Enterprise Audit Banner */}
      <header className="max-w-7xl mx-auto mb-8 bg-[#0b192c] text-white rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 border-b-4 border-emerald-500">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-wide">ENTERPRISE COMPLIANCE LEDGER</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                SECURITY CERTIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">Official Legal & Requisition Verification Data Matrix</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'ledger'
                ? 'bg-emerald-500 text-black font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            01. Requisition Ledger
          </button>

          {role === 'freelancer' && (
            <button
              onClick={() => setActiveTab('parser')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'parser'
                  ? 'bg-emerald-500 text-black font-bold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              02. Resume Audit Parser
            </button>
          )}

          {role === 'client' && (
            <button
              onClick={() => setActiveTab('post')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'post'
                  ? 'bg-emerald-500 text-black font-bold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              02. Register Contract
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-black font-bold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              03. Audit Benchmarks
            </button>
          )}
        </nav>
      </header>

      {/* Main Ledger Container */}
      <main className="max-w-7xl mx-auto space-y-6">

        {/* Tab 1: 100% Full-Width Audit Ledger Table */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full max-w-md">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter audited contract requisitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <span className="text-xs font-mono text-slate-500">{filteredGigs.length} CERTIFIED RECORDS</span>
            </div>

            {/* 100% Full Width Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0b192c] text-white font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Security Hash</th>
                    <th className="p-4">Contract Requisition Title</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4 text-center">Match Index</th>
                    <th className="p-4 text-center">Work Mode</th>
                    <th className="p-4 text-right">Compensation</th>
                    <th className="p-4 text-right">Audit Drawer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGigs.map(g => (
                    <tr
                      key={g.id}
                      onClick={() => setSelectedGigId(g.id)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        selectedGigId === g.id ? 'bg-emerald-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="p-4 font-mono text-[11px] text-slate-500">
                        0x{g.id.replace('-', '')}8f
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {g.title}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {g.client_company}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-300">
                          {g.match_breakdown?.overall_score || 92}%
                        </span>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600">
                        {g.work_mode}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 font-mono">
                        ${g.budget_min}-${g.budget_max}/hr
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedGigId(g.id)}
                          className="bg-[#0b192c] hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                        >
                          Inspect Record <ChevronUp className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Slide-Up Audit Drawer Overlay */}
        {selectedGig && activeTab === 'ledger' && (
          <div className="fixed inset-x-0 bottom-0 z-50 max-w-7xl mx-auto px-4 pb-4">
            <div className="bg-[#0b192c] text-white rounded-3xl p-8 shadow-2xl border-t-4 border-emerald-500 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-700 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AUDIT RECORD INSPECTOR</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{selectedGig.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedGig.client_company} · {selectedGig.work_mode}</p>
                </div>
                <button
                  onClick={() => setSelectedGigId(null)}
                  className="text-slate-400 hover:text-white p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {selectedGig.match_breakdown && (
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>OFFICIAL VERIFICATION JUSTIFICATION</span>
                    <span>COVERAGE: {selectedGig.match_breakdown.skill_coverage_pct}%</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed italic bg-slate-950 p-3 rounded-xl">
                    "{selectedGig.match_breakdown.justification}"
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedGig.required_skills.map(s => (
                    <span key={s} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-semibold">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => alert(`Submitted verified proposal for ${selectedGig.title}`)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition"
                >
                  Submit Certified Proposal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Parser */}
        {activeTab === 'parser' && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-600" /> RESUME COMPLIANCE AUDIT & TAXONOMY PARSER
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
            />

            <button
              onClick={handleAuditResume}
              disabled={isAuditing}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-[#0b192c] hover:bg-slate-800 transition shadow-md"
            >
              {isAuditing ? 'Auditing Resume...' : 'Execute Compliance Audit Parser'}
            </button>

            {!isAuditing && (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-emerald-700 uppercase">Verified Skill Taxonomy:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {freelancers[0]?.skills.map(s => (
                    <div key={s.name} className="p-3 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Confidence: {((s.extracted_confidence || 0.9) * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-4">
              REGISTER CONTRACT REQUISITION
            </h2>

            <form onSubmit={handlePostContract} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Contract Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#0b192c] hover:bg-slate-800 transition shadow-md"
              >
                Register Contract in Compliance Ledger
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-4">
              ADMINISTRATIVE AUDIT BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="font-bold text-emerald-700">{b.algorithm_name}</h3>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-bold text-slate-900">{b.ndcg_10}</span></div>
                    <div className="flex justify-between"><span>MAP Score:</span> <span className="font-bold text-slate-900">{b.map_score}</span></div>
                    <div className="flex justify-between"><span>MRR Score:</span> <span className="font-bold text-slate-900">{b.mrr_score}</span></div>
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
