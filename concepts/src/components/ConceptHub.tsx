import React, { useState } from 'react';
import { ConceptMode, UserRole } from '../types';
import {
  Sparkles, Search, ArrowRight, LayoutGrid, Zap, Orbit,
  Terminal, BookOpen, Cpu, Columns, Grid, Sliders, Radio,
  Compass, Eye, Box, Square, ShieldCheck, Monitor, Share2,
  Disc, Gamepad2, TrendingUp, Smartphone, Shuffle, Layers,
  ExternalLink, CheckCircle2
} from 'lucide-react';

export interface ConceptItem {
  id: ConceptMode;
  num: number;
  name: string;
  title: string;
  subtitle: string;
  category: 'visionary' | 'bold' | 'foundational';
  categoryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgGradient: string;
  tags: string[];
}

export const CONCEPTS_LIST: ConceptItem[] = [
  // Visionary (21-25)
  {
    id: 'concept21_constellation',
    num: 21,
    name: 'Concept 21',
    title: 'Constellation Node Graph',
    subtitle: 'Cinematic interactive node-graph interface where Gigs are floating stars connected by skill constellations',
    category: 'visionary',
    categoryLabel: 'Visionary & Cinematic',
    icon: Share2,
    accentColor: '#818cf8',
    bgGradient: 'from-indigo-950/80 via-slate-900 to-purple-950/60',
    tags: ['Data Visualization', 'SVG Constellations', 'Deep Space', 'Neural Graph'],
  },
  {
    id: 'concept22_vinyl',
    num: 22,
    name: 'Concept 22',
    title: 'Vinyl Record Player',
    subtitle: 'Music metaphor with spinning vinyl UI, tonearms, and waveform audio-visualizer match scores',
    category: 'visionary',
    categoryLabel: 'Visionary & Metaphorical',
    icon: Disc,
    accentColor: '#ff4500',
    bgGradient: 'from-orange-950/70 via-stone-900 to-amber-950/60',
    tags: ['Spinning Vinyl', 'Audio Visualizer', 'Tonearm Stylus', 'Skeuomorphic'],
  },
  {
    id: 'concept23_arcade',
    num: 23,
    name: 'Concept 23',
    title: 'Retro Arcade Fighter',
    subtitle: 'Gamified 8-bit fighting game character select screen "Freelancer vs. Gig Boss"',
    category: 'visionary',
    categoryLabel: 'Visionary & Gamified',
    icon: Gamepad2,
    accentColor: '#ef4444',
    bgGradient: 'from-red-950/80 via-black to-yellow-950/60',
    tags: ['8-Bit Gamified', 'VS Health Bars', 'CRT Scanlines', 'Pixel Aesthetics'],
  },
  {
    id: 'concept24_trading',
    num: 24,
    name: 'Concept 24',
    title: 'HFT Bloomberg Terminal',
    subtitle: 'High-Frequency Trading Bloomberg-style terminal with scrolling skill tickers & candlestick confidence intervals',
    category: 'visionary',
    categoryLabel: 'Visionary & Financial',
    icon: TrendingUp,
    accentColor: '#22c55e',
    bgGradient: 'from-emerald-950/80 via-black to-slate-950',
    tags: ['Bloomberg HFT', 'Candlestick Charts', 'Live Ticker', 'Buy/Sell Actions'],
  },
  {
    id: 'concept25_reel',
    num: 25,
    name: 'Concept 25',
    title: 'Cinematic TikTok Reel',
    subtitle: 'Mobile-first immersive fullscreen swipeable video cards with heavy background blur & floating action buttons',
    category: 'visionary',
    categoryLabel: 'Visionary & Mobile-First',
    icon: Smartphone,
    accentColor: '#ec4899',
    bgGradient: 'from-pink-950/80 via-slate-900 to-purple-950/60',
    tags: ['TikTok/Reels UI', 'Dynamic Blur', 'Swipe Actions', 'Fullscreen Immersive'],
  },

  // Bold & Grounded (11-20)
  {
    id: 'concept16_swiss',
    num: 16,
    name: 'Concept 16',
    title: 'Swiss Typographic Grid',
    subtitle: 'Ultra-structured International Typographic Style with signal-red rules & asymmetric architectural spine',
    category: 'bold',
    categoryLabel: 'Grounded Architectural',
    icon: Square,
    accentColor: '#e63946',
    bgGradient: 'from-slate-900 via-neutral-900 to-red-950/40',
    tags: ['Swiss 12-Column', 'Left Vertical Spine', 'Signal-Red Baseline', 'Architectural'],
  },
  {
    id: 'concept17_compliance',
    num: 17,
    name: 'Concept 17',
    title: 'Compliance Audit Ledger',
    subtitle: 'Institutional enterprise audit ledger with verified stamps, security hashes & slide-up drawer',
    category: 'bold',
    categoryLabel: 'Grounded Enterprise',
    icon: ShieldCheck,
    accentColor: '#0ea5e9',
    bgGradient: 'from-slate-950 via-sky-950/40 to-slate-900',
    tags: ['Full-Width Table', 'Security Hashes', 'Slide-Up Drawer', 'Institutional'],
  },
  {
    id: 'concept18_retro_os',
    num: 18,
    name: 'Concept 18',
    title: 'Retro OS Desktop',
    subtitle: 'Simulated Windows 95 desktop environment with classic teal wallpaper, floating windows & Start taskbar',
    category: 'bold',
    categoryLabel: 'Bold Retro Simulation',
    icon: Monitor,
    accentColor: '#008080',
    bgGradient: 'from-teal-950/80 via-slate-900 to-blue-950/60',
    tags: ['Windows 95 OS', 'Floating Windows', 'Desktop Icons', 'Taskbar & Start'],
  },
  {
    id: 'concept19_acid_zine',
    num: 19,
    name: 'Concept 19',
    title: 'Acid Graphic Zine',
    subtitle: 'Radical print zine aesthetic with highlighter lime/orange accents, sticker badges & tilted headers',
    category: 'bold',
    categoryLabel: 'Bold Experimental Print',
    icon: Zap,
    accentColor: '#ccff00',
    bgGradient: 'from-lime-950/60 via-black to-orange-950/60',
    tags: ['Marquee Ticker', 'Tilted Cards', 'Tape Overlays', 'Cassette Bar'],
  },
  {
    id: 'concept20_spatial',
    num: 20,
    name: 'Concept 20',
    title: 'Spatial Horizon 3D',
    subtitle: 'Spatial UI with 3D stacked depth layering, floating orbital rings & deep space carousel',
    category: 'bold',
    categoryLabel: 'Bold Spatial 3D',
    icon: Orbit,
    accentColor: '#6366f1',
    bgGradient: 'from-indigo-950/80 via-slate-900 to-teal-950/40',
    tags: ['3D Perspective', 'Orbital Rings', 'Curved Control Arc', 'Spatial Horizon'],
  },
  {
    id: 'concept11_neumorphic',
    num: 11,
    name: 'Concept 11',
    title: 'Radar Sonar Hub',
    subtitle: 'Concentric sonar rings (30%, 60%, 90% match scores) with locked target reticles & sweeper controls',
    category: 'bold',
    categoryLabel: 'Bold Telemetry',
    icon: Sliders,
    accentColor: '#10b981',
    bgGradient: 'from-emerald-950/80 via-slate-950 to-teal-950/60',
    tags: ['Circular Sonar', 'Target Lock', 'Frequency Sweeper', 'Radar Blips'],
  },
  {
    id: 'concept12_cyberpunk',
    num: 12,
    name: 'Concept 12',
    title: 'Cyber Deck Matrix REPL',
    subtitle: 'High-tech telemetry console with neon yellow/cyan accents, matrix code cascade & HUD telemetry',
    category: 'bold',
    categoryLabel: 'Bold Cybernetic',
    icon: Radio,
    accentColor: '#00f0ff',
    bgGradient: 'from-cyan-950/80 via-black to-yellow-950/40',
    tags: ['Matrix Code Stream', 'Holographic HUD', 'Command REPL', 'Vector Telemetry'],
  },
  {
    id: 'concept13_blueprint',
    num: 13,
    name: 'Concept 13',
    title: 'CAD Blueprint Canvas',
    subtitle: 'Engineering blueprint on deep navy with cyan grid lines, millimeter rulers & dimension callouts',
    category: 'bold',
    categoryLabel: 'Bold Technical Drafting',
    icon: Compass,
    accentColor: '#38bdf8',
    bgGradient: 'from-blue-950 via-cyan-950/60 to-slate-900',
    tags: ['Millimeter Rulers', 'Dimension Callouts', 'CAD Title Block', 'Cyan Grid'],
  },
  {
    id: 'concept14_frostglass',
    num: 14,
    name: 'Concept 14',
    title: 'Frost Glass Studio',
    subtitle: 'Premium frosted obsidian glass system with ambient glowing color orbs & multi-layered depth',
    category: 'bold',
    categoryLabel: 'Bold Glassmorphism',
    icon: Eye,
    accentColor: '#c084fc',
    bgGradient: 'from-purple-950/80 via-slate-950 to-sky-950/60',
    tags: ['Frosted Obsidian', 'Ambient Glow Orbs', 'Translucent Pills', 'Multi-Layered'],
  },
  {
    id: 'concept15_bento',
    num: 15,
    name: 'Concept 15',
    title: 'Bento Tile Matrix',
    subtitle: 'Apple/Vercel-inspired asymmetric modular bento box grid with 6 distinct tile aspect ratios',
    category: 'bold',
    categoryLabel: 'Bold Modular Bento',
    icon: Box,
    accentColor: '#34d399',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
    tags: ['Asymmetric Grid', 'Hero Feature Tile', 'Dial Gauge Tile', 'Rate Metric Tile'],
  },

  // Foundational & Editorial (1-10)
  {
    id: 'concept1_precision',
    num: 1,
    name: 'Concept 1',
    title: 'Precision Workbench',
    subtitle: 'Keyboard-first operational view with split-pane inspections, high density & command palette (⌘K)',
    category: 'foundational',
    categoryLabel: 'Foundational Functional',
    icon: Terminal,
    accentColor: '#38bdf8',
    bgGradient: 'from-slate-900 via-slate-950 to-sky-950/40',
    tags: ['Keyboard-First', 'Command Palette ⌘K', 'Split-Pane', 'Inspector Panel'],
  },
  {
    id: 'concept2_editorial',
    num: 2,
    name: 'Concept 2',
    title: 'Editorial Studio',
    subtitle: 'Modern luxe design system with warm alabaster tones, serif typography & narrative match stories',
    category: 'foundational',
    categoryLabel: 'Foundational Editorial',
    icon: BookOpen,
    accentColor: '#f59e0b',
    bgGradient: 'from-amber-950/40 via-stone-900 to-neutral-900',
    tags: ['Instrument Serif', 'Warm Alabaster', 'Story Narratives', 'Magazine Spread'],
  },
  {
    id: 'concept3_matrix',
    num: 3,
    name: 'Concept 3',
    title: 'Graph Match Matrix',
    subtitle: 'Deep obsidian intelligence center with live algorithm switcher (Hybrid/Semantic/Keyword) & heatmaps',
    category: 'foundational',
    categoryLabel: 'Foundational Analytical',
    icon: Cpu,
    accentColor: '#818cf8',
    bgGradient: 'from-indigo-950 via-slate-900 to-blue-950/50',
    tags: ['Obsidian Theme', 'Algorithm Switcher', 'Skill Heatmap', 'Vector Diagnostics'],
  },
  {
    id: 'concept4_splitcanvas',
    num: 4,
    name: 'Concept 4',
    title: 'Adaptive Split-Canvas',
    subtitle: 'Minimalist Scandinavian dual-pane master-detail layout with sliding focus inspection drawer',
    category: 'foundational',
    categoryLabel: 'Foundational Minimal',
    icon: Columns,
    accentColor: '#64748b',
    bgGradient: 'from-slate-900 via-slate-950 to-neutral-900',
    tags: ['Scandinavian Minimal', 'Dual-Pane Master', 'Focus Drawer', 'Clean Neutral'],
  },
  {
    id: 'concept5_enterprise',
    num: 5,
    name: 'Concept 5',
    title: 'Enterprise Grid',
    subtitle: 'Industrial-strength financial data grid with side-by-side candidate comparison tray & JSON inspector',
    category: 'foundational',
    categoryLabel: 'Foundational Enterprise',
    icon: Grid,
    accentColor: '#60a5fa',
    bgGradient: 'from-blue-950/60 via-slate-900 to-slate-950',
    tags: ['Tabular Data Grid', '3-Candidate Tray', 'JSON Inspector', 'Dense Controls'],
  },
  {
    id: 'concept6_terminal',
    num: 6,
    name: 'Concept 6',
    title: 'Terminal Noir',
    subtitle: 'Retro phosphor-green CLI aesthetic with command prompt, ASCII boxes & scanlines',
    category: 'foundational',
    categoryLabel: 'Foundational Retro CLI',
    icon: Terminal,
    accentColor: '#00ff41',
    bgGradient: 'from-green-950/80 via-black to-slate-950',
    tags: ['Phosphor Green', 'ASCII Box Borders', 'Interactive CLI', 'Scanline Effect'],
  },
  {
    id: 'concept7_broadsheet',
    num: 7,
    name: 'Concept 7',
    title: 'Broadsheet Journal',
    subtitle: 'Classic newspaper typography with "above the fold" lead story, classifieds grid & print flourishes',
    category: 'foundational',
    categoryLabel: 'Foundational Print',
    icon: BookOpen,
    accentColor: '#d97706',
    bgGradient: 'from-amber-950/50 via-stone-900 to-neutral-950',
    tags: ['Broadsheet Newspaper', 'Drop Caps', 'Classifieds Grid', 'Decorative Ornaments'],
  },
  {
    id: 'concept8_brutalist',
    num: 8,
    name: 'Concept 8',
    title: 'Brutalist Canvas',
    subtitle: 'High contrast stark brutalist design with 3px solid black borders, electric red & giant text-6xl scores',
    category: 'foundational',
    categoryLabel: 'Foundational Brutalist',
    icon: Columns,
    accentColor: '#ff0000',
    bgGradient: 'from-red-950/60 via-black to-neutral-900',
    tags: ['Stark Black/White/Red', '3px Solid Borders', 'Giant Numbers', 'Zero Border-Radius'],
  },
  {
    id: 'concept9_aurora',
    num: 9,
    name: 'Concept 9',
    title: 'Aurora Dark',
    subtitle: 'Sophisticated charcoal dark mode with subtle animated violet-teal aurora accents & ghost skill tags',
    category: 'foundational',
    categoryLabel: 'Foundational Modern Dark',
    icon: Sparkles,
    accentColor: '#a855f7',
    bgGradient: 'from-purple-950/70 via-slate-900 to-teal-950/40',
    tags: ['Aurora Gradient', 'Charcoal Dark', 'Ghost Skill Tags', 'Subtle Depth'],
  },
  {
    id: 'concept10_kanban',
    num: 10,
    name: 'Concept 10',
    title: 'Kanban Pipeline',
    subtitle: 'Board-based horizontal scrolling pipeline with drag-and-move stages & applicant cards',
    category: 'foundational',
    categoryLabel: 'Foundational Pipeline',
    icon: Grid,
    accentColor: '#0284c7',
    bgGradient: 'from-sky-950/60 via-slate-900 to-slate-950',
    tags: ['Horizontal Kanban', 'Stage Columns', 'Status Flow', 'Card Pipeline'],
  },
];

