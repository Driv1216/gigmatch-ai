import React, { useState } from 'react';
import { UserRole, Gig, Application, EvaluationBenchmark, FreelancerProfile } from '../../types';
import {
  Monitor, Folder, FileText, Cpu, X, Minus,
  Square, Terminal, Play, Layers, Clock
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

export const RetroOSDesktop: React.FC<Props> = ({
  role,
  gigs,
  freelancers,
  applications,
  benchmarks,
  onUpdateAppStatus,
  onPostGig,
}) => {
  const [selectedGigId, setSelectedGigId] = useState<string>(gigs[0]?.id || '');

  // Independent Window Open / Minimize States
  const [openExplorer, setOpenExplorer] = useState(true);
  const [openInspector, setOpenInspector] = useState(true);
  const [openParser, setOpenParser] = useState(false);
  const [openPost, setOpenPost] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);

  const [activeWindow, setActiveWindow] = useState<'explorer' | 'inspector' | 'parser' | 'post' | 'admin'>('explorer');

  const [resumeText, setResumeText] = useState(freelancers[0]?.parsed_resume_text || '');
  const [isParsing, setIsParsing] = useState(false);

  // New gig
  const [newTitle, setNewTitle] = useState('');
  const [newSkills, setNewSkills] = useState('React, TypeScript, FastAPI');

  const activeGig = gigs.find(g => g.id === selectedGigId) || gigs[0];

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
      client_company: 'Retro OS Systems',
      work_mode: 'Remote',
    });
    setNewTitle('');
    alert('Program registered to Retro OS desktop!');
  };

  return (
    <div className="min-h-screen bg-[#008080] text-black font-sans p-4 sm:p-6 relative select-none flex flex-col justify-between overflow-hidden">

      {/* Desktop Shortcut Icons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 max-w-2xl mb-6 relative z-10">
        <div
          onClick={() => { setOpenExplorer(true); setActiveWindow('explorer'); }}
          className={`cursor-pointer p-2 flex flex-col items-center gap-1 group rounded ${
            openExplorer && activeWindow === 'explorer' ? 'bg-[#000080]/30 border border-dotted border-white' : ''
          }`}
        >
          <Folder className="h-10 w-10 text-yellow-400 drop-shadow" />
          <span className="text-xs font-bold text-white shadow-black drop-shadow text-center">Gig_Explorer.exe</span>
        </div>

        <div
          onClick={() => { setOpenInspector(true); setActiveWindow('inspector'); }}
          className={`cursor-pointer p-2 flex flex-col items-center gap-1 group rounded ${
            openInspector && activeWindow === 'inspector' ? 'bg-[#000080]/30 border border-dotted border-white' : ''
          }`}
        >
          <Monitor className="h-10 w-10 text-emerald-300 drop-shadow" />
          <span className="text-xs font-bold text-white shadow-black drop-shadow text-center">AI_Inspector.exe</span>
        </div>

        {role === 'freelancer' && (
          <div
            onClick={() => { setOpenParser(true); setActiveWindow('parser'); }}
            className={`cursor-pointer p-2 flex flex-col items-center gap-1 group rounded ${
              openParser && activeWindow === 'parser' ? 'bg-[#000080]/30 border border-dotted border-white' : ''
            }`}
          >
            <Cpu className="h-10 w-10 text-sky-300 drop-shadow" />
            <span className="text-xs font-bold text-white shadow-black drop-shadow text-center">Resume_Parser.dll</span>
          </div>
        )}

        {role === 'client' && (
          <div
            onClick={() => { setOpenPost(true); setActiveWindow('post'); }}
            className={`cursor-pointer p-2 flex flex-col items-center gap-1 group rounded ${
              openPost && activeWindow === 'post' ? 'bg-[#000080]/30 border border-dotted border-white' : ''
            }`}
          >
            <FileText className="h-10 w-10 text-yellow-300 drop-shadow" />
            <span className="text-xs font-bold text-white shadow-black drop-shadow text-center">New_Requisition.bat</span>
          </div>
        )}

        {role === 'admin' && (
          <div
            onClick={() => { setOpenAdmin(true); setActiveWindow('admin'); }}
            className={`cursor-pointer p-2 flex flex-col items-center gap-1 group rounded ${
              openAdmin && activeWindow === 'admin' ? 'bg-[#000080]/30 border border-dotted border-white' : ''
            }`}
          >
            <Terminal className="h-10 w-10 text-rose-300 drop-shadow" />
            <span className="text-xs font-bold text-white shadow-black drop-shadow text-center">Admin_Console.sys</span>
          </div>
        )}
      </div>

      {/* Multiple Overlapping Window Canvas */}
      <div className="relative flex-1 w-full max-w-7xl mx-auto mb-16">

        {/* Window 1: Gig Explorer.exe */}
        {openExplorer && (
          <div
            onClick={() => setActiveWindow('explorer')}
            className={`absolute top-0 left-0 w-full md:w-[480px] bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 shadow-2xl p-1 transition-transform ${
              activeWindow === 'explorer' ? 'z-30' : 'z-20 opacity-95'
            }`}
          >
            <div className={`px-3 py-1.5 flex items-center justify-between text-white font-bold text-xs ${
              activeWindow === 'explorer' ? 'bg-gradient-to-r from-[#000080] to-[#1084d0]' : 'bg-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-yellow-300" />
                <span>Gig_Explorer.exe</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenExplorer(false); }}
                className="bg-[#c0c0c0] text-black border-t border-l border-white border-b-black border-r-black w-4 h-4 text-[10px] flex items-center justify-center font-bold font-mono"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="p-3 bg-white border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white h-[360px] overflow-y-auto space-y-2">
              <div className="text-xs font-bold border-b pb-2 mb-2">C:\Marketplace\Gigs</div>
              {gigs.map(g => (
                <div
                  key={g.id}
                  onClick={() => { setSelectedGigId(g.id); setOpenInspector(true); setActiveWindow('inspector'); }}
                  className={`cursor-pointer p-2 text-xs flex items-center justify-between border ${
                    g.id === selectedGigId ? 'bg-[#000080] text-white border-blue-900 font-bold' : 'hover:bg-slate-100 border-transparent'
                  }`}
                >
                  <div className="truncate max-w-[240px]">{g.title}</div>
                  <div className="font-mono text-[11px]">{g.match_breakdown?.overall_score || 90}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Window 2: AI_Inspector.exe */}
        {openInspector && activeGig && (
          <div
            onClick={() => setActiveWindow('inspector')}
            className={`absolute top-8 left-6 md:left-[450px] w-full md:w-[600px] bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 shadow-2xl p-1 transition-transform ${
              activeWindow === 'inspector' ? 'z-30' : 'z-20 opacity-95'
            }`}
          >
            <div className={`px-3 py-1.5 flex items-center justify-between text-white font-bold text-xs ${
              activeWindow === 'inspector' ? 'bg-gradient-to-r from-[#000080] to-[#1084d0]' : 'bg-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-300" />
                <span>AI_Inspector.exe — [{activeGig.id}]</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenInspector(false); }}
                className="bg-[#c0c0c0] text-black border-t border-l border-white border-b-black border-r-black w-4 h-4 text-[10px] flex items-center justify-center font-bold font-mono"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="p-4 bg-[#c0c0c0] space-y-4">
              <div className="bg-white p-3 border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white">
                <div className="text-xs font-bold text-[#000080] uppercase">{activeGig.client_company}</div>
                <h3 className="font-bold text-sm text-black mt-1">{activeGig.title}</h3>
                <p className="text-xs text-slate-600 mt-1 font-mono">${activeGig.budget_min}-${activeGig.budget_max}/hr · {activeGig.work_mode}</p>
              </div>

              {activeGig.match_breakdown && (
                <div className="bg-white p-3 border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white space-y-2 text-xs">
                  <div className="font-bold flex justify-between">
                    <span>AI MATCH SCORE REPORT:</span>
                    <span className="font-mono text-blue-900">{activeGig.match_breakdown.overall_score}% MATCH</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
                    <div className="bg-slate-100 p-1.5 border border-slate-300">HYBRID: {activeGig.match_breakdown.overall_score}%</div>
                    <div className="bg-slate-100 p-1.5 border border-slate-300">BM25: {activeGig.match_breakdown.keyword_score}%</div>
                    <div className="bg-slate-100 p-1.5 border border-slate-300">COSINE: {activeGig.match_breakdown.semantic_score}%</div>
                  </div>
                  <p className="italic text-slate-800 bg-slate-50 p-2 border border-slate-300">
                    "{activeGig.match_breakdown.justification}"
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => alert(`Proposal transmitted for ${activeGig.title}`)}
                  className="bg-[#c0c0c0] text-black font-bold text-xs px-4 py-2 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 active:translate-y-0.5"
                >
                  RUN PROPOSAL_SUBMIT.EXE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Window 3: Resume_Parser.dll */}
        {openParser && (
          <div
            onClick={() => setActiveWindow('parser')}
            className={`absolute top-16 left-4 md:left-48 w-full md:w-[540px] bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 shadow-2xl p-1 transition-transform ${
              activeWindow === 'parser' ? 'z-30' : 'z-20 opacity-95'
            }`}
          >
            <div className={`px-3 py-1.5 flex items-center justify-between text-white font-bold text-xs ${
              activeWindow === 'parser' ? 'bg-gradient-to-r from-[#000080] to-[#1084d0]' : 'bg-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-sky-300" />
                <span>Resume_Parser.dll — Taxonomy Scanner</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenParser(false); }}
                className="bg-[#c0c0c0] text-black border-t border-l border-white border-b-black border-r-black w-4 h-4 text-[10px] flex items-center justify-center font-bold font-mono"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="p-4 bg-[#c0c0c0] space-y-3">
              <textarea
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full bg-white border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white p-3 text-xs font-mono focus:outline-none"
              />

              <button
                onClick={handleParse}
                disabled={isParsing}
                className="bg-[#c0c0c0] text-black font-bold text-xs px-4 py-2 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800"
              >
                {isParsing ? 'PARSING...' : 'EXECUTE PARSER'}
              </button>
            </div>
          </div>
        )}

        {/* Window 4: New_Requisition.bat */}
        {openPost && (
          <div
            onClick={() => setActiveWindow('post')}
            className={`absolute top-20 left-6 md:left-64 w-full md:w-[480px] bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 shadow-2xl p-1 transition-transform ${
              activeWindow === 'post' ? 'z-30' : 'z-20 opacity-95'
            }`}
          >
            <div className={`px-3 py-1.5 flex items-center justify-between text-white font-bold text-xs ${
              activeWindow === 'post' ? 'bg-gradient-to-r from-[#000080] to-[#1084d0]' : 'bg-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-300" />
                <span>New_Requisition.bat</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenPost(false); }}
                className="bg-[#c0c0c0] text-black border-t border-l border-white border-b-black border-r-black w-4 h-4 text-[10px] flex items-center justify-center font-bold font-mono"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="p-4 bg-[#c0c0c0] space-y-3">
              <form onSubmit={handlePostGig} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Skills (Comma separated)</label>
                  <input
                    type="text"
                    value={newSkills}
                    onChange={(e) => setNewSkills(e.target.value)}
                    className="w-full bg-white border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white p-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#c0c0c0] text-black font-bold py-2 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800"
                >
                  PUBLISH REQUISITION
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Windows 95 Taskbar */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#c0c0c0] border-t-2 border-white flex items-center justify-between px-2 z-50">
        <div className="flex items-center gap-2">
          <button className="bg-[#c0c0c0] font-bold text-xs px-3 py-1 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-b-slate-800 border-r-slate-800 flex items-center gap-1 shadow active:translate-y-0.5">
            <Play className="h-3 w-3 fill-black text-black" /> Start
          </button>
          <div className="h-6 w-0.5 bg-slate-500 mx-1" />

          {/* Active Window Buttons in Taskbar */}
          {openExplorer && (
            <button
              onClick={() => setActiveWindow('explorer')}
              className={`px-3 py-1 text-xs font-bold border-t-2 border-l-2 ${
                activeWindow === 'explorer'
                  ? 'bg-slate-300 border-b-white border-r-white border-t-slate-800 border-l-slate-800'
                  : 'bg-[#c0c0c0] border-white border-b-slate-800 border-r-slate-800'
              }`}
            >
              Gig_Explorer.exe
            </button>
          )}

          {openInspector && (
            <button
              onClick={() => setActiveWindow('inspector')}
              className={`px-3 py-1 text-xs font-bold border-t-2 border-l-2 ${
                activeWindow === 'inspector'
                  ? 'bg-slate-300 border-b-white border-r-white border-t-slate-800 border-l-slate-800'
                  : 'bg-[#c0c0c0] border-white border-b-slate-800 border-r-slate-800'
              }`}
            >
              AI_Inspector.exe
            </button>
          )}
        </div>

        <div className="border-2 border-t-slate-800 border-l-slate-800 border-b-white border-r-white px-3 py-0.5 text-xs font-mono bg-[#c0c0c0]">
          11:45 PM
        </div>
      </footer>
    </div>
  );
};
