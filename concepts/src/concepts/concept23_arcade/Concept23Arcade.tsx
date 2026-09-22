import React, { useState, useEffect } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import { Gamepad2, Swords, Skull, Trophy } from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Concept23Arcade: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [activeGigIndex, setActiveGigIndex] = useState(0);
  const activeGig = gigs[activeGigIndex] || gigs[0];
  const activeFreelancer = freelancers[0];

  // Blinking insert coin effect
  const [insertCoinVisible, setInsertCoinVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setInsertCoinVisible(v => !v), 800);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => setActiveGigIndex((prev) => (prev + 1) % gigs.length);
  const handlePrev = () => setActiveGigIndex((prev) => (prev - 1 + gigs.length) % gigs.length);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 flex flex-col justify-center relative overflow-hidden selection:bg-yellow-400 selection:text-black" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

      {/* Scanlines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-50" />

      {/* CRT Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] pointer-events-none z-40" />

      {/* Header */}
      <header className="absolute top-8 left-0 right-0 text-center z-30">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-red-600 tracking-tighter" style={{ WebkitTextStroke: '2px #b91c1c', filter: 'drop-shadow(0 4px 0 #7f1d1d)' }}>
          GIGMATCH KOMBAT
        </h1>
        <div className={`mt-4 text-xl font-bold text-red-500 ${insertCoinVisible ? 'opacity-100' : 'opacity-0'}`}>
          INSERT COIN
        </div>
      </header>

      {/* Main VS Screen */}
      <main className="max-w-6xl mx-auto w-full relative z-30 mt-20">

        {/* Health Bars */}
        <div className="flex justify-between items-center px-4 mb-12 gap-8">
          {/* Player 1 (Freelancer) HP */}
          <div className="flex-1 border-4 border-white bg-black h-10 p-1 relative">
            <div className="absolute -top-6 left-0 text-yellow-400 font-bold">P1: {activeFreelancer?.full_name || 'DEV'}</div>
            <div className="h-full bg-gradient-to-r from-red-600 to-yellow-400 w-[100%]" />
          </div>

          <div className="text-5xl font-black text-white italic tracking-tighter" style={{ textShadow: '4px 4px 0 #b91c1c' }}>
            VS
          </div>

          {/* Player 2 (Gig Boss) HP */}
          <div className="flex-1 border-4 border-white bg-black h-10 p-1 relative flex justify-end">
            <div className="absolute -top-6 right-0 text-red-500 font-bold text-right">CPU: {activeGig.client_company}</div>
            <div className="h-full bg-gradient-to-l from-red-600 to-red-400" style={{ width: `${activeGig.match_breakdown?.overall_score || 94}%` }} />
          </div>
        </div>

        {/* Character Stages */}
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-8 px-4">

          {/* Player 1 Side */}
          <div className="flex-1 bg-blue-900/40 border-4 border-blue-500 p-6 relative overflow-hidden group hover:bg-blue-900/60 transition">
            <div className="text-2xl font-black text-blue-400 mb-4">CHALLENGER</div>
            <div className="text-4xl font-bold text-white mb-2">{activeFreelancer?.title || 'Full Stack Ninja'}</div>

            <div className="space-y-2 mt-8">
              <div className="text-yellow-400 font-bold">SKILL SET:</div>
              {activeFreelancer?.skills.map(s => (
                <div key={s.name} className="flex justify-between text-sm">
                  <span className="text-blue-300">{s.name}</span>
                  <span className="text-white">LVL {(s.extracted_confidence || 0.9) * 100}</span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 right-0 opacity-20 group-hover:opacity-40 transition transform scale-150 translate-x-1/4 translate-y-1/4">
              <Swords className="w-64 h-64 text-blue-500" strokeWidth={1} />
            </div>
          </div>

          {/* Center Match Score (Power Level) */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-red-500 font-bold text-xl mb-2 text-center">MATCH POWER</div>
            <div className="text-7xl font-black text-white" style={{ textShadow: '0 0 20px #eab308' }}>
              {activeGig.match_breakdown?.overall_score || 94}
            </div>
          </div>

          {/* Player 2 Boss Side */}
          <div className="flex-1 bg-red-900/40 border-4 border-red-500 p-6 relative overflow-hidden group hover:bg-red-900/60 transition">

            {/* Boss Select Arrows */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button onClick={handlePrev} className="bg-red-600 text-white px-3 py-1 font-bold hover:bg-red-500 border-2 border-white">&lt;</button>
              <button onClick={handleNext} className="bg-red-600 text-white px-3 py-1 font-bold hover:bg-red-500 border-2 border-white">&gt;</button>
            </div>

            <div className="text-2xl font-black text-red-500 mb-4">BOSS STAGE {activeGigIndex + 1}</div>
            <div className="text-3xl font-bold text-white mb-2 pr-20">{activeGig.title}</div>

            <div className="mt-8 space-y-4 relative z-10">
              <div>
                <div className="text-yellow-400 font-bold">REWARD BOUNTY:</div>
                <div className="text-xl text-white">${activeGig.budget_min}-${activeGig.budget_max}/HR</div>
              </div>

              <div>
                <div className="text-yellow-400 font-bold">REQUIRED MOVES:</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeGig.required_skills.map(s => (
                    <span key={s} className="bg-red-950 border border-red-500 text-red-300 px-2 py-1 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 opacity-20 group-hover:opacity-40 transition transform scale-150 translate-x-1/4 translate-y-1/4">
              <Skull className="w-64 h-64 text-red-500" strokeWidth={1} />
            </div>
          </div>

        </div>

        {/* Action Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => alert('FIGHT!')}
            className="text-3xl md:text-5xl font-black text-white bg-red-600 px-12 py-6 border-4 border-white hover:bg-red-500 hover:scale-110 transition-transform shadow-[8px_8px_0_#b91c1c]"
          >
            FIGHT! (APPLY)
          </button>
        </div>

      </main>

      {/* Footer Text */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-stone-500 font-bold z-30">
        CONCEPT 23: RETRO ARCADE FIGHTER · ALL RIGHTS RESERVED 2026
      </footer>

    </div>
  );
};
