import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: "default" | "danger";
  readonly fullWidth?: boolean;
};

export function SecondaryButton({ variant = "default", fullWidth, className = "", children, ...rest }: Props) {
  const colors = variant === "danger"
    ? "border-red-300 text-red-600 hover:bg-red-50"
    : "border-stone-300 text-stone-700 hover:bg-stone-50";

  return (
    <button
      className={`rounded-lg border py-2 text-sm font-medium ${colors} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