interface Props {
  activeRole: UserRole;
  onSelectConcept: (conceptId: ConceptMode) => void;
}

export const ConceptHub: React.FC<Props> = ({ activeRole, onSelectConcept }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'visionary' | 'bold' | 'foundational'>('all');
  const [hoveredConceptId, setHoveredConceptId] = useState<ConceptMode | null>(null);

  const filteredConcepts = CONCEPTS_LIST.filter(c => {
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleRandomConcept = () => {
    const randomIndex = Math.floor(Math.random() * CONCEPTS_LIST.length);
    const chosen = CONCEPTS_LIST[randomIndex];
    if (chosen) onSelectConcept(chosen.id);
  };

  const hoveredConcept = CONCEPTS_LIST.find(c => c.id === hoveredConceptId);

  return (
    <div className="min-h-screen bg-[#05070e] text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-24">

      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-[#05070e] px-4 py-12 sm:px-6 lg:px-8">

        {/* Ambient Glows */}
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-sky-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-400 mb-4 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>25 High-Fidelity Frontend Concepts Suite</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Frontend Concepts <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400">Directory</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-400">
                Explore 25 radically distinct visual, layout, and UX paradigms designed for GigMatch AI. Every concept features custom architecture, realistic mock data, and multi-role workflows.
              </p>
            </div>

            {/* Quick Stats & Shuffle */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-center">
                <div className="text-2xl font-black text-white">25</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unique Concepts</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-center">
                <div className="text-2xl font-black text-sky-400">3</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role Views</div>
              </div>

              <button
                onClick={handleRandomConcept}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-4 text-xs font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-indigo-500 transition-all transform hover:scale-[1.02]"
              >
                <Shuffle className="h-4 w-4" />
                <span>Surprise Me</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-3 shadow-xl backdrop-blur-xl">

            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search concepts by name, layout, or style..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-slate-950/80 border border-slate-800 pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeCategory === 'all'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All (25)
              </button>

              <button
                onClick={() => setActiveCategory('visionary')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeCategory === 'visionary'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Visionary (21–25)
              </button>

              <button
                onClick={() => setActiveCategory('bold')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeCategory === 'bold'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Bold & Grounded (11–20)
              </button>

              <button
                onClick={() => setActiveCategory('foundational')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeCategory === 'foundational'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Foundational (1–10)
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Main Directory Grid */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-sky-400" />
            <span>Concepts Showcase</span>
            <span className="text-xs text-slate-400 font-normal">({filteredConcepts.length} concepts matched)</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Hover over any concept for Live Mini-Viewport Preview</span>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConcepts.map((concept) => {
            const IconComponent = concept.icon;
            const isHovered = hoveredConceptId === concept.id;

            return (
              <div
                key={concept.id}
                onMouseEnter={() => setHoveredConceptId(concept.id)}
                onMouseLeave={() => setHoveredConceptId(null)}
                onClick={() => onSelectConcept(concept.id)}
                className={`group relative rounded-3xl border bg-gradient-to-br ${concept.bgGradient} p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl ${
                  isHovered
                    ? 'border-sky-400/80 shadow-[0_0_30px_rgba(56,189,248,0.2)] transform -translate-y-1.5'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Number Badge & Category */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white shadow-md"
                        style={{ backgroundColor: `${concept.accentColor}25`, borderColor: `${concept.accentColor}50`, borderWidth: 1 }}
                      >
                        <IconComponent className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-white/90">
                        {concept.name}
                      </span>
                    </div>

                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: `${concept.accentColor}15`,
                        borderColor: `${concept.accentColor}40`,
                        color: concept.accentColor
                      }}
                    >
                      {concept.categoryLabel.split(' ')[0]}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-extrabold text-white group-hover:text-sky-300 transition-colors leading-tight">
                    {concept.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-300/80 leading-relaxed line-clamp-2 font-normal">
                    {concept.subtitle}
                  </p>

                  {/* Tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {concept.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-slate-950/60 border border-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Live Mini Viewport Preview on Hover OR Static Action */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>Launch Concept</span>
                    <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </span>

                  <span className="text-[10px] font-mono text-slate-500">#{concept.num.toString().padStart(2, '0')}</span>
                </div>

                {/* LIVE MINI VIEWPORT CARD (Rendered on Hover) */}
                {isHovered && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-between z-20 animate-in fade-in zoom-in-95 duration-200 border-2 border-sky-400 rounded-3xl">

                    {/* Mini Viewport Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">Live Viewport // #{concept.num}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{concept.categoryLabel}</span>
                    </div>

                    {/* Miniature UI Snapshot Simulation */}
                    <div className="my-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex-1 flex flex-col justify-center space-y-2 overflow-hidden text-[10px] font-mono">

                      {/* Concept-Specific Miniature Snapshots */}
                      {concept.num === 21 && (
                        <div className="space-y-1.5 text-indigo-300">
                          <div className="flex justify-between items-center text-[9px] text-indigo-400">
                            <span>★ DEEP SPACE STAR GRAPH</span>
                            <span className="font-bold">96% SYNERGY</span>
                          </div>
                          <div className="h-10 bg-indigo-950/80 rounded-xl border border-indigo-500/40 p-2 flex items-center justify-around">
                            <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                            <div className="h-0.5 w-8 bg-indigo-400/60" />
                            <div className="h-3 w-3 rounded-full bg-indigo-400 shadow-[0_0_10px_indigo]" />
                            <div className="h-0.5 w-8 bg-purple-400/60" />
                            <div className="h-2 w-2 rounded-full bg-sky-300" />
                          </div>
                        </div>
                      )}

                      {concept.num === 22 && (
                        <div className="space-y-1 text-orange-300">
                          <div className="flex justify-between text-[9px] text-orange-400">
                            <span>● VINYL TURNTABLE</span>
                            <span>94 BPM MATCH</span>
                          </div>
                          <div className="h-10 bg-stone-900 rounded-xl border border-orange-500/40 p-1 flex items-center justify-between px-3">
                            <div className="h-7 w-7 rounded-full bg-black border-2 border-orange-500 flex items-center justify-center animate-spin">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                            </div>
                            <div className="text-[8px] text-stone-300">TRACK // SIDE A</div>
                          </div>
                        </div>
                      )}

                      {concept.num === 23 && (
                        <div className="space-y-1 text-red-400">
                          <div className="flex justify-between text-[9px] font-black text-yellow-400">
                            <span>P1: FREELANCER</span>
                            <span>BOSS: GIGMATCH</span>
                          </div>
                          <div className="h-2 bg-slate-950 border border-white p-0.5 flex">
                            <div className="h-full bg-gradient-to-r from-red-500 to-yellow-400 w-3/4" />
                          </div>
                          <div className="text-center font-black text-white text-[10px]">94 POWER LEVEL</div>
                        </div>
                      )}

                      {concept.num === 24 && (
                        <div className="space-y-1 text-emerald-400">
                          <div className="flex justify-between text-[9px] text-slate-400">
                            <span>GIG_TICKER &lt;GO&gt;</span>
                            <span className="text-emerald-400">+1.24% ▲</span>
                          </div>
                          <div className="h-8 bg-black border border-emerald-500/40 p-1.5 flex items-center justify-between">
                            <span className="font-bold text-white">INDEX 94.00</span>
                            <span className="bg-emerald-500 text-black px-1.5 py-0.5 font-bold text-[8px]">BUY</span>
                          </div>
                        </div>
                      )}

                      {concept.num === 25 && (
                        <div className="space-y-1 text-pink-300">
                          <div className="flex justify-between text-[9px]">
                            <span>GIG REELS SWIPE</span>
                            <span className="bg-white/20 px-1 rounded">94% MATCH</span>
                          </div>
                          <div className="h-8 bg-purple-950/60 rounded-xl border border-pink-500/40 p-1.5 flex items-center justify-between text-[8px]">
                            <span>Swipe Up to Apply</span>
                            <span className="text-pink-400 font-bold">♥</span>
                          </div>
                        </div>
                      )}

                      {/* Generic miniature for concepts 1-20 */}
                      {concept.num < 21 && (
                        <div className="space-y-1.5 text-slate-300">
                          <div className="flex justify-between text-[9px] text-sky-400">
                            <span className="font-bold">{concept.title}</span>
                            <span className="font-bold">94% Match</span>
                          </div>
                          <div className="h-8 bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-between text-[8px]">
                            <span className="text-slate-400 truncate">{concept.tags.join(' · ')}</span>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Launch Action Button in Hover Box */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectConcept(concept.id);
                      }}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/30 transition-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Fullscreen Concept #{concept.num}</span>
                    </button>

                  </div>
                )}

              </div>
            );
          })}
        </div>

      </main>

    </div>
  );
};
