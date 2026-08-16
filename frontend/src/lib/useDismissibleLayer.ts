import { useEffect, useRef, type RefObject } from "react";

export type DismissReason = "escape" | "outside-pointer";

type UseDismissibleLayerOptions = {
  open: boolean;
  layerRef: RefObject<HTMLElement | null>;
  onDismiss: (reason: DismissReason) => void;
};

function modalDialogOwnsKeyboard() {
  return Boolean(document.querySelector("dialog[open], [role='dialog'][aria-modal='true']"));
}

export function useDismissibleLayer({ open, layerRef, onDismiss }: UseDismissibleLayerOptions) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const layer = layerRef.current;
      if (!layer || event.composedPath().includes(layer)) return;
      onDismissRef.current("outside-pointer");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || modalDialogOwnsKeyboard()) return;
      event.preventDefault();
      onDismissRef.current("escape");
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [layerRef, open]);
}
