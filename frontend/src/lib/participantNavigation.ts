export type ParticipantRole = "freelancer" | "client";

export type ParticipantDestination = {
  id: string;
  label: string;
  description: string;
  to: string;
  keywords: string[];
  primary: boolean;
};

export type ParticipantShortcut = "open" | "close" | null;

type ParticipantShortcutInput = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  editableTarget: boolean;
  dialogOwnsKeyboard: boolean;
  commandOpen: boolean;
};

const destinations: Record<ParticipantRole, ParticipantDestination[]> = {
  freelancer: [
    {
      id: "freelancer-dashboard",
      label: "Dashboard",
      description: "Open your current marketplace workflow",
      to: "/dashboard/freelancer",
      keywords: ["home", "workflow", "overview"],
      primary: true,
    },
    {
      id: "find-gigs",
      label: "Find Gigs",
      description: "Browse available gig opportunities",
      to: "/gigs",
      keywords: ["market", "discover", "opportunities"],
      primary: true,
    },
    {
      id: "applications",
      label: "Applications",
      description: "Open your submitted applications",
      to: "/applications",
      keywords: ["proposals", "submissions", "my applications"],
      primary: true,
    },
    {
      id: "freelancer-engagements",
      label: "Engagements",
      description: "Open your current engagements",
      to: "/engagements",
      keywords: ["workspaces", "work", "active"],
      primary: true,
    },
    {
      id: "freelancer-profile",
      label: "Freelancer Profile",
      description: "Review your professional profile",
      to: "/profile/freelancer",
      keywords: ["identity", "account", "skills"],
      primary: false,
    },
    {
      id: "resume-parse",
      label: "Resume Review",
      description: "Open the existing resume review workflow",
      to: "/profile/resume-parse",
      keywords: ["cv", "parse", "profile input"],
      primary: false,
    },
  ],
  client: [
    {
      id: "client-dashboard",
      label: "Dashboard",
      description: "Open your current hiring workflow",
      to: "/dashboard/client",
      keywords: ["home", "workflow", "overview"],
      primary: true,
    },
    {
      id: "manage-gigs",
      label: "Manage Gigs",
      description: "Review and manage your gigs",
      to: "/gigs/manage",
      keywords: ["gigs", "briefs", "open gigs"],
      primary: true,
    },
    {
      id: "client-engagements",
      label: "Engagements",
      description: "Open your current engagements",
      to: "/engagements",
      keywords: ["workspaces", "work", "active"],
      primary: true,
    },
    {
      id: "create-gig",
      label: "Create Gig",
      description: "Open the existing gig creation workflow",
      to: "/gigs/new",
      keywords: ["new gig", "post", "publish"],
      primary: true,
    },
    {
      id: "client-profile",
      label: "Client Profile",
      description: "Review your client profile",
      to: "/profile/client",
      keywords: ["identity", "account", "company"],
      primary: false,
    },
  ],
};

export function participantDestinations(role: ParticipantRole): ParticipantDestination[] {
  return destinations[role];
}

export function participantPrimaryNavigation(role: ParticipantRole): ParticipantDestination[] {
  return destinations[role].filter((destination) => destination.primary);
}

export function filterParticipantDestinations(
  role: ParticipantRole,
  query: string,
): ParticipantDestination[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return destinations[role];

  return destinations[role].filter((destination) => {
    const searchable = [
      destination.label,
      destination.description,
      destination.to,
      ...destination.keywords,
    ].join(" ").toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

export function participantShellOwnsPath(pathname: string): boolean {
  return pathname === "/dashboard/freelancer"
    || pathname === "/dashboard/client"
    || participantStageTwoOwnsPath(pathname)
    || participantStageThreeOwnsPath(pathname)
    || participantStageFourOwnsPath(pathname)
    || participantStageFiveOwnsPath(pathname)
    || participantStageEightOwnsPath(pathname)
    || participantStageTenOwnsPath(pathname);
}

export function participantStageTwoOwnsPath(pathname: string): boolean {
  if (pathname === "/gigs") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "gigs" || ["new", "manage"].includes(segments[1] ?? "")) return false;
  return segments.length === 2 || (segments.length === 3 && segments[2] === "apply");
}

export function participantStageThreeOwnsPath(pathname: string): boolean {
  if (pathname === "/gigs/new" || pathname === "/gigs/manage") return true;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 3
    && segments[0] === "gigs"
    && !["new", "manage"].includes(segments[1] ?? "")
    && segments[2] === "edit";
}

export function participantStageFourOwnsPath(pathname: string): boolean {
  if (pathname === "/applications") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "applications" || !segments[1]) return false;
  return segments.length === 2
    || (segments.length === 3 && segments[2] === "edit");
}

export function participantStageFiveOwnsPath(pathname: string): boolean {
  if (pathname.length > 1 && pathname.endsWith("/")) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3 && segments.length !== 4) return false;
  return segments[0] === "gigs"
    && Boolean(segments[1])
    && !["new", "manage"].includes(segments[1])
    && segments[2] === "applicants"
    && (segments.length === 3 || Boolean(segments[3]));
}

export function participantStageEightOwnsPath(pathname: string): boolean {
  if (pathname.length > 1 && pathname.endsWith("/")) return false;
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "engagements" && (segments.length === 1 || (segments.length === 2 && Boolean(segments[1])));
}

export function participantStageTenOwnsPath(pathname: string): boolean {
  if (
    pathname === "/profile/freelancer"
    || pathname === "/profile/client"
    || pathname === "/profile/resume-parse"
  ) return true;

  if (pathname.length > 1 && pathname.endsWith("/")) return false;
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 3
    && segments[0] === "gigs"
    && Boolean(segments[1])
    && !["new", "manage"].includes(segments[1])
    && segments[2] === "parse";
}

export function resolveParticipantShortcut({
  key,
  metaKey,
  ctrlKey,
  altKey,
  shiftKey,
  editableTarget,
  dialogOwnsKeyboard,
  commandOpen,
}: ParticipantShortcutInput): ParticipantShortcut {
  if (dialogOwnsKeyboard) return null;
  if (key === "Escape" && commandOpen) return "close";

  const slash = key === "/"
    && !metaKey
    && !ctrlKey
    && !altKey
    && !shiftKey
    && !editableTarget;
  if (slash) return "open";

  const commandKey = key.toLocaleLowerCase() === "k"
    && (metaKey || ctrlKey)
    && !altKey;
  return commandKey ? "open" : null;
}
