import React, { useState, useEffect } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import { TrendingUp, Activity, DollarSign, Globe, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  role: UserRole;
  gigs: Gig[];
  freelancers: FreelancerProfile[];
  applications: Application[];
  benchmarks: EvaluationBenchmark[];
  onUpdateAppStatus: (appId: string, status: Application['status']) => void;
  onPostGig: (gig: Partial<Gig>) => void;
}

export const Concept24Trading: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigs[0]?.id || '');
  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

  // Ticker animation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-[#00ff00] font-mono p-2 sm:p-4 selection:bg-[#00ff00] selection:text-black text-xs flex flex-col">

      {/* Bloomberg-style Top Menu Bar */}
      <header className="flex justify-between border-b-2 border-slate-800 pb-2 mb-4">
        <div className="flex gap-4">
          <span className="font-bold bg-white text-black px-2">GIG_TERM</span>
          <span className="text-slate-400">1&lt;GO&gt; Match Monitor</span>
          <span className="text-slate-400">2&lt;GO&gt; Resume Parser</span>
        </div>
        <div className="flex gap-4 text-slate-400">
          <span>{new Date().toISOString().split('T')[1].slice(0, 8)} UTC</span>
          <span className="text-[#00ff00]">CONNECTED</span>
        </div>
      </header>

      {/* Main Terminal Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Panel: Ticker List */}
        <div className="lg:col-span-4 border border-slate-800 p-2 flex flex-col">
          <div className="bg-slate-900 text-white font-bold px-2 py-1 mb-2 flex justify-between">
            <span>TICKER (CLIENT)</span>
            <span>MATCH%</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {gigs.map(g => {
              const isSelected = g.id === selectedGigId;
              const match = g.match_breakdown?.overall_score || 0;
              // Fake volatility
              const change = ((g.id.length * tick) % 5) - 2;

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGigId(g.id)}
                  className={`flex justify-between p-1 cursor-pointer font-bold ${
                    isSelected ? 'bg-[#00ff00] text-black' : 'hover:bg-slate-900'
                  }`}
                >
                  <span className="truncate w-32 uppercase">{g.client_company.replace(/[^A-Z]/ig, '').slice(0, 5)}</span>

                  <div className="flex items-center gap-2">
                    <span className={change >= 0 ? (isSelected ? 'text-black' : 'text-[#00ff00]') : 'text-red-500'}>
                      {match}%
                    </span>
                    {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Detail view (The "Stock Chart") */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Top Stat Row */}
          <div className="border border-slate-800 p-4 grid grid-cols-4 gap-4">
            <div>
              <div className="text-slate-500">INDEX VALUE</div>
              <div className="text-3xl font-black">{activeGig.match_breakdown?.overall_score || 94}.00</div>
              <div className="text-[#00ff00] flex items-center">+1.24 (1.3%) <ArrowUpRight className="h-3 w-3 ml-1" /></div>
            </div>

            <div>
              <div className="text-slate-500">CLIENT</div>
              <div className="text-lg font-bold text-white truncate">{activeGig.client_company}</div>
              <div className="text-slate-400">{activeGig.work_mode}</div>
            </div>

            <div>
              <div className="text-slate-500">BID-ASK (BUDGET)</div>
              <div className="text-lg font-bold">${activeGig.budget_min} - ${activeGig.budget_max}</div>
              <div className="text-slate-400">USD/HR</div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <button
                onClick={() => alert(`BUY ORDER PLACED (Applied to ${activeGig.title})`)}
                className="bg-[#00ff00] text-black font-bold py-2 px-4 hover:bg-white"
              >
                BUY (APPLY)
              </button>
              <button className="bg-red-600 text-white font-bold py-2 px-4 hover:bg-red-500">
                SELL (PASS)
              </button>
            </div>
          </div>

          {/* Fake Candlestick Chart Area & Diagnostics */}
          <div className="border border-slate-800 p-4 flex-1 flex flex-col relative">
            <div className="text-slate-500 mb-4 font-bold flex justify-between">
              <span>CONFIDENCE INTERVAL CHART</span>
              <span>1D 1W 1M 1Y MAX</span>
            </div>

            {/* CSS-based fake candlesticks */}
            <div className="flex-1 border-b border-slate-800 flex items-end justify-between px-4 pb-2 gap-1 h-48">
              {Array.from({ length: 40 }).map((_, i) => {
                const isGreen = Math.random() > 0.4;
                const height = 20 + Math.random() * 60;
                return (
                  <div key={i} className="relative w-full flex justify-center items-end h-full">
                    <div
                      className={`w-0.5 absolute bottom-0 ${isGreen ? 'bg-[#00ff00]' : 'bg-red-600'}`}
                      style={{ height: `${height + Math.random() * 20}%` }}
                    />
                    <div
                      className={`w-full ${isGreen ? 'bg-[#00ff00]' : 'bg-red-600'}`}
                      style={{ height: `${height}%`, bottom: `${Math.random() * 10}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* AI Vector Terminal Logs */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-slate-500 mb-2">VECTOR_ALGO_JUSTIFICATION&gt;</div>
              <div className="text-[#00ff00] bg-slate-900 p-2 font-mono whitespace-pre-wrap">
                {activeGig.match_breakdown?.justification || 'PROCESSING...'}
                {'\n\n'}
                <span className="text-slate-400">REQUIRED_ASSETS:</span> {activeGig.required_skills.join(', ')}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Bottom Scrolling Marquee */}
      <footer className="mt-4 border-t-2 border-slate-800 pt-2 overflow-hidden whitespace-nowrap bg-slate-900 py-1">
        <div className="inline-block animate-marquee text-[#00ff00] font-bold">
          {gigs.map(g => (
            <span key={g.id} className="mr-8">
              {g.client_company.replace(/[^A-Z]/ig, '').slice(0, 5)} {g.match_breakdown?.overall_score || 94}.00
              <span className="text-white ml-2">▲</span>
            </span>
          ))}
        </div>
      </footer>

    </div>
  );
};
