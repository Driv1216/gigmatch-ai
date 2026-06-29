import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return <section className={`mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 ${className}`}>{children}</section>;
}
