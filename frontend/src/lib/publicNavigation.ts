export function stageElevenOwnsPublicPath(pathname: string): boolean {
  return pathname === "/"
    || pathname === "/login"
    || pathname === "/signup"
    || pathname === "/auth/callback"
    || pathname === "/account/setup";
}
