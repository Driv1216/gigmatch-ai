import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { participantShellOwnsPath, participantStageTenOwnsPath } from "../src/lib/participantNavigation.ts";
import { passwordMeetsPolicy, passwordRules } from "../src/lib/passwordPolicy.ts";
import { stageElevenOwnsPublicPath } from "../src/lib/publicNavigation.ts";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const appSource = read("../src/App.tsx");
const appLayoutSource = read("../src/components/AppLayout.tsx");
const publicShellSource = read("../src/components/PublicShell.tsx");
const publicBoundarySource = read("../src/components/PublicAccountBoundary.tsx");
const setupBoundarySource = read("../src/components/AccountSetupBoundary.tsx");
const protectedRouteSource = read("../src/components/ProtectedRoute.tsx");
const authContextSource = read("../src/context/AuthContext.tsx");
const landingSource = read("../src/pages/LandingPage.tsx");
const loginSource = read("../src/pages/LoginPage.tsx");
const signupSource = read("../src/pages/SignupPage.tsx");
const setupSource = read("../src/pages/AccountSetupPage.tsx");
const callbackSource = read("../src/pages/AuthCallbackPage.tsx");
const verificationSource = read("../src/components/VerificationRequired.tsx");
const googleSource = read("../src/components/GoogleAuthControl.tsx");
const passwordFieldSource = read("../src/components/PasswordField.tsx");
const authSource = read("../src/lib/auth.ts");
const authFlowSource = read("../src/lib/authFlow.ts");
const stylesSource = read("../src/styles.css");
const configSource = read("../../supabase/config.toml");
const compatibilityMigration = read("../../supabase/migrations/20260816125650_add_account_setup_rpc.sql");
const finalMigration = read("../../supabase/migrations/20260816125654_finalize_account_setup_authority.sql");
const callerAudit = read("../../docs/verification/auth-profile-creation-caller-audit.md");
const finalProofSource = read("../e2e/milestone-7k.mjs");

test("public shell owns landing, auth, callback, and setup paths", () => {
  for (const path of ["/", "/login", "/signup", "/auth/callback", "/account/setup"]) {
    assert.equal(stageElevenOwnsPublicPath(path), true);
  }
  assert.equal(stageElevenOwnsPublicPath("/login/"), false);
  assert.equal(stageElevenOwnsPublicPath("/dashboard/freelancer"), false);
  assert.match(appLayoutSource, /stageElevenOwnsPublicPath\(location\.pathname\)/);
});

test("new auth routes retain route-level lazy boundaries", () => {
  for (const page of ["LandingPage", "LoginPage", "SignupPage", "AuthCallbackPage", "AccountSetupPage"]) {
    assert.match(appSource, new RegExp(`const ${page} = lazy\\(`));
  }
  assert.match(appSource, /path="\/auth\/callback" element=\{page\(<AuthCallbackPage \/>\)\}/);
  assert.match(appSource, /path="\/account\/setup"[\s\S]*<AccountSetupBoundary>/);
  assert.match(appSource, /<PublicAccountBoundary mode="auth">/);
});

test("participant and admin route isolation remain intact", () => {
  assert.equal(participantShellOwnsPath("/dashboard/freelancer"), true);
  assert.equal(participantShellOwnsPath("/dashboard/client"), true);
  assert.equal(participantStageTenOwnsPath("/profile/resume-parse"), true);
  assert.equal(participantShellOwnsPath("/account/setup"), false);
  assert.equal(participantShellOwnsPath("/auth/callback"), false);
  assert.match(appSource, /path="\/dashboard\/admin"[\s\S]*allowedRole="admin"/);
  assert.doesNotMatch(publicShellSource + landingSource + signupSource + setupSource, /to="\/dashboard\/admin"|value="admin"/);
});

