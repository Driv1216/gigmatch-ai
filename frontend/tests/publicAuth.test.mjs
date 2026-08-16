import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  participantShellOwnsPath,
  participantStageTenOwnsPath,
} from "../src/lib/participantNavigation.ts";
import { stageElevenOwnsPublicPath } from "../src/lib/publicNavigation.ts";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const appSource = read("../src/App.tsx");
const appLayoutSource = read("../src/components/AppLayout.tsx");
const publicShellSource = read("../src/components/PublicShell.tsx");
const authContextSource = read("../src/context/AuthContext.tsx");
const protectedRouteSource = read("../src/components/ProtectedRoute.tsx");
const landingSource = read("../src/pages/LandingPage.tsx");
const loginSource = read("../src/pages/LoginPage.tsx");
const signupSource = read("../src/pages/SignupPage.tsx");
const supabaseSource = read("../src/lib/supabaseClient.ts");
const authSource = read("../src/lib/auth.ts");
const authMigrationSource = read("../../supabase/migrations/20260629210113_auth_profiles.sql");
const finalProofSource = read("../e2e/milestone-7k.mjs");

test("Stage 11 owns exactly the three public and authentication paths", () => {
  assert.equal(stageElevenOwnsPublicPath("/"), true);
  assert.equal(stageElevenOwnsPublicPath("/login"), true);
  assert.equal(stageElevenOwnsPublicPath("/signup"), true);
  assert.equal(stageElevenOwnsPublicPath("/login/"), false);
  assert.equal(stageElevenOwnsPublicPath("/dashboard/freelancer"), false);
  assert.equal(stageElevenOwnsPublicPath("/dashboard/admin"), false);

  assert.match(appLayoutSource, /stageElevenOwnsPublicPath\(location\.pathname\)/);
  assert.match(appLayoutSource, /<PublicShell>\{children\}<\/PublicShell>/);
  assert.doesNotMatch(publicShellSource, /ParticipantShell|ParticipantCommandSurface/);
});

test("public routes retain route-level lazy and recoverable error boundaries", () => {
  for (const page of ["LandingPage", "LoginPage", "SignupPage"]) {
    assert.match(appSource, new RegExp(`const ${page} = lazy\\(`));
  }
  assert.match(appSource, /function page\(node: ReactNode\)[\s\S]*<LazyPageBoundary>\{node\}<\/LazyPageBoundary>/);
  assert.match(appSource, /path="\/" element=\{page\(<LandingPage \/>\)\}/);
  assert.match(appSource, /path="\/login" element=\{page\(<LoginPage \/>\)\}/);
  assert.match(appSource, /path="\/signup" element=\{page\(<SignupPage \/>\)\}/);
});

test("participant ownership and deferred admin presentation remain contained", () => {
  assert.equal(participantShellOwnsPath("/dashboard/freelancer"), true);
  assert.equal(participantShellOwnsPath("/dashboard/client"), true);
  assert.equal(participantStageTenOwnsPath("/profile/resume-parse"), true);
  assert.equal(participantShellOwnsPath("/login"), false);
  assert.equal(participantShellOwnsPath("/signup"), false);
  assert.equal(participantShellOwnsPath("/dashboard/admin"), false);
  assert.match(appSource, /path="\/dashboard\/admin"[\s\S]*allowedRole="admin"/);
  assert.doesNotMatch(publicShellSource + landingSource + signupSource, /to="\/dashboard\/admin"|value="admin"/);
});

