import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly fullWidth?: boolean;
};

export function PrimaryButton({ fullWidth, className = "", children, ...rest }: Props) {
  return (
    <button
      className={`rounded-xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
