import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { participantShellOwnsPath } from "../lib/participantNavigation";
import { stageElevenOwnsPublicPath } from "../lib/publicNavigation";
import { ParticipantShell } from "./ParticipantShell";
import { PublicShell } from "./PublicShell";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const { role } = useAuth();
  const location = useLocation();
  const participantRole = role === "freelancer" || role === "client" ? role : null;

  if (participantRole && participantShellOwnsPath(location.pathname)) {
    return <ParticipantShell role={participantRole}>{children}</ParticipantShell>;
  }

  if (stageElevenOwnsPublicPath(location.pathname)) {
    return <PublicShell>{children}</PublicShell>;
  }

  if (location.pathname === "/dashboard/admin") {
    return <>{children}</>;
  }

  return <>{children}</>;
}
