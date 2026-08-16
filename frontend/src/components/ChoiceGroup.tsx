import { useId } from "react";

export type ChoiceGroupOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type ChoiceGroupProps<T extends string | number> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ChoiceGroupOption<T>[];
  legend: string;
  name?: string;
  layout?: "compact" | "cards";
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
};

export function ChoiceGroup<T extends string | number>({
  value,
  onValueChange,
  options,
  legend,
  name,
  layout = "compact",
  disabled = false,
  required = false,
  invalid = false,
  className,
  "aria-describedby": ariaDescribedBy,
}: ChoiceGroupProps<T>) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <fieldset
      className={["choice-group", `is-${layout}`, className].filter(Boolean).join(" ")}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={ariaDescribedBy}
    >
      <legend>{legend}</legend>
      <div className="choice-group-options">
        {options.map((option) => (
          <label key={`${typeof option.value}:${String(option.value)}`} className="choice-group-option">
            <input
              type="radio"
              name={groupName}
              value={String(option.value)}
              checked={Object.is(value, option.value)}
              onChange={() => onValueChange(option.value)}
              disabled={option.disabled}
              required={required}
              aria-invalid={invalid || undefined}
            />
            <span>
              <strong>{option.label}</strong>
              {option.description ? <small>{option.description}</small> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
