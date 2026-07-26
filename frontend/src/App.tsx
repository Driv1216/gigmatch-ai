import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicantInboxPage } from "./pages/ApplicantInboxPage";
import { ApplyToGigPage } from "./pages/ApplyToGigPage";
import { ClientDashboardPage } from "./pages/ClientDashboardPage";
import { ClientApplicantDetailPage } from "./pages/ClientApplicantDetailPage";
import { ClientProfilePage } from "./pages/ClientProfilePage";
import { EditGigPage } from "./pages/EditGigPage";
import { EditApplicationPage } from "./pages/EditApplicationPage";
import { EngagementListPage } from "./pages/EngagementListPage";
import { EngagementWorkspacePage } from "./pages/EngagementWorkspacePage";
import { FreelancerDashboardPage } from "./pages/FreelancerDashboardPage";
import { FreelancerProfilePage } from "./pages/FreelancerProfilePage";
import { GigParsePage } from "./pages/GigParsePage";
import { GigDetailPage } from "./pages/GigDetailPage";
import { GigDiscoveryPage } from "./pages/GigDiscoveryPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ManageGigsPage } from "./pages/ManageGigsPage";
import { MyApplicationsPage } from "./pages/MyApplicationsPage";
import { NewGigPage } from "./pages/NewGigPage";
import { ResumeParsePage } from "./pages/ResumeParsePage";
import { SignupPage } from "./pages/SignupPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard/freelancer"
          element={
            <ProtectedRoute allowedRole="freelancer">
              <FreelancerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/freelancer"
          element={
            <ProtectedRoute allowedRole="freelancer">
              <FreelancerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/resume-parse"
          element={
            <ProtectedRoute allowedRole="freelancer">
              <ResumeParsePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/client"
          element={
            <ProtectedRoute allowedRole="client">
              <ClientDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/client"
          element={
            <ProtectedRoute allowedRole="client">
              <ClientProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/new"
          element={
            <ProtectedRoute allowedRole="client">
              <NewGigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs"
          element={
            <ProtectedRoute allowedRole="freelancer">
              <GigDiscoveryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/:gigId"
          element={
            <ProtectedRoute allowedRoles={["freelancer", "client", "admin"]}>
              <GigDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/:gigId/apply"
          element={<ProtectedRoute allowedRole="freelancer"><ApplyToGigPage /></ProtectedRoute>}
        />
        <Route
          path="/gigs/:gigId/applicants"
          element={<ProtectedRoute allowedRole="client"><ApplicantInboxPage /></ProtectedRoute>}
        />
        <Route
          path="/gigs/:gigId/applicants/:applicationId"
          element={<ProtectedRoute allowedRole="client"><ClientApplicantDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/applications"
          element={<ProtectedRoute allowedRole="freelancer"><MyApplicationsPage /></ProtectedRoute>}
        />
        <Route
          path="/applications/:applicationId"
          element={<ProtectedRoute allowedRole="freelancer"><ApplicationDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/applications/:applicationId/edit"
          element={<ProtectedRoute allowedRole="freelancer"><EditApplicationPage /></ProtectedRoute>}
        />
        <Route
          path="/engagements"
          element={<ProtectedRoute allowedRoles={["freelancer", "client"]}><EngagementListPage /></ProtectedRoute>}
        />
        <Route
          path="/engagements/:engagementId"
          element={<ProtectedRoute allowedRoles={["freelancer", "client"]}><EngagementWorkspacePage /></ProtectedRoute>}
        />
        <Route
          path="/gigs/manage"
          element={
            <ProtectedRoute allowedRole="client">
              <ManageGigsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/:id/edit"
          element={
            <ProtectedRoute allowedRole="client">
              <EditGigPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gigs/:id/parse"
          element={
            <ProtectedRoute allowedRole="client">
              <GigParsePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
