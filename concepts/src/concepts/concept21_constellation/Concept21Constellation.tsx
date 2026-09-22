import React, { useState, useEffect } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import { Share2, Star, Zap, Cpu, ScanLine } from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Concept21Constellation: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [activeGigId, setActiveGigId] = useState<string | null>(null);

  // Randomize node positions once on mount to simulate a star map
  const [nodes, setNodes] = useState<{ id: string; x: number; y: number }[]>([]);

  useEffect(() => {
    // Generate deterministic-ish random positions
    const newNodes = gigs.map((g, i) => ({
      id: g.id,
      x: 15 + (i * 37) % 70, // 15% to 85%
      y: 20 + (i * 23) % 60, // 20% to 80%
    }));
    setNodes(newNodes);
  }, [gigs]);

  const activeGig = gigs.find(g => g.id === activeGigId);
  const activeNode = nodes.find(n => n.id === activeGigId);

  return (
    <div className="min-h-screen bg-[#020205] text-indigo-100 font-sans p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">

      {/* Background Starfield */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[10%] left-[20%] w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse" />
        <div className="absolute top-[40%] left-[80%] w-1.5 h-1.5 bg-indigo-300 rounded-full shadow-[0_0_15px_indigo] animate-pulse delay-75" />
        <div className="absolute top-[70%] left-[10%] w-1 h-1 bg-sky-200 rounded-full shadow-[0_0_8px_cyan] animate-pulse delay-150" />
        <div className="absolute top-[30%] left-[50%] w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_20px_purple] animate-pulse delay-300" />
      </div>

      {/* SVG Connection Lines */}
      {activeNode && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {nodes.map(n => {
            if (n.id === activeGigId) return null;
            return (
              <line
                key={`line-${n.id}`}
                x1={`${activeNode.x}%`}
                y1={`${activeNode.y}%`}
                x2={`${n.x}%`}
                y2={`${n.y}%`}
                stroke="url(#lineGrad)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}
        </svg>
      )}

      {/* Constellation Nodes (Gigs) */}
      <div className="absolute inset-0 z-20">
        {nodes.map((node, idx) => {
          const gig = gigs.find(g => g.id === node.id);
          if (!gig) return null;
          const isActive = activeGigId === node.id;

          return (
            <div
              key={node.id}
              onClick={() => setActiveGigId(isActive ? null : node.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* Star Core */}
              <div className={`relative flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-150 z-30' : 'scale-100 hover:scale-125 z-20'}`}>
                {/* Glow ring */}
                <div className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${isActive ? 'bg-indigo-500 opacity-100 scale-150' : 'bg-sky-400 opacity-40 group-hover:opacity-100'}`} />

                {/* Core */}
                <div className={`relative h-4 w-4 rounded-full border-2 border-white shadow-[0_0_15px_white] ${isActive ? 'bg-indigo-400' : 'bg-transparent'}`} />
              </div>

              {/* Label */}
              <div className={`absolute left-6 top-0 w-48 transition-all duration-300 ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">{gig.client_company}</div>
                <div className="text-xs font-bold text-white truncate">{gig.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Header Overlay */}
      <div className="relative z-30 p-6 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-indigo-400" />
            <h1 className="text-xl font-extrabold text-white tracking-widest uppercase">Constellation Match Engine</h1>
          </div>
          <p className="text-xs text-indigo-400 mt-1 uppercase tracking-widest">Concept 21: Neural Node Map</p>
        </div>
      </div>

      {/* Active Gig Panel Overlay */}
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#050510]/90 backdrop-blur-2xl border-l border-indigo-500/20 shadow-[-20px_0_50px_rgba(99,102,241,0.15)] z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeGig ? 'translate-x-0' : 'translate-x-full'}`}>

        {activeGig && (
          <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col">
            <button
              onClick={() => setActiveGigId(null)}
              className="text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-white mb-8 self-start"
            >
              [CLOSE OVERLAY]
            </button>

            <div className="space-y-8 flex-1">
              <div>
                <div className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4">
                  {activeGig.client_company} // {activeGig.work_mode}
                </div>
                <h2 className="text-3xl font-extrabold text-white leading-tight">{activeGig.title}</h2>
              </div>

              {/* Match Score Orb */}
              {activeGig.match_breakdown && (
                <div className="flex items-center gap-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-indigo-500/20 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />

                  <div className="relative h-20 w-20 rounded-full flex items-center justify-center border-4 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] bg-[#050510]">
                    <span className="text-2xl font-black text-white">{activeGig.match_breakdown.overall_score}%</span>
                  </div>

                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold mb-1">Vector Synergy</div>
                    <div className="text-sm font-medium text-slate-300 italic">
                      "{activeGig.match_breakdown.justification}"
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 mb-3">Constellation Skill Nodes</h4>
                <div className="flex flex-wrap gap-2">
                  {activeGig.required_skills.map(s => (
                    <span key={s} className="px-4 py-2 rounded-full text-xs font-medium bg-[#0a0a1a] border border-indigo-500/30 text-indigo-100 flex items-center gap-2">
                      <Star className="h-3 w-3 text-indigo-400" /> {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 mb-3">Opportunity Coordinates</h4>
                <p className="text-sm text-slate-300 leading-relaxed font-light opacity-80">
                  {activeGig.description}
                </p>
              </div>
            </div>

            <div className="pt-8 mt-auto">
              <button
                onClick={() => alert(`Establishing connection to node ${activeGig.id}...`)}
                className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                Establish Vector Connection
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
