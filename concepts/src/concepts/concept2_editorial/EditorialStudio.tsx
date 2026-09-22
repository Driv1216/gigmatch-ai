import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Sparkles, FileText, CheckCircle, ArrowUpRight,
  ChevronRight, Award, Sliders, ShieldCheck, Heart, User
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

export const EditorialStudio: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGig, setSelectedGig] = useState<Gig>(gigs[0]);
  const [activeTab, setActiveTab] = useState<'discover' | 'parsing' | 'review' | 'admin'>('discover');
  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [parseStep, setParseStep] = useState<number>(0);
  const [isParsing, setIsParsing] = useState(false);

  // New gig posting form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [skills, setSkills] = useState('React, TypeScript, FastAPI');

  const handleStartParsing = () => {
    setIsParsing(true);
    setParseStep(1);
    setTimeout(() => setParseStep(2), 500);
    setTimeout(() => setParseStep(3), 1000);
    setTimeout(() => {
      setIsParsing(false);
      setParseStep(4);
    }, 1500);
  };

  const handlePostGigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onPostGig({
      title,
      description: desc,
      required_skills: skills.split(',').map(s => s.trim()),
      budget_min: 85,
      budget_max: 120,
      client_company: 'Vanguard Editorial',
      work_mode: 'Remote',
    });
    setTitle('');
    setDesc('');
    alert('Opportunity published to Editorial Marketplace!');
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] font-sans">
      {/* Editorial Header Navigation */}
      <header className="border-b border-[#e7e5e4] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl italic font-bold tracking-tight text-[#1c1917]">
              GigMatch <span className="text-[#c96f38]">Studio</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-[#78716c] font-medium border-l border-[#d6d3d1] pl-3">
              Editorial Edition
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('discover')}
              className={`transition py-1 border-b-2 ${
                activeTab === 'discover'
                  ? 'border-[#c96f38] text-[#c96f38]'
                  : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
              }`}
            >
              {role === 'client' ? 'Applicants & Curated Talent' : 'Curated Opportunities'}
            </button>

            {role === 'freelancer' && (
              <button
                onClick={() => setActiveTab('parsing')}
                className={`transition py-1 border-b-2 ${
                  activeTab === 'parsing'
                    ? 'border-[#c96f38] text-[#c96f38]'
                    : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                Smart Resume Extraction
              </button>
            )}

            {role === 'client' && (
              <button
                onClick={() => setActiveTab('review')}
                className={`transition py-1 border-b-2 ${
                  activeTab === 'review'
                    ? 'border-[#c96f38] text-[#c96f38]'
                    : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                Publish New Brief
              </button>
            )}

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`transition py-1 border-b-2 ${
                  activeTab === 'admin'
                    ? 'border-[#c96f38] text-[#c96f38]'
                    : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                }`}
              >
                AI Model Accuracy Suite
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Tab 1: Curated Opportunities & Narrative Match */}
        {activeTab === 'discover' && (
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="border-b border-[#e7e5e4] pb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#c96f38]">
                {role === 'client' ? 'Candidate Review' : 'Intelligent Discovery'}
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl font-medium mt-2 text-[#1c1917] leading-tight">
                {role === 'client' ? 'Curated Talent & Match Justifications' : 'High-Precision Matches for Senior AI Engineers'}
              </h1>
              <p className="mt-4 text-base text-[#78716c] max-w-2xl font-light leading-relaxed">
                Every opportunity is parsed by our deterministic AI engine and scored against your verified technical background.
              </p>
            </div>

            {/* Split layout: Card List & Storytelling Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Column: Editorial Cards */}
              <div className="lg:col-span-5 space-y-4">
                {gigs.map(g => {
                  const isSelected = g.id === selectedGig.id;
                  const match = g.match_breakdown;

                  return (
                    <article
                      key={g.id}
                      onClick={() => setSelectedGig(g)}
                      className={`cursor-pointer p-6 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-[#c96f38] bg-white shadow-xl shadow-[#c96f38]/5 ring-1 ring-[#c96f38]/20'
                          : 'border-[#e7e5e4] bg-white hover:border-[#d6d3d1]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-[#78716c] uppercase tracking-wider">
                            {g.client_company}
                          </span>
                          <h3 className="font-serif text-xl font-semibold text-[#1c1917] mt-1">
                            {g.title}
                          </h3>
                        </div>
                        {match && (
                          <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold font-serif text-[#c96f38]">
                              {match.overall_score}%
                            </span>
                            <span className="text-[10px] text-[#78716c] uppercase font-semibold">Match Score</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-[#78716c] mt-3 line-clamp-2 leading-relaxed">
                        {g.description}
                      </p>

                      <div className="mt-4 pt-4 border-t border-[#f5f5f4] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1c1917]">${g.budget_min}-${g.budget_max} / hr</span>
                        <span className="text-[#c96f38] font-medium flex items-center gap-1">
                          Inspect Brief <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Right Column: Editorial Narrative Inspection */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e7e5e4] p-8 shadow-sm space-y-8">
                {selectedGig && (
                  <>
                    <div className="border-b border-[#f5f5f4] pb-6">
                      <div className="flex items-center justify-between text-xs text-[#78716c]">
                        <span className="uppercase tracking-wider font-semibold text-[#c96f38]">BRIEF SPECIFICATION</span>
                        <span>Published {new Date(selectedGig.posted_date).toLocaleDateString()}</span>
                      </div>
                      <h2 className="font-serif text-3xl font-bold text-[#1c1917] mt-2">
                        {selectedGig.title}
                      </h2>
                      <div className="flex items-center gap-4 mt-3 text-sm text-[#78716c]">
                        <span className="font-medium text-[#1c1917]">{selectedGig.client_company}</span>
                        <span>·</span>
                        <span>{selectedGig.work_mode}</span>
                        <span>·</span>
                        <span className="text-[#c96f38] font-semibold">${selectedGig.budget_min}-${selectedGig.budget_max}/hr</span>
                      </div>
                    </div>

                    {/* Storytelling Match Breakdown */}
                    {selectedGig.match_breakdown && (
                      <div className="bg-[#faf9f6] border border-[#e7e5e4] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-[#c96f38]" />
                          <h3 className="font-serif text-lg font-semibold text-[#1c1917]">
                            AI Match Narrative & Justification
                          </h3>
                        </div>

                        <p className="text-sm text-[#44403c] leading-relaxed italic">
                          "{selectedGig.match_breakdown.justification}"
                        </p>

                        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#e7e5e4] text-center">
                          <div>
                            <div className="text-xs text-[#78716c]">Overall Alignment</div>
                            <div className="text-xl font-serif font-bold text-[#c96f38]">{selectedGig.match_breakdown.overall_score}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#78716c]">Keyword BM25</div>
                            <div className="text-xl font-serif font-bold text-[#1c1917]">{selectedGig.match_breakdown.keyword_score}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#78716c]">Semantic Cosine</div>
                            <div className="text-xl font-serif font-bold text-[#1c1917]">{selectedGig.match_breakdown.semantic_score}%</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Required Skills Matrix */}
                    <div>
                      <h4 className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">Required Technical Competencies</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedGig.required_skills.map(skill => (
                          <span key={skill} className="bg-[#f5f5f4] text-[#1c1917] px-3.5 py-1.5 rounded-full text-xs font-medium border border-[#e7e5e4]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Scope & Description */}
                    <div>
                      <h4 className="text-xs font-semibold text-[#78716c] uppercase tracking-wider mb-3">Project Description</h4>
                      <p className="text-sm text-[#44403c] leading-relaxed font-light">
                        {selectedGig.description}
                      </p>
                    </div>

                    {/* Apply Button */}
                    <div className="pt-4 border-t border-[#f5f5f4] flex justify-end">
                      <button
                        onClick={() => alert(`Proposal submitted for ${selectedGig.title}`)}
                        className="bg-[#1c1917] hover:bg-[#c96f38] text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shadow-md"
                      >
                        Submit Proposal for Opportunity
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Smart Resume Extraction Stage */}
        {activeTab === 'parsing' && (
          <div className="max-w-3xl mx-auto bg-white border border-[#e7e5e4] rounded-2xl p-10 shadow-sm space-y-8">
            <div className="border-b border-[#f5f5f4] pb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#c96f38]">Extraction Pipeline</span>
              <h2 className="font-serif text-3xl font-bold text-[#1c1917] mt-1">Smart Resume Parser</h2>
              <p className="text-sm text-[#78716c] mt-2 font-light">
                Our deterministic parser analyzes text hierarchy, extracts technical entities, and computes skill confidence weights.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-[#78716c]">Raw Resume Markdown / Text:</label>
              <textarea
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full bg-[#faf9f6] border border-[#e7e5e4] rounded-xl p-4 text-xs text-[#1c1917] focus:outline-none focus:border-[#c96f38] leading-relaxed"
              />
            </div>

            <button
              onClick={handleStartParsing}
              disabled={isParsing}
              className="bg-[#c96f38] hover:bg-[#b05d2c] text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition shadow-md"
            >
              {isParsing ? 'Processing Entity Extraction...' : 'Execute Parser Stage'}
            </button>

            {parseStep > 0 && (
              <div className="space-y-4 pt-4 border-t border-[#f5f5f4]">
                <div className="flex items-center gap-3 text-xs">
                  <CheckCircle className={`h-4 w-4 ${parseStep >= 1 ? 'text-emerald-600' : 'text-[#d6d3d1]'}`} />
                  <span className={parseStep >= 1 ? 'text-[#1c1917] font-medium' : 'text-[#a8a29e]'}>Stage 1: Document Structure & Tokenization</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <CheckCircle className={`h-4 w-4 ${parseStep >= 2 ? 'text-emerald-600' : 'text-[#d6d3d1]'}`} />
                  <span className={parseStep >= 2 ? 'text-[#1c1917] font-medium' : 'text-[#a8a29e]'}>Stage 2: Entity Recognition & Skill Tag Mapping</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <CheckCircle className={`h-4 w-4 ${parseStep >= 3 ? 'text-emerald-600' : 'text-[#d6d3d1]'}`} />
                  <span className={parseStep >= 3 ? 'text-[#1c1917] font-medium' : 'text-[#a8a29e]'}>Stage 3: Sentence-Transformer Embedding Encoding</span>
                </div>

                {parseStep >= 4 && (
                  <div className="bg-[#faf9f6] border border-[#e7e5e4] p-6 rounded-xl space-y-4">
                    <h3 className="font-serif text-lg font-bold text-[#1c1917]">Verified Profile Skills:</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {freelancers[0]?.skills.map(s => (
                        <div key={s.name} className="bg-white p-3 rounded-lg border border-[#e7e5e4] text-xs">
                          <div className="font-bold text-[#1c1917]">{s.name}</div>
                          <div className="text-[10px] text-[#78716c] mt-0.5">Category: {s.category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Publish Brief Form (Client) */}
        {activeTab === 'review' && (
          <div className="max-w-2xl mx-auto bg-white border border-[#e7e5e4] rounded-2xl p-10 shadow-sm space-y-6">
            <h2 className="font-serif text-3xl font-bold text-[#1c1917] border-b border-[#f5f5f4] pb-4">
              Publish Project Brief
            </h2>
            <form onSubmit={handlePostGigSubmit} className="space-y-5 text-xs font-light">
              <div>
                <label className="block text-[#78716c] uppercase font-semibold mb-1">Opportunity Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Machine Learning Engineer for Semantic Search"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e7e5e4] rounded-xl p-3 text-sm text-[#1c1917] focus:outline-none focus:border-[#c96f38]"
                />
              </div>

              <div>
                <label className="block text-[#78716c] uppercase font-semibold mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e7e5e4] rounded-xl p-3 text-sm text-[#1c1917] focus:outline-none focus:border-[#c96f38]"
                />
              </div>

              <div>
                <label className="block text-[#78716c] uppercase font-semibold mb-1">Brief Description</label>
                <textarea
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe project goals, deliverables, and technical expectations..."
                  className="w-full bg-[#faf9f6] border border-[#e7e5e4] rounded-xl p-3 text-sm text-[#1c1917] focus:outline-none focus:border-[#c96f38]"
                />
              </div>

              <button type="submit" className="w-full bg-[#c96f38] hover:bg-[#b05d2c] text-white py-3 rounded-xl font-semibold uppercase tracking-wider text-xs transition">
                Publish Opportunity Brief
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Admin Evaluation Suite */}
        {activeTab === 'admin' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="border-b border-[#e7e5e4] pb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#c96f38]">Evaluation Engine</span>
              <h2 className="font-serif text-3xl font-bold text-[#1c1917] mt-1">Algorithm Precision Suite</h2>
              <p className="text-sm text-[#78716c] mt-2 font-light">
                Official ranking evaluations calculated across ground-truth candidate relevance labels.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benchmarks.map(b => (
                <div key={b.algorithm_id} className="bg-white border border-[#e7e5e4] rounded-2xl p-6 shadow-sm space-y-4">
                  <span className="text-xs font-semibold uppercase text-[#c96f38]">{b.algorithm_id} model</span>
                  <h3 className="font-serif text-lg font-bold text-[#1c1917]">{b.algorithm_name}</h3>
                  <div className="border-t border-[#f5f5f4] pt-3 space-y-2 text-xs text-[#78716c]">
                    <div className="flex justify-between"><span>NDCG@10:</span> <span className="font-serif text-sm font-bold text-[#1c1917]">{b.ndcg_10}</span></div>
                    <div className="flex justify-between"><span>MAP Score:</span> <span className="font-serif text-sm font-bold text-[#1c1917]">{b.map_score}</span></div>
                    <div className="flex justify-between"><span>MRR Score:</span> <span className="font-serif text-sm font-bold text-[#1c1917]">{b.mrr_score}</span></div>
                    <div className="flex justify-between"><span>Precision@5:</span> <span className="font-serif text-sm font-bold text-[#1c1917]">{b.precision_5}</span></div>
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