test("signup exposes only normal participant roles and uses selection only during account creation", () => {
  const roleValues = [...signupSource.matchAll(/value="(freelancer|client|admin|evaluator|superuser)"/g)].map((match) => match[1]);
  assert.deepEqual(roleValues, ["freelancer", "client"]);
  assert.match(signupSource, /type SignupRole = Exclude<UserRole, "admin">/);
  assert.match(signupSource, /not a runtime role switch/i);
  assert.doesNotMatch(signupSource, /setItem\(|localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(authContextSource, /setItem\(|localStorage|sessionStorage|document\.cookie/);
});

test("signup preserves the single live profile insert and resolves the persisted role before routing", () => {
  assert.match(signupSource, /supabase\.auth\.signUp/);
  assert.equal((signupSource.match(/\.from\("user_profiles"\)\s*\.insert/g) ?? []).length, 1);
  assert.match(signupSource, /if \(!data\.session\)/);
  assert.match(signupSource, /Check your email to confirm your account before logging in/);
  assert.match(signupSource, /const persistedProfile = await refreshProfile\(\)/);
  assert.match(signupSource, /dashboardPathForRole\(persistedProfile\.role\)/);
  assert.doesNotMatch(signupSource, /dashboardPathForRole\(role\)/);
  assert.doesNotMatch(authMigrationSource, /auth\.users[\s\S]{0,200}(trigger|execute function)/i);
  assert.match(authMigrationSource, /Users can insert their own non-admin profile/);
});

test("confirmation-without-session remains public and does not query protected profile authority", () => {
  const confirmationBranch = signupSource.slice(
    signupSource.indexOf("if (!data.session)"),
    signupSource.indexOf('supabase.from("user_profiles")'),
  );
  assert.match(confirmationBranch, /setSuccessMessage/);
  assert.match(confirmationBranch, /setIsSubmitting\(false\)/);
  assert.match(confirmationBranch, /return/);
  assert.doesNotMatch(confirmationBranch, /refreshProfile|user_profiles|navigate\(/);
});

test("login routes only from the trusted persisted profile and fails safely when it is missing", () => {
  assert.match(authSource, /export function dashboardPathForRole\(role: UserRole\) \{\s*return `\/dashboard\/\$\{role\}`;/);
  assert.match(loginSource, /supabase\.auth\.signInWithPassword/);
  assert.match(loginSource, /fetchUserProfile\(data\.user\.id\)/);
  assert.match(loginSource, /dashboardPathForRole\(profile\.role\)/);
  assert.match(loginSource, /no profile row was found for this account/);
  assert.doesNotMatch(loginSource, /email\.includes|email\.endsWith|URLSearchParams|localStorage|sessionStorage/);
  assert.match(loginSource, /role="alert"/);
});

test("protected-route and logout authority remain intact, including final browser-back proof", () => {
  assert.match(protectedRouteSource, /if \(loading\)/);
  assert.match(protectedRouteSource, /if \(!user\)[\s\S]*<Navigate to="\/login" replace \/>/);
  assert.match(protectedRouteSource, /dashboardPathForRole\(role\)/);
  assert.match(authContextSource, /await supabase\.auth\.signOut\(\)/);
  assert.match(publicShellSource, /await logout\(\)/);
  assert.match(finalProofSource, /async function proveLogoutBackDenial/);
  assert.match(finalProofSource, /await page\.goBack\(\)/);
  assert.match(finalProofSource, /await page\.waitForURL\(\/\\\/login\$\/\)/);
  assert.doesNotMatch(publicShellSource + loginSource + signupSource, /contact.*(?:localStorage|sessionStorage)|(?:localStorage|sessionStorage).*contact/i);
});

test("landing copy is truthful and does not fetch private marketplace data", () => {
  assert.match(landingSource, /reviewed resume input/i);
  assert.match(landingSource, /Keyword, semantic, or hybrid ranking/i);
  assert.match(landingSource, /version-bound selection/i);
  assert.match(landingSource, /contact sharing remains method-specific, consent-based, and revocable/i);
  assert.match(landingSource, /Marketplace discovery and participant workflow data require an account/i);
  assert.doesNotMatch(landingSource, /supabase|fetch\(|axios|apiRequest|useEffect/);
  assert.doesNotMatch(
    landingSource,
    /payments?|escrow|digital signatures?|invoices?|refunds?|dispute resolution|task boards?|timesheets?|real-time chat|automatic negotiation|guaranteed|testimonial|customer logos?|success rate|users served|gigs posted/i,
  );
});

test("Stage 11 adds no remote marketing assets or manual session persistence", () => {
  const stageElevenSources = [publicShellSource, landingSource, loginSource, signupSource].join("\n");
  assert.doesNotMatch(stageElevenSources, /https?:\/\/|<script|<img|analytics|tracking|pixel/i);
  assert.doesNotMatch(stageElevenSources, /localStorage|sessionStorage|document\.cookie/);
  assert.match(supabaseSource, /createClient\(supabaseUrl, supabasePublishableKey\)/);
  assert.doesNotMatch(supabaseSource, /persistSession|storage:/);
});
