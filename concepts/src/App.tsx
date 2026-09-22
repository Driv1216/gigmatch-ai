import React, { useState } from 'react';
import { ConceptMode, UserRole, Gig, Application, FreelancerProfile, EvaluationBenchmark } from './types';
import { INITIAL_GIGS, INITIAL_FREELANCERS, INITIAL_APPLICATIONS, BENCHMARK_EVALUATIONS } from './mockData';
import { ConceptSwitcher } from './components/ConceptSwitcher';
import { ConceptHub } from './components/ConceptHub';

import { PrecisionWorkbench } from './concepts/concept1_precision/PrecisionWorkbench';
import { EditorialStudio } from './concepts/concept2_editorial/EditorialStudio';
import { GraphMatrix } from './concepts/concept3_matrix/GraphMatrix';
import { SplitCanvas } from './concepts/concept4_splitcanvas/SplitCanvas';
import { EnterpriseGrid } from './concepts/concept5_enterprise/EnterpriseGrid';
import { TerminalNoir } from './concepts/concept6_terminal/TerminalNoir';
import { Broadsheet } from './concepts/concept7_broadsheet/Broadsheet';
import { AuroraDark } from './concepts/concept9_aurora/AuroraDark';
import { BrutalistStack } from './concepts/concept8_brutalist/BrutalistStack';
import { KanbanPipeline } from './concepts/concept10_kanban/KanbanPipeline';
import { SoftNeumorphic } from './concepts/concept11_neumorphic/SoftNeumorphic';
import { CyberpunkDeck } from './concepts/concept12_cyberpunk/CyberpunkDeck';
import { BlueprintSchematic } from './concepts/concept13_blueprint/BlueprintSchematic';
import { FrostGlass } from './concepts/concept14_frostglass/FrostGlass';
import { BentoGrid } from './concepts/concept15_bento/BentoGrid';
import { SwissGrid } from './concepts/concept16_swiss/SwissGrid';
import { ComplianceLedger } from './concepts/concept17_compliance/ComplianceLedger';
import { RetroOSDesktop } from './concepts/concept18_retro_os/RetroOSDesktop';
import { AcidZine } from './concepts/concept19_acid_zine/AcidZine';
import { SpatialHorizon } from './concepts/concept20_spatial/SpatialHorizon';
import { Concept21Constellation } from './concepts/concept21_constellation/Concept21Constellation';
import { Concept22Vinyl } from './concepts/concept22_vinyl/Concept22Vinyl';
import { Concept23Arcade } from './concepts/concept23_arcade/Concept23Arcade';
import { Concept24Trading } from './concepts/concept24_trading/Concept24Trading';
import { Concept25Reel } from './concepts/concept25_reel/Concept25Reel';

export function App() {
  const [activeConcept, setActiveConcept] = useState<ConceptMode>('concept1_precision');
  const [activeRole, setActiveRole] = useState<UserRole>('freelancer');

  // Shared state across all concepts
  const [gigs, setGigs] = useState<Gig[]>(INITIAL_GIGS);
  const [freelancers] = useState<FreelancerProfile[]>(INITIAL_FREELANCERS);
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [benchmarks] = useState<EvaluationBenchmark[]>(BENCHMARK_EVALUATIONS);

  const handleUpdateAppStatus = (appId: string, newStatus: Application['status']) => {
    setApplications(prev => prev.map(app =>
      app.id === appId ? { ...app, status: newStatus } : app
    ));
  };

  const handlePostGig = (newGigPartial: Partial<Gig>) => {
    const newGig: Gig = {
      id: `gig-${Date.now()}`,
      title: newGigPartial.title || 'Untitled Opportunity',
      client_id: 'c-301',
      client_name: 'Sarah Jenkins',
      client_company: newGigPartial.client_company || 'Vanguard Labs',
      client_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      client_industry: 'Technology',
      category: 'Software Engineering',
      description: newGigPartial.description || 'Full-stack engineering engagement focusing on high performance.',
      required_skills: newGigPartial.required_skills || ['React', 'TypeScript', 'FastAPI'],
      budget_min: newGigPartial.budget_min || 80,
      budget_max: newGigPartial.budget_max || 120,
      payment_type: 'hourly',
      work_mode: newGigPartial.work_mode || 'Remote',
      location: 'Remote',
      application_deadline: '2026-09-01T23:59:59Z',
      posted_date: new Date().toISOString(),
      status: 'open',
      total_applicants: 0,
      match_breakdown: {
        overall_score: 92,
        keyword_score: 90,
        semantic_score: 94,
        skill_coverage_pct: 100,
        matching_skills: newGigPartial.required_skills || ['React', 'TypeScript'],
        missing_skills: [],
        experience_fit: 'Exact',
        justification: 'Newly posted gig automatically evaluated against active profile skills.',
      },
    };

    setGigs([newGig, ...gigs]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ConceptSwitcher
        activeConcept={activeConcept}
        setActiveConcept={setActiveConcept}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
      />

      <div className="flex-1">
        {activeConcept === 'concept_hub' && (
          <ConceptHub
            activeRole={activeRole}
            onSelectConcept={setActiveConcept}
          />
        )}

        {activeConcept === 'concept1_precision' && (
          <PrecisionWorkbench
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept2_editorial' && (
          <EditorialStudio
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept3_matrix' && (
          <GraphMatrix
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept4_splitcanvas' && (
          <SplitCanvas
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept5_enterprise' && (
          <EnterpriseGrid
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept6_terminal' && (
          <TerminalNoir
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept7_broadsheet' && (
          <Broadsheet
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept8_brutalist' && (
          <BrutalistStack
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept9_aurora' && (
          <AuroraDark
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept10_kanban' && (
          <KanbanPipeline
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept11_neumorphic' && (
          <SoftNeumorphic
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept12_cyberpunk' && (
          <CyberpunkDeck
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept13_blueprint' && (
          <BlueprintSchematic
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept14_frostglass' && (
          <FrostGlass
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept15_bento' && (
          <BentoGrid
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept16_swiss' && (
          <SwissGrid
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept17_compliance' && (
          <ComplianceLedger
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept18_retro_os' && (
          <RetroOSDesktop
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept19_acid_zine' && (
          <AcidZine
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept20_spatial' && (
          <SpatialHorizon
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept21_constellation' && (
          <Concept21Constellation
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept22_vinyl' && (
          <Concept22Vinyl
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept23_arcade' && (
          <Concept23Arcade
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept24_trading' && (
          <Concept24Trading
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}

        {activeConcept === 'concept25_reel' && (
          <Concept25Reel
            role={activeRole}
            gigs={gigs}
            freelancers={freelancers}
            applications={applications}
            benchmarks={benchmarks}
            onUpdateAppStatus={handleUpdateAppStatus}
            onPostGig={handlePostGig}
          />
        )}
      </div>
    </div>
  );
}
