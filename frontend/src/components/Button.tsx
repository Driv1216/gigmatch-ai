import { Link } from "react-router-dom";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type BaseButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

type LinkButtonProps = BaseButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
  };

type NativeButtonProps = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: never;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-blue-700 focus-visible:outline-brand",
  secondary:
    "border border-line bg-white text-ink shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function getButtonClasses(variant: ButtonVariant, className: string) {
  return `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
}

function isLinkButtonProps(props: LinkButtonProps | NativeButtonProps): props is LinkButtonProps {
  return "to" in props;
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  if (isLinkButtonProps(props)) {
    const { children, variant = "primary", className = "", to, ...anchorProps } = props;
    const classes = getButtonClasses(variant, className);

    return (
      <Link to={to} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { children, variant = "primary", className = "", ...buttonProps } = props;
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
