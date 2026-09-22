import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import { Disc, Play, Pause, FastForward, Rewind, Volume2, Mic2, Music } from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Concept22Vinyl: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [activeGigIndex, setActiveGigIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const activeGig = gigs[activeGigIndex] || gigs[0];

  const handleNext = () => {
    setActiveGigIndex((prev) => (prev + 1) % gigs.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setActiveGigIndex((prev) => (prev - 1 + gigs.length) % gigs.length);
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f1e7] text-stone-900 font-sans p-4 sm:p-8 relative selection:bg-[#ff4500] selection:text-white flex flex-col justify-center items-center">

      {/* Top Header */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <Disc className="h-8 w-8 text-[#ff4500]" />
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Gig Records</h1>
          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Concept 22: High Fidelity Audio Match</p>
        </div>
      </div>

      <main className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-16 lg:gap-32">

        {/* Left: The Turntable Player */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 shrink-0">
          {/* Record Player Base */}
          <div className="absolute inset-0 bg-[#e8e4d9] rounded-3xl shadow-[20px_20px_60px_#d0cdce,-20px_-20px_60px_#ffffff] border-4 border-white flex items-center justify-center p-8">

            {/* The Vinyl Record */}
            <div className={`relative w-full h-full rounded-full bg-[#111] shadow-2xl border-4 border-[#333] flex items-center justify-center transition-transform duration-[4000ms] ease-linear ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>

              {/* Vinyl Grooves */}
              <div className="absolute inset-2 rounded-full border border-white/5" />
              <div className="absolute inset-6 rounded-full border border-white/5" />
              <div className="absolute inset-10 rounded-full border border-white/10" />
              <div className="absolute inset-16 rounded-full border border-white/5" />
              <div className="absolute inset-24 rounded-full border border-white/10" />

              {/* Center Label */}
              <div className="relative w-24 h-24 rounded-full bg-[#ff4500] border-4 border-[#111] flex flex-col items-center justify-center text-center p-2 shadow-inner">
                <div className="w-4 h-4 bg-[#e8e4d9] rounded-full shadow-inner mb-1" />
                <span className="text-[8px] font-black uppercase text-black leading-tight truncate w-full">
                  {activeGig.client_company}
                </span>
                <span className="text-[6px] font-bold text-black/70 uppercase tracking-widest mt-0.5">
                  SIDE A
                </span>
              </div>
            </div>

            {/* Stylus / Tonearm */}
            <div className={`absolute -right-6 top-10 w-8 h-48 bg-gradient-to-b from-stone-300 to-stone-500 rounded-full origin-top transform transition-transform duration-700 shadow-2xl ${isPlaying ? 'rotate-12' : '-rotate-12'}`}>
              <div className="absolute bottom-0 -left-2 w-12 h-6 bg-stone-700 rounded-sm" />
            </div>

          </div>
        </div>

        {/* Right: The Album Sleeve / Details */}
        <div className="flex-1 max-w-xl w-full">

          {/* Record Sleeve Container */}
          <div className="bg-white p-8 sm:p-12 shadow-2xl border-l-8 border-[#ff4500] relative">

            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Track {activeGigIndex + 1} / {gigs.length}</span>

              {/* "BPM" Match Score */}
              <div className="text-right">
                <div className="text-[10px] font-black text-[#ff4500] uppercase tracking-widest">Match Frequency</div>
                <div className="text-4xl font-black text-stone-900 tracking-tighter">
                  {activeGig.match_breakdown?.overall_score || 94} <span className="text-sm">BPM</span>
                </div>
              </div>
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-stone-900 leading-[0.9] uppercase tracking-tighter mb-4">
              {activeGig.title}
            </h2>

            <div className="flex items-center gap-4 text-sm font-bold text-stone-500 uppercase tracking-widest mb-8 border-b-2 border-stone-100 pb-6">
              <span>{activeGig.client_company}</span>
              <span>•</span>
              <span>${activeGig.budget_min}-${activeGig.budget_max}/HR</span>
            </div>

            {/* Liner Notes (Skills & Justification) */}
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Mic2 className="h-3 w-3" /> Featured Instruments (Skills)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeGig.required_skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-stone-100 text-stone-600 font-bold text-xs uppercase border border-stone-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {activeGig.match_breakdown && (
                <div>
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Music className="h-3 w-3" /> Liner Notes (AI Justification)
                  </h4>
                  <p className="text-sm font-medium text-stone-600 italic bg-stone-50 p-4 border-l-4 border-stone-200">
                    "{activeGig.match_breakdown.justification}"
                  </p>
                </div>
              )}
            </div>

            {/* Audio Controls */}
            <div className="mt-12 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handlePrev} className="p-3 text-stone-400 hover:text-[#ff4500] transition">
                  <Rewind className="h-6 w-6" fill="currentColor" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-[#ff4500] hover:bg-[#e03d00] text-white flex items-center justify-center transition shadow-[0_10px_20px_rgba(255,69,0,0.3)]"
                >
                  {isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6 ml-1" fill="currentColor" />}
                </button>
                <button onClick={handleNext} className="p-3 text-stone-400 hover:text-[#ff4500] transition">
                  <FastForward className="h-6 w-6" fill="currentColor" />
                </button>
              </div>

              <button
                onClick={() => alert('Dropping the needle on this gig!')}
                className="px-6 py-3 border-2 border-stone-900 font-black uppercase text-xs tracking-widest hover:bg-stone-900 hover:text-white transition"
              >
                Sign Contract
              </button>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};
