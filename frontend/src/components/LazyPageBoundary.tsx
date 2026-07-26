import { Component, Suspense, type ReactNode } from "react";
import { PageContainer } from "./PageContainer";

type LazyPageBoundaryProps = {
  children: ReactNode;
};

type LazyPageBoundaryState = {
  failed: boolean;
};

export class LazyPageBoundary extends Component<
  LazyPageBoundaryProps,
  LazyPageBoundaryState
> {
  state: LazyPageBoundaryState = { failed: false };

  static getDerivedStateFromError(): LazyPageBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    // The public UI intentionally does not log dynamic-import metadata.
  }

  render() {
    if (this.state.failed) {
      return (
        <PageContainer>
          <section className="rounded-lg border border-red-200 bg-white p-6 shadow-soft" aria-live="assertive">
            <h1 className="text-xl font-bold text-ink">This page could not be loaded</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Refresh to retry loading the latest page module.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Refresh page
            </button>
          </section>
        </PageContainer>
      );
    }
    return (
      <Suspense
        fallback={(
          <PageContainer>
            <p className="text-sm font-medium text-muted" aria-live="polite">
              Loading page…
            </p>
          </PageContainer>
        )}
      >
        {this.props.children}
      </Suspense>
    );
  }
}
