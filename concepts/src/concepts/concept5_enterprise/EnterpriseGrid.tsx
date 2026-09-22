import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Grid, CheckSquare, Square, ArrowUpDown, Filter, Download,
  Layers, CheckCircle, XCircle, Clock, ExternalLink, Code
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

export const EnterpriseGrid: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(['app-401', 'app-402']);
  const [activeTab, setActiveTab] = useState<'grid' | 'compare' | 'eval' | 'json'>('grid');
  const [sortField, setSortField] = useState<'match_score' | 'applied_at'>('match_score');
  const [showJson, setShowJson] = useState(false);

  const toggleSelectApp = (id: string) => {
    if (selectedAppIds.includes(id)) {
      setSelectedAppIds(selectedAppIds.filter(item => item !== id));
    } else {
      if (selectedAppIds.length >= 3) {
        alert('You can compare a maximum of 3 candidates simultaneously.');
        return;
      }
      setSelectedAppIds([...selectedAppIds, id]);
    }
  };

  const selectedApplications = applications.filter(a => selectedAppIds.includes(a.id));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Enterprise Top Command Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Grid className="h-5 w-5 text-indigo-400" />
            <span className="font-mono text-sm font-bold tracking-tight text-white">
              GIGMATCH ENTERPRISE // DATA GRID & COMPARE HUB
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1 rounded font-bold transition ${
                activeTab === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              [1] Data Grid View
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                activeTab === 'compare' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              [2] Side-by-Side Compare ({selectedAppIds.length})
            </button>

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('eval')}
                className={`px-3 py-1 rounded font-bold transition ${
                  activeTab === 'eval' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                [3] Admin Benchmarks
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Enterprise Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab 1: Tabular Data Grid View */}
        {activeTab === 'grid' && (
          <div className="space-y-6">

            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-mono">Compare Tray:</span>
                <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded font-bold border border-indigo-500/30">
                  {selectedAppIds.length} / 3 Candidates Selected
                </span>
                {selectedAppIds.length > 0 && (
                  <button
                    onClick={() => setActiveTab('compare')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-bold transition"
                  >
                    Open Comparison Matrix →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1 rounded font-mono text-slate-300 flex items-center gap-1"
                >
                  <Code className="h-3.5 w-3.5" /> {showJson ? 'Hide Raw JSON' : 'Inspect Raw JSON'}
                </button>
              </div>
            </div>

            {showJson && (
              <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(applications, null, 2)}
              </pre>
            )}

            {/* Structured Table */}
            <div className="border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center">Compare</th>
                    <th className="p-3">Applicant Name & Title</th>
                    <th className="p-3">Target Gig Opportunity</th>
                    <th className="p-3 text-center">Match Score</th>
                    <th className="p-3 text-center">BM25 / Cosine</th>
                    <th className="p-3 text-center">Status Lifecycle</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {applications.map(app => {
                    const isChecked = selectedAppIds.includes(app.id);

                    return (
                      <tr key={app.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 text-center">
                          <button onClick={() => toggleSelectApp(app.id)} className="text-slate-400 hover:text-white">
                            {isChecked ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-white flex items-center gap-2">
                            <img src={app.freelancer_avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                            {app.freelancer_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{app.freelancer_title}</div>
                        </td>

                        <td className="p-3 max-w-xs font-mono text-slate-300 truncate">
                          {app.gig_title}
                        </td>

                        <td className="p-3 text-center font-mono">
                          <span className={`px-2.5 py-1 rounded font-bold ${
                            app.match_score >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                          }`}>
                            {app.match_score}%
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono text-slate-400">
                          {app.keyword_score}% / {app.semantic_score}%
                        </td>

                        <td className="p-3 text-center">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {app.status}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1 font-mono text-[10px]">
                            <button
                              onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                              className="px-2 py-1 bg-indigo-900/40 text-indigo-300 rounded border border-indigo-700/50 hover:bg-indigo-900/60"
                            >
                              Shortlist
                            </button>
                            <button
                              onClick={() => onUpdateAppStatus(app.id, 'accepted')}
                              className="px-2 py-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-700/50 hover:bg-emerald-900/60"
                            >
                              Accept
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Side-by-Side Candidate Comparison Matrix */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold font-mono text-white">CANDIDATE COMPARISON TRAY</h2>
                <p className="text-xs text-slate-400 mt-0.5">Comparing {selectedApplications.length} candidates side-by-side</p>
              </div>
              <button
                onClick={() => setActiveTab('grid')}
                className="text-xs font-mono text-indigo-400 hover:underline"
              >
                ← Back to Data Grid
              </button>
            </div>

            {selectedApplications.length === 0 ? (
              <div className="text-center py-16 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                No candidates selected for comparison. Select candidates from the Data Grid view.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedApplications.map(app => (
                  <div key={app.id} className="border border-indigo-500/30 bg-slate-950 p-6 rounded-2xl space-y-5">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                      <img src={app.freelancer_avatar} alt="" className="h-12 w-12 rounded-full object-cover border border-slate-700" />
                      <div>
                        <h3 className="font-bold text-white text-base">{app.freelancer_name}</h3>
                        <p className="text-xs text-slate-400">{app.freelancer_title}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl text-center font-mono border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Match Score</div>
                      <div className="text-3xl font-bold text-indigo-400 mt-1">{app.match_score}%</div>
                      <div className="text-[10px] text-slate-400 mt-1">Keyword: {app.keyword_score}% · Semantic: {app.semantic_score}%</div>
                    </div>

                    <div>
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">Matching Competencies</h4>
                      <div className="flex flex-wrap gap-1">
                        {app.matching_skills.map(s => (
                          <span key={s} className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {app.missing_skills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">Missing Skills</h4>
                        <div className="flex flex-wrap gap-1">
                          {app.missing_skills.map(s => (
                            <span key={s} className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono px-2 py-0.5 rounded">
                              ✗ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 flex justify-between gap-2">
                      <button
                        onClick={() => onUpdateAppStatus(app.id, 'shortlisted')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold py-2 rounded"
                      >
                        Shortlist Candidate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admin benchmarks */}
        {activeTab === 'eval' && (
          <div className="max-w-4xl mx-auto space-y-6 font-mono text-xs">
            <h2 className="text-base font-bold text-amber-400 border-b border-slate-800 pb-3">
              ADMINISTRATIVE RANKING BENCHMARKS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="border border-slate-800 bg-slate-950 p-5 rounded-xl space-y-3">
                  <div className="text-indigo-400 font-bold">{b.algorithm_name}</div>
                  <div className="space-y-1 text-slate-300">
                    <div>NDCG@5: <span className="text-white font-bold">{b.ndcg_5}</span></div>
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
