import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...rest }: Props) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}
