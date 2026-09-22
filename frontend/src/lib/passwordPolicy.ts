export type PasswordRule = {
  id: "length" | "lowercase" | "uppercase" | "digit" | "symbol";
  label: string;
  passes: (password: string) => boolean;
};

const passwordSymbols = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", passes: (password) => password.length >= 8 },
  { id: "lowercase", label: "One lowercase letter", passes: (password) => /[a-z]/.test(password) },
  { id: "uppercase", label: "One uppercase letter", passes: (password) => /[A-Z]/.test(password) },
  { id: "digit", label: "One number", passes: (password) => /[0-9]/.test(password) },
  { id: "symbol", label: "One symbol", passes: (password) => [...password].some((character) => passwordSymbols.includes(character)) },
];

export function passwordMeetsPolicy(password: string) {
  return passwordRules.every((rule) => rule.passes(password));
}
