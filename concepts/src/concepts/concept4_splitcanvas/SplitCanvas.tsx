import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Columns, Search, ArrowRight, CheckCircle, Clock,
  X, Filter, FileText, ChevronRight, User, ShieldCheck
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

export const SplitCanvas: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGig, setSelectedGig] = useState<Gig | null>(gigs[0]);
  const [activeTab, setActiveTab] = useState<'explore' | 'resume' | 'post' | 'eval'>('explore');
  const [searchFilter, setSearchFilter] = useState('');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isExtracted, setIsExtracted] = useState(false);

  // New gig form state
  const [gigTitle, setGigTitle] = useState('');
  const [gigSkills, setGigSkills] = useState('React, TypeScript, FastAPI');

  const filteredGigs = gigs.filter(g =>
    g.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.required_skills.some(s => s.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleCreateGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigTitle) return;
    onPostGig({
      title: gigTitle,
      required_skills: gigSkills.split(',').map(s => s.trim()),
      budget_min: 90,
      budget_max: 130,
      client_company: 'Nordic Studio',
      work_mode: 'Remote',
    });
    setGigTitle('');
    alert('Gig created successfully in Split-Canvas!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Scandinavian Minimal Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Columns className="h-5 w-5 text-slate-800" />
            <span className="font-display text-base font-bold tracking-tight text-slate-900">
              GigMatch <span className="font-normal text-slate-500">Split-Canvas</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'explore' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {role === 'client' ? 'Applicants Master-Detail' : 'Marketplace Focus'}
            </button>
            {role === 'freelancer' && (
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'resume' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resume Parsing Studio
              </button>
            )}
            {role === 'client' && (
              <button
                onClick={() => setActiveTab('post')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'post' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Post New Opportunity
              </button>
            )}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('eval')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'eval' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Accuracy Benchmarks
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Dual-Pane Canvas Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Master List Canvas */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter opportunities..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="space-y-3">
                {filteredGigs.map(g => {
                  const isSelected = selectedGig?.id === g.id;
                  const match = g.match_breakdown;

                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGig(g)}
                      className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-slate-900 bg-white shadow-md ring-1 ring-slate-900/10'
                          : 'border-slate-200/80 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{g.client_company}</span>
                        {match && (
                          <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            {match.overall_score}% Match
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold text-slate-900 mt-1">
                        {g.title}
                      </h3>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <span className="font-medium text-slate-900">${g.budget_min}-${g.budget_max} / hr</span>
                        <span>{g.work_mode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Sliding Detail Focus Canvas */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
              {selectedGig ? (
                <>
                  <div className="border-b border-slate-100 pb-6 flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">FOCUS ITEM DETAILS</span>
                      <h2 className="font-display text-2xl font-bold text-slate-900 mt-1">{selectedGig.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">{selectedGig.client_company} · {selectedGig.work_mode}</p>
                    </div>
                    <button
                      onClick={() => setSelectedGig(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* AI Match Explanation Drawer */}
                  {selectedGig.match_breakdown && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                        <span>AI MATCH INSIGHT</span>
                        <span className="text-emerald-700">Coverage: {selectedGig.match_breakdown.skill_coverage_pct}%</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedGig.match_breakdown.justification}
                      </p>
                    </div>
                  )}

                  {/* Required Skills list */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGig.required_skills.map(s => (
                        <span key={s} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Brief</h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-light">
                      {selectedGig.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => alert(`Applied to ${selectedGig.title}`)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-6 py-3 rounded-xl shadow transition"
                    >
                      Submit Application
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-400 text-sm">
                  Select an item from the left canvas to view deep focus details.
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Resume Parser Studio */}
        {activeTab === 'resume' && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 border-b border-slate-100 pb-4">
              Resume Extraction Focus Studio
            </h2>

            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />

            <button
              onClick={() => setIsExtracted(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-6 py-3 rounded-xl"
            >
              Parse Resume Skills
            </button>

            {isExtracted && (
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500">Extracted Skills Matrix:</h3>
                <div className="flex flex-wrap gap-2">
                  {freelancers[0]?.skills.map(s => (
                    <span key={s.name} className="bg-white border border-slate-200 text-slate-800 px-3 py-1 rounded-lg text-xs font-medium">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Post Gig Form (Client) */}
        {activeTab === 'post' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
            <h2 className="font-display text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
              Post Opportunity Brief
            </h2>
            <form onSubmit={handleCreateGigSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={gigTitle}
                  onChange={(e) => setGigTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Skills (Comma separated)</label>
                <input
                  type="text"
                  value={gigSkills}
                  onChange={(e) => setGigSkills(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl">
                Publish Opportunity
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Evaluation benchmarks */}
        {activeTab === 'eval' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 border-b border-slate-200 pb-3">
              Admin Model Accuracy Evaluation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm">{b.algorithm_name}</h3>
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
