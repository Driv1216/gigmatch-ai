import { useEffect, useRef, type ReactNode } from "react";

type AuthStatePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelBody: string;
  status?: "status" | "alert";
  actions?: ReactNode;
};

export function AuthStatePage({
  eyebrow,
  title,
  description,
  panelTitle,
  panelBody,
  status = "status",
  actions,
}: AuthStatePageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === "alert") {
      headingRef.current?.focus();
    }
  }, [status]);

  return (
    <section className="switchboard-auth-page is-status" aria-labelledby="auth-state-title">
      <aside className="switchboard-auth-context">
        <span className="switchboard-public-eyebrow">{eyebrow}</span>
        <h1 id="auth-state-title">{title}</h1>
        <p>{description}</p>
      </aside>
      <div className="switchboard-auth-panel">
        <div className="switchboard-auth-state-card" role={status} aria-live={status === "alert" ? "assertive" : "polite"}>
          <span>ACCOUNT STATE</span>
          <h2 ref={headingRef} tabIndex={status === "alert" ? -1 : undefined}>{panelTitle}</h2>
          <p>{panelBody}</p>
          {actions ? <div className="switchboard-auth-state-actions">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
