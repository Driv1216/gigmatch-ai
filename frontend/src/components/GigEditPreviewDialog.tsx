import { useEffect, useRef } from "react";
import type { MaterialPreview } from "../lib/gigManagement";
import { Button } from "./Button";

type GigEditPreviewDialogProps = {
  preview: MaterialPreview;
  requiresReconfirmation: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function GigEditPreviewDialog({ preview, requiresReconfirmation, isSubmitting, onConfirm, onDismiss }: GigEditPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, []);

  return (
    <dialog ref={dialogRef} className="gig-action-dialog gig-edit-preview-dialog" onClose={onDismiss} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); dialogRef.current?.close(); } }} aria-labelledby="gig-preview-title" aria-describedby="gig-preview-consequence">
      <form method="dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
        <header>
          <span>{requiresReconfirmation ? "Concurrency check refreshed" : "Authoritative edit preview"}</span>
          <h2 id="gig-preview-title">{preview.is_material ? "Confirm material consequences" : "Confirm refreshed change"}</h2>
          <p>{preview.is_material ? "The server classified this candidate as material." : "The server revalidated this candidate against the latest display version."}</p>
        </header>
        <div className="gig-action-dialog-body">
          <p id="gig-preview-consequence" className="gig-action-consequence">
            {preview.is_material
              ? "A new immutable version will move both the display and material pointers. Existing applications remain historically bound and may require a response."
              : "A new immutable display version will be created without moving the applicant-relevant material pointer."}
          </p>
          <dl className="gig-preview-facts">
            <div><dt>Changed fields</dt><dd>{preview.changed_fields.length ? preview.changed_fields.map(formatCode).join(" · ") : "No fields reported"}</dd></div>
            <div><dt>Active applications</dt><dd>{preview.affected_application_count}</dd></div>
            <div><dt>Selection request</dt><dd>{formatCode(preview.selection_request_effect)}</dd></div>
          </dl>
          {requiresReconfirmation ? <p className="gig-preview-warning" role="alert">The gig or its consequences changed while this draft was open. This is a fresh server preview; confirm again to continue.</p> : null}
        </div>
        <footer>
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()} disabled={isSubmitting}>Keep editing</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : preview.is_material ? "Confirm material version" : "Confirm refreshed version"}</Button>
        </footer>
      </form>
    </dialog>
  );
}

function formatCode(value: string) {
  return value.replace(/_/g, " ");
}
