import { lazy, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LazyPageBoundary } from "./components/LazyPageBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const ApplicantInboxPage = lazy(() => import("./pages/ApplicantInboxPage").then((module) => ({ default: module.ApplicantInboxPage })));
const ApplicationDetailPage = lazy(() => import("./pages/ApplicationDetailPage").then((module) => ({ default: module.ApplicationDetailPage })));
const ApplyToGigPage = lazy(() => import("./pages/ApplyToGigPage").then((module) => ({ default: module.ApplyToGigPage })));
const ClientApplicantDetailPage = lazy(() => import("./pages/ClientApplicantDetailPage").then((module) => ({ default: module.ClientApplicantDetailPage })));
const ClientDashboardPage = lazy(() => import("./pages/ClientDashboardPage").then((module) => ({ default: module.ClientDashboardPage })));
const ClientProfilePage = lazy(() => import("./pages/ClientProfilePage").then((module) => ({ default: module.ClientProfilePage })));
const EditApplicationPage = lazy(() => import("./pages/EditApplicationPage").then((module) => ({ default: module.EditApplicationPage })));
const EditGigPage = lazy(() => import("./pages/EditGigPage").then((module) => ({ default: module.EditGigPage })));
const EngagementListPage = lazy(() => import("./pages/EngagementListPage").then((module) => ({ default: module.EngagementListPage })));
const EngagementWorkspacePage = lazy(() => import("./pages/EngagementWorkspacePage").then((module) => ({ default: module.EngagementWorkspacePage })));
const FreelancerDashboardPage = lazy(() => import("./pages/FreelancerDashboardPage").then((module) => ({ default: module.FreelancerDashboardPage })));
const FreelancerProfilePage = lazy(() => import("./pages/FreelancerProfilePage").then((module) => ({ default: module.FreelancerProfilePage })));
const GigDetailPage = lazy(() => import("./pages/GigDetailPage").then((module) => ({ default: module.GigDetailPage })));
const GigDiscoveryPage = lazy(() => import("./pages/GigDiscoveryPage").then((module) => ({ default: module.GigDiscoveryPage })));
const GigParsePage = lazy(() => import("./pages/GigParsePage").then((module) => ({ default: module.GigParsePage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const ManageGigsPage = lazy(() => import("./pages/ManageGigsPage").then((module) => ({ default: module.ManageGigsPage })));
const MyApplicationsPage = lazy(() => import("./pages/MyApplicationsPage").then((module) => ({ default: module.MyApplicationsPage })));
const NewGigPage = lazy(() => import("./pages/NewGigPage").then((module) => ({ default: module.NewGigPage })));
const ResumeParsePage = lazy(() => import("./pages/ResumeParsePage").then((module) => ({ default: module.ResumeParsePage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((module) => ({ default: module.SignupPage })));

function page(node: ReactNode) {
  return <LazyPageBoundary>{node}</LazyPageBoundary>;
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={page(<LandingPage />)} />
        <Route path="/login" element={page(<LoginPage />)} />
        <Route path="/signup" element={page(<SignupPage />)} />
        <Route path="/dashboard/freelancer" element={<ProtectedRoute allowedRole="freelancer">{page(<FreelancerDashboardPage />)}</ProtectedRoute>} />
        <Route path="/profile/freelancer" element={<ProtectedRoute allowedRole="freelancer">{page(<FreelancerProfilePage />)}</ProtectedRoute>} />
        <Route path="/profile/resume-parse" element={<ProtectedRoute allowedRole="freelancer">{page(<ResumeParsePage />)}</ProtectedRoute>} />
        <Route path="/dashboard/client" element={<ProtectedRoute allowedRole="client">{page(<ClientDashboardPage />)}</ProtectedRoute>} />
        <Route path="/profile/client" element={<ProtectedRoute allowedRole="client">{page(<ClientProfilePage />)}</ProtectedRoute>} />
        <Route path="/gigs/new" element={<ProtectedRoute allowedRole="client">{page(<NewGigPage />)}</ProtectedRoute>} />
        <Route path="/gigs" element={<ProtectedRoute allowedRole="freelancer">{page(<GigDiscoveryPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:gigId" element={<ProtectedRoute allowedRoles={["freelancer", "client", "admin"]}>{page(<GigDetailPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:gigId/apply" element={<ProtectedRoute allowedRole="freelancer">{page(<ApplyToGigPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:gigId/applicants" element={<ProtectedRoute allowedRole="client">{page(<ApplicantInboxPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:gigId/applicants/:applicationId" element={<ProtectedRoute allowedRole="client">{page(<ClientApplicantDetailPage />)}</ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute allowedRole="freelancer">{page(<MyApplicationsPage />)}</ProtectedRoute>} />
        <Route path="/applications/:applicationId" element={<ProtectedRoute allowedRole="freelancer">{page(<ApplicationDetailPage />)}</ProtectedRoute>} />
        <Route path="/applications/:applicationId/edit" element={<ProtectedRoute allowedRole="freelancer">{page(<EditApplicationPage />)}</ProtectedRoute>} />
        <Route path="/engagements" element={<ProtectedRoute allowedRoles={["freelancer", "client"]}>{page(<EngagementListPage />)}</ProtectedRoute>} />
        <Route path="/engagements/:engagementId" element={<ProtectedRoute allowedRoles={["freelancer", "client"]}>{page(<EngagementWorkspacePage />)}</ProtectedRoute>} />
        <Route path="/gigs/manage" element={<ProtectedRoute allowedRole="client">{page(<ManageGigsPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:id/edit" element={<ProtectedRoute allowedRole="client">{page(<EditGigPage />)}</ProtectedRoute>} />
        <Route path="/gigs/:id/parse" element={<ProtectedRoute allowedRole="client">{page(<GigParsePage />)}</ProtectedRoute>} />
        <Route path="/dashboard/admin" element={<ProtectedRoute allowedRole="admin">{page(<AdminDashboardPage />)}</ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
