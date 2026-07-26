import type { ContactExchange } from "./contactExchangeContracts";

export type ContactExchangeViewState =
  | "loading"
  | "error"
  | "blocked"
  | "unavailable"
  | "empty"
  | "ready";

export function deriveContactExchangeViewState(
  exchange: ContactExchange | null,
  error: string | null,
): ContactExchangeViewState {
  if (error && exchange === null) return "error";
  if (exchange === null) return "loading";
  if (exchange.blocked) return "blocked";
  if (!exchange.exchange_available) return "unavailable";
  if (
    exchange.shared_by_you.length === 0 &&
    exchange.shared_with_you.length === 0
  ) {
    return "empty";
  }
  return "ready";
}
