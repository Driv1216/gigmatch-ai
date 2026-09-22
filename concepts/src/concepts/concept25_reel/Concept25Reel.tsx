import React, { useState, useEffect } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import { Heart, X, MessageCircle, Share2, Info, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Concept25Reel: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const activeGig = gigs[currentIndex] || gigs[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % gigs.length);
    setShowInfo(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + gigs.length) % gigs.length);
    setShowInfo(false);
  };

  // Keyboard navigation for scrolling reels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') handleNext();
      if (e.key === 'ArrowUp') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white font-sans flex justify-center items-center overflow-hidden">

      {/* Dynamic Blurred Background matching the client company name (hash color) */}
      <div
        className="absolute inset-0 opacity-40 blur-[100px] scale-150 transition-colors duration-1000"
        style={{
          backgroundColor: `hsl(${(activeGig.client_company.length * 20) % 360}, 70%, 40%)`
        }}
      />

      {/* Main Mobile Screen Container */}
      <div className="relative w-full max-w-md h-full sm:h-[85vh] sm:rounded-3xl bg-[#111] overflow-hidden shadow-2xl border border-white/10 flex flex-col transition-transform duration-500">

        {/* Top Header overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-xl font-black tracking-tighter">GigReels</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Concept 25</div>
        </div>

        {/* Content Area (The Video/Card replacement) */}
        <div className="flex-1 relative flex flex-col justify-end p-6 pb-24 z-10" onClick={() => setShowInfo(!showInfo)}>

          {/* Match Badge */}
          {activeGig.match_breakdown && (
            <div className="absolute top-20 right-6 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 border border-white/30 shadow-lg text-center transform rotate-6">
              <div className="text-3xl font-black text-white drop-shadow-md">
                {activeGig.match_breakdown.overall_score}%
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest text-white/80">
                Match
              </div>
            </div>
          )}

          {/* Gig Info */}
          <div className="space-y-4 max-w-[85%] transition-all duration-300">
            <div>
              <h2 className="text-3xl font-black leading-tight drop-shadow-lg">{activeGig.title}</h2>
              <div className="text-lg font-bold text-white/80 mt-1 drop-shadow-md">{activeGig.client_company}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                ${activeGig.budget_min}-${activeGig.budget_max}/hr
              </span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                {activeGig.work_mode}
              </span>
            </div>

            {/* Expandable Info */}
            <div className={`overflow-hidden transition-all duration-500 ${showInfo ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-sm text-white/90 leading-relaxed font-medium bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/10 mb-4">
                {activeGig.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {activeGig.required_skills.map(s => (
                  <span key={s} className="text-xs font-bold text-white/70 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    #{s.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>

            {!showInfo && (
              <p className="text-sm text-white/70 line-clamp-2">
                {activeGig.description}
              </p>
            )}
          </div>
        </div>

        {/* Floating Action Buttons (Right Edge) */}
        <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">

          <button
            onClick={(e) => { e.stopPropagation(); alert('Applied!'); }}
            className="group flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-pink-500 transition-colors shadow-lg">
              <Heart className="w-6 h-6 fill-white text-white" />
            </div>
            <span className="text-[10px] font-bold">Apply</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="group flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-black/50 transition-colors shadow-lg">
              <X className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold">Skip</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            className="group flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 transition-colors shadow-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-bold">Details</span>
          </button>
        </div>

        {/* Swipe Indicators */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-white/30 z-0">
          <ArrowUp className="w-8 h-8 animate-bounce cursor-pointer hover:text-white transition" onClick={handlePrev} />
          <ArrowDown className="w-8 h-8 animate-bounce cursor-pointer hover:text-white transition" onClick={handleNext} />
        </div>

      </div>

      {/* Desktop Helper Text */}
      <div className="absolute left-8 bottom-8 text-white/50 text-sm font-bold hidden lg:block">
        Use ↑ / ↓ arrow keys to scroll through Gig Reels. <br/>
        Click card to expand details.
      </div>
    </div>
  );
};
