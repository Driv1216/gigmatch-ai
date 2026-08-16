/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ParticipantHeaderContextValue = {
  eyebrow: string;
  title: string;
  detail: string;
};

type Registration = {
  id: number;
  value: ParticipantHeaderContextValue;
};

type ParticipantHeaderContextState = {
  headerContext: ParticipantHeaderContextValue | null;
  registerHeaderContext: (value: ParticipantHeaderContextValue) => () => void;
};

const ParticipantHeaderContext = createContext<ParticipantHeaderContextState | undefined>(undefined);

export function ParticipantHeaderContextProvider({ children }: { children: ReactNode }) {
  const nextRegistrationId = useRef(0);
  const [registration, setRegistration] = useState<Registration | null>(null);

  const registerHeaderContext = useCallback((value: ParticipantHeaderContextValue) => {
    const id = nextRegistrationId.current + 1;
    nextRegistrationId.current = id;
    setRegistration({ id, value });

    return () => {
      setRegistration((current) => current?.id === id ? null : current);
    };
  }, []);

  return (
    <ParticipantHeaderContext.Provider
      value={{ headerContext: registration?.value ?? null, registerHeaderContext }}
    >
      {children}
    </ParticipantHeaderContext.Provider>
  );
}

export function useParticipantHeaderContext() {
  const context = useContext(ParticipantHeaderContext);
  if (!context) {
    throw new Error("useParticipantHeaderContext must be used inside ParticipantHeaderContextProvider.");
  }
  return context;
}

export function useParticipantHeaderContextRegistration(
  value: ParticipantHeaderContextValue | undefined,
) {
  const { registerHeaderContext } = useParticipantHeaderContext();
  const eyebrow = value?.eyebrow;
  const title = value?.title;
  const detail = value?.detail;

  useEffect(() => {
    if (eyebrow === undefined || title === undefined || detail === undefined) return;
    return registerHeaderContext({ eyebrow, title, detail });
  }, [detail, eyebrow, registerHeaderContext, title]);
}
