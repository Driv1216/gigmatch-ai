import React, { useState, useEffect, useRef } from 'react';
import { ConceptMode, UserRole } from '../types';
import {
  Terminal, BookOpen, Cpu, Columns, Grid, UserCheck, Briefcase,
  ShieldCheck, Sparkles, Sliders, Radio, Compass, Eye, Box, Square,
  Monitor, Zap, Orbit, Share2, Disc, Gamepad2, TrendingUp, Smartphone,
  ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, Search, X
} from 'lucide-react';
import { CONCEPTS_LIST } from './ConceptHub';

interface Props {
  activeConcept: ConceptMode;
  setActiveConcept: (mode: ConceptMode) => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
}

export const CONCEPT_ORDER: ConceptMode[] = [
  'concept1_precision',
  'concept2_editorial',
  'concept3_matrix',
  'concept4_splitcanvas',
  'concept5_enterprise',
  'concept6_terminal',
  'concept7_broadsheet',
  'concept8_brutalist',
  'concept9_aurora',
  'concept10_kanban',
  'concept11_neumorphic',
  'concept12_cyberpunk',
  'concept13_blueprint',
  'concept14_frostglass',
  'concept15_bento',
  'concept16_swiss',
  'concept17_compliance',
  'concept18_retro_os',
  'concept19_acid_zine',
  'concept20_spatial',
  'concept21_constellation',
  'concept22_vinyl',
  'concept23_arcade',
  'concept24_trading',
  'concept25_reel',
];

export const ConceptSwitcher: React.FC<Props> = ({
  activeConcept,
  setActiveConcept,
  activeRole,
  setActiveRole,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIndex = CONCEPT_ORDER.indexOf(activeConcept);
  const isHub = activeConcept === 'concept_hub';

  const currentConceptData = CONCEPTS_LIST.find(c => c.id === activeConcept) || CONCEPTS_LIST[0];
  const CurrentIcon = currentConceptData.icon;

  // Stepper handlers
  const handlePrev = () => {
    if (isHub) {
      setActiveConcept(CONCEPT_ORDER[0]);
      return;
    }
    const prevIndex = (currentIndex - 1 + CONCEPT_ORDER.length) % CONCEPT_ORDER.length;
    setActiveConcept(CONCEPT_ORDER[prevIndex]);
  };

  const handleNext = () => {
    if (isHub) {
      setActiveConcept(CONCEPT_ORDER[0]);
      return;
    }
    const nextIndex = (currentIndex + 1) % CONCEPT_ORDER.length;
    setActiveConcept(CONCEPT_ORDER[nextIndex]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts (←, →, [, ], H, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault();
        handleNext();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveConcept(isHub ? CONCEPT_ORDER[0] : 'concept_hub');
      } else if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else if (!isHub) {
          setActiveConcept('concept_hub');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isHub, isDropdownOpen]);

  const filteredDropdownConcepts = CONCEPTS_LIST.filter(c =>
    c.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">

      {/* Main Single-Line Header (~56px height) */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">

        {/* Left: Brand & Hub Trigger */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveConcept('concept_hub')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 font-bold text-white shadow-md shadow-sky-500/20 cursor-pointer hover:scale-105 transition-transform shrink-0"
          >
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveConcept('concept_hub')}
              className="text-left group"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-extrabold tracking-tight text-white group-hover:text-sky-300 transition-colors">GigMatch AI</span>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/20">
                  Concepts
                </span>
              </div>
            </button>

            {/* Dedicated Concept Hub Button */}
            <button
              onClick={() => setActiveConcept('concept_hub')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ml-2 ${
                isHub
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Browse All (25)</span>
              <span className="sm:hidden">Hub</span>
            </button>
          </div>
        </div>

        {/* Right Area: Corner Stepper (<-->) & Role Selector */}
        <div className="flex items-center gap-3">

          {/* Corner Stepper (<-->) */}
          <div className="relative flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-0.5 shadow-sm" ref={dropdownRef}>

            {/* Previous Concept Button */}
            <button
              onClick={handlePrev}
              title="Previous Concept (← or [)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Active Concept Pill & Quick Dropdown Trigger */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:bg-slate-800/80"
            >
              <CurrentIcon className="h-3.5 w-3.5 text-sky-400 shrink-0" />

              <div className="flex items-center gap-1.5 text-left">
                {isHub ? (
                  <span className="font-bold text-sky-400">Concept Gallery (All 25)</span>
                ) : (
                  <>
                    <span className="font-mono text-[11px] font-bold text-sky-400">
                      [#{currentConceptData.num.toString().padStart(2, '0')}/25]
                    </span>
                    <span className="font-bold text-white max-w-[130px] sm:max-w-[200px] truncate">
                      {currentConceptData.title}
                    </span>
                  </>
                )}
              </div>

              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Next Concept Button */}
            <button
              onClick={handleNext}
              title="Next Concept (→ or ])"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Fast Jump Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">

                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Concept Switcher</span>
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Dropdown Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter concepts..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Dropdown Items List */}
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredDropdownConcepts.map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = activeConcept === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveConcept(item.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-sky-400'}`} />
                          <div className="truncate">
                            <div className="font-bold truncate">{item.name}: {item.title}</div>
                            <div className={`text-[10px] truncate ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                              {item.categoryLabel}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono shrink-0 ml-2 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                          #{item.num.toString().padStart(2, '0')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Shortcuts: ← / → or [ / ]</span>
                  <button
                    onClick={() => {
                      setActiveConcept('concept_hub');
                      setIsDropdownOpen(false);
                    }}
                    className="text-sky-400 hover:underline font-bold"
                  >
                    Open Hub Gallery →
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Compact Role Switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              onClick={() => setActiveRole('freelancer')}
              title="Switch to Freelancer view"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeRole === 'freelancer'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Freelancer</span>
            </button>

            <button
              onClick={() => setActiveRole('client')}
              title="Switch to Client view"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeRole === 'client'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Client</span>
            </button>

            <button
              onClick={() => setActiveRole('admin')}
              title="Switch to Admin Evaluation view"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeRole === 'admin'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Admin</span>
            </button>
          </div>

        </div>

      </div>

      {/* Ultra-Thin Sub-Bar with Active Concept Description & Shortcut Hints (~26px height) */}
      {!isHub && (
        <div className="border-t border-slate-800/60 bg-slate-900/40 px-4 py-1.5 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2 truncate">
              <CurrentIcon className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="font-bold text-white shrink-0">{currentConceptData.title}:</span>
              <span className="text-slate-400 truncate">{currentConceptData.subtitle}</span>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-500 shrink-0">
              <span>Keys: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">←</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">→</kbd> cycle</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">H</kbd> hub</span>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