test("signup establishes identity only and setup owns name plus role", () => {
  assert.match(signupSource, /supabase\.auth\.signUp/);
  assert.match(signupSource, /emailRedirectTo: authCallbackUrl\(\)/);
  assert.doesNotMatch(signupSource, /full_name|p_full_name|user_profiles|\.insert\(/);
  assert.doesNotMatch(signupSource, /p_role|name="role"|value="freelancer"|value="client"/);
  assert.doesNotMatch(signupSource, /options:\s*\{\s*data:/);
  assert.match(setupSource, /providerNamePrefill/);
  assert.match(setupSource, /completeAccountSetup\(normalizedName, role\)/);
  assert.deepEqual([...setupSource.matchAll(/value="(freelancer|client|admin)"/g)].map((match) => match[1]), ["freelancer", "client"]);
  assert.match(setupSource, /readOnly/);
});

test("setup RPC is the sole normal browser profile-creation authority", () => {
  assert.match(authSource, /\.rpc\("complete_account_setup"/);
  assert.match(authSource, /p_full_name: fullName/);
  assert.match(authSource, /p_role: role/);
  assert.doesNotMatch(authSource.slice(authSource.indexOf("completeAccountSetup")), /p_email|p_user_id/);
  assert.match(compatibilityMigration, /security definer\s+set search_path = ''/i);
  assert.match(compatibilityMigration, /from auth\.users/);
  assert.match(compatibilityMigration, /values \(v_user_id, v_email, v_full_name, p_role\)/);
  assert.match(compatibilityMigration, /revoke all on function public\.complete_account_setup\(text, text\) from public/);
  assert.match(finalMigration, /drop policy if exists "Users can insert their own non-admin profile"/);
  assert.match(finalMigration, /revoke insert on public\.user_profiles from authenticated/);
  assert.match(callerAudit, /only normal browser profile-creation path/i);
});

test("callback stays implicit and routes by authoritative profile state", () => {
  assert.match(authFlowSource, /new URL\("\/auth\/callback", window\.location\.origin\)/);
  assert.match(callbackSource, /callbackErrorFromLocation\(window\.location\)/);
  assert.match(callbackSource, /profileStatus === "missing"[\s\S]*Navigate to="\/account\/setup"/);
  assert.match(callbackSource, /dashboardPathForRole\(role\)/);
  assert.doesNotMatch(callbackSource + authFlowSource, /exchangeCodeForSession/);
  assert.match(authContextSource, /profileRequest\.current/);
  assert.match(authContextSource, /ProfileStatus = "loading" \| "ready" \| "missing" \| "error"/);
});

test("account-state boundaries recover missing profiles globally and fail closed on read errors", () => {
  assert.match(publicBoundarySource, /profileStatus === "error"/);
  assert.match(publicBoundarySource, /profileStatus === "missing"[\s\S]*Navigate to="\/account\/setup"/);
  assert.match(publicBoundarySource, /mode === "auth"[\s\S]*Open dashboard[\s\S]*Logout/);
  assert.match(setupBoundarySource, /if \(!user\)[\s\S]*Navigate to="\/login"/);
  assert.match(setupBoundarySource, /profileStatus === "error"/);
  assert.match(setupBoundarySource, /profileStatus === "ready"[\s\S]*dashboardPathForRole/);
  assert.match(protectedRouteSource, /profileStatus === "missing"[\s\S]*Navigate to="\/account\/setup"/);
  assert.doesNotMatch(setupBoundarySource, /ProtectedRoute/);
});

test("password, Google, login, and resend UX match the hardened contract", () => {
  assert.equal(passwordRules.length, 5);
  assert.equal(passwordMeetsPolicy("Valid9!x"), true);
  assert.equal(passwordMeetsPolicy("missing9!"), false);
  assert.equal(passwordMeetsPolicy("MISSING9!"), false);
  assert.equal(passwordMeetsPolicy("Missing!!"), false);
  assert.equal(passwordMeetsPolicy("Missing99"), false);
  assert.match(signupSource, /Confirm Password/);
  assert.doesNotMatch(signupSource, /confirm_password:|password_confirmation:/);
  assert.match(signupSource + loginSource, /autoComplete="new-password"/);
  assert.match(loginSource, /autoComplete="current-password"/);
  assert.match(passwordFieldSource, /aria-pressed=\{visible\}/);
  assert.doesNotMatch(passwordFieldSource, /onPaste|preventDefault/);
  assert.match(loginSource, /Invalid email or password/);
  assert.match(googleSource, /Continue with Google/);
  assert.match(googleSource, /switchboard-auth-divider/);
  assert.match(verificationSource, /supabase\.auth\.resend/);
  assert.match(verificationSource, /isAuthRateLimitError/);
});

test("local Auth configuration mirrors the five password rules and callback flow", () => {
  assert.match(configSource, /site_url = "http:\/\/127\.0\.0\.1:5173"/);
  assert.match(configSource, /additional_redirect_urls = \["http:\/\/127\.0\.0\.1:5173\/auth\/callback", "http:\/\/localhost:5173\/auth\/callback"\]/);
  assert.match(configSource, /minimum_password_length = 8/);
  assert.match(configSource, /password_requirements = "lower_upper_letters_digits_symbols"/);
  assert.match(configSource, /enable_confirmations = true/);
});

test("Switchboard presentation, accessibility, and responsive proof targets remain explicit", () => {
  for (const token of ["--sw-bone", "--sw-ocean", "--sw-glass", "--sw-coral", "--sw-ink"]) assert.match(stylesSource, new RegExp(token));
  assert.match(stylesSource, /Manrope Variable/);
  assert.match(stylesSource, /Space Grotesk Variable/);
  assert.match(stylesSource, /switchboard-password-rules/);
  assert.match(stylesSource, /switchboard-google-auth/);
  assert.match(stylesSource, /@media \(max-width: 1080px\)/);
  assert.match(stylesSource, /@media \(max-width: 800px\)/);
  assert.match(stylesSource, /@media \(max-width: 520px\)/);
  assert.match(stylesSource, /prefers-reduced-motion/);
});

test("marketplace truthfulness and logout Back protection remain unchanged", () => {
  assert.match(landingSource, /reviewed resume input/i);
  assert.match(landingSource, /Keyword, semantic, or hybrid ranking/i);
  assert.match(landingSource, /version-bound selection/i);
  assert.doesNotMatch(landingSource, /supabase|fetch\(|axios|apiRequest|useEffect/);
  assert.match(authContextSource, /await supabase\.auth\.signOut\(\)/);
  assert.match(finalProofSource, /async function proveLogoutBackDenial/);
  assert.match(finalProofSource, /await page\.goBack\(\)/);
});
