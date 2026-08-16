import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useParticipantHeaderContext } from "../context/ParticipantHeaderContext";
import {
  filterParticipantDestinations,
  resolveParticipantShortcut,
  type ParticipantRole,
} from "../lib/participantNavigation";
import { useDismissibleLayer } from "../lib/useDismissibleLayer";

type ParticipantCommandSurfaceProps = {
  role: ParticipantRole;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.matches("input, textarea, select, [role='textbox'], [contenteditable='true']")) {
    return true;
  }
  return Boolean(target.closest("[contenteditable='true'], [role='textbox']"));
}

function dialogOwnsKeyboard(): boolean {
  return Boolean(document.querySelector("dialog[open], [role='dialog'][aria-modal='true']"));
}

export function ParticipantCommandSurface({ role }: ParticipantCommandSurfaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { headerContext } = useParticipantHeaderContext();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const matches = filterParticipantDestinations(role, query);

  const focusCommand = useCallback((opener: HTMLElement | null) => {
    if (!open && opener !== inputRef.current) openerRef.current = opener;
    setOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const closeCommand = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    if (restoreFocus) {
      const opener = openerRef.current;
      window.requestAnimationFrame(() => opener?.focus());
    }
    openerRef.current = null;
  }, []);

  useDismissibleLayer({
    open,
    layerRef: commandRef,
    onDismiss: (reason) => closeCommand(reason === "escape"),
  });

  function openDestination(to: string) {
    setOpen(false);
    setQuery("");
    openerRef.current = null;
    navigate(to);
  }

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const shortcut = resolveParticipantShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        editableTarget: isEditableTarget(event.target),
        dialogOwnsKeyboard: dialogOwnsKeyboard(),
        commandOpen: open,
      });
      if (shortcut === "open") {
        event.preventDefault();
        focusCommand(document.activeElement instanceof HTMLElement ? document.activeElement : null);
      }
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [closeCommand, focusCommand, open]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    openerRef.current = null;
  }, [location.pathname]);

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    if (!open) {
      if (!openerRef.current && event.relatedTarget instanceof HTMLElement) {
        openerRef.current = event.relatedTarget;
      }
      setOpen(true);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLInputElement>) {
    if (!open && document.activeElement !== event.currentTarget) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      resultRefs.current[0]?.focus();
    }
    if (event.key === "Enter" && matches.length > 0) {
      event.preventDefault();
      openDestination(matches[0].to);
    }
  }

  function handleResultKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + matches.length) % matches.length;
    resultRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={headerContext ? "switchboard-command-band has-context" : "switchboard-command-band"}>
      <div className="switchboard-command" ref={commandRef}>
        <form
          className="switchboard-command-form"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (matches[0]) openDestination(matches[0].to);
          }}
        >
          <span aria-hidden="true" className="switchboard-command-mark">/</span>
          <label htmlFor="participant-command">Command</label>
          <input
            id="participant-command"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={handleFocus}
            onPointerDown={handlePointerDown}
            onKeyDown={handleInputKeyDown}
            placeholder="Filter route shortcuts"
            autoComplete="off"
            aria-controls="participant-command-results"
            aria-expanded={open}
            aria-keyshortcuts="/ Meta+K Control+K"
          />
          <kbd>/</kbd>
          <kbd>⌘K</kbd>
          <button type="submit" disabled={matches.length === 0} aria-label="Open first matching destination">
            Go
          </button>
        </form>
        {open ? (
          <div id="participant-command-results" className="switchboard-command-results">
            <div className="switchboard-command-results-head">
              <span>Authorized route shortcuts</span>
              <button type="button" onClick={() => closeCommand(true)}>Close</button>
            </div>
            {matches.length === 0 ? (
              <p role="status">No route shortcut matches that filter.</p>
            ) : (
              <ul aria-label="Available destinations">
                {matches.map((destination, index) => (
                  <li key={destination.id}>
                    <button
                      ref={(node) => { resultRefs.current[index] = node; }}
                      type="button"
                      onClick={() => openDestination(destination.to)}
                      onKeyDown={(event) => handleResultKeyDown(event, index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{destination.label}</strong>
                        <small>{destination.description}</small>
                      </span>
                      <code>{destination.to}</code>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      {headerContext ? (
        <div className="switchboard-command-context" aria-label={`${headerContext.eyebrow} context`}>
          <span>{headerContext.eyebrow}</span>
          <strong>{headerContext.title}</strong>
          <small>{headerContext.detail}</small>
        </div>
      ) : null}
    </div>
  );
}
