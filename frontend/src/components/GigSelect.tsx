import * as Select from "@radix-ui/react-select";
import { useState } from "react";

export type GigSelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type GigSelectProps<T extends string> = {
  value: T | "";
  onValueChange: (value: T) => void;
  options: readonly GigSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
};

function resolvePortalContainer(trigger: HTMLButtonElement | null) {
  if (!trigger) return undefined;
  const dialog = trigger.closest("dialog[open]");
  if (dialog instanceof HTMLElement) return dialog;
  const shell = trigger.closest(".switchboard-shell, .switchboard-public-shell");
  if (shell instanceof HTMLElement) return shell;
  return document.body;
}

export function GigSelect<T extends string>({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  required = false,
  invalid = false,
  id,
  name,
  className,
  autoFocus,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: GigSelectProps<T>) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | undefined>();
  const isEmpty = options.length === 0;

  return (
    <Select.Root
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as T)}
      disabled={disabled || isEmpty}
      required={required}
      name={name}
      onOpenChange={(open) => {
        if (open) setPortalContainer(resolvePortalContainer(trigger));
      }}
    >
      <Select.Trigger
        ref={setTrigger}
        id={id}
        className={["gig-select-trigger", className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        autoFocus={autoFocus}
      >
        <Select.Value placeholder={isEmpty ? "No options available" : placeholder} />
        <Select.Icon className="gig-select-chevron" aria-hidden="true" />
      </Select.Trigger>
      <Select.Portal container={portalContainer ?? resolvePortalContainer(trigger)}>
        <Select.Content
          className="gig-select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="gig-select-scroll-button" aria-label="Scroll options up">
            <span aria-hidden="true">↑</span>
          </Select.ScrollUpButton>
          <Select.Viewport className="gig-select-viewport">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="gig-select-item"
              >
                <Select.ItemIndicator className="gig-select-indicator" aria-hidden="true" />
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="gig-select-scroll-button" aria-label="Scroll options down">
            <span aria-hidden="true">↓</span>
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
