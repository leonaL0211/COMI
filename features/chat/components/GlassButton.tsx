import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  variant?: "plain" | "berry";
};

export function GlassButton({
  children,
  className = "",
  label,
  variant = "plain",
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      className={[
        "glass-icon-button",
        `glass-icon-button-${variant}`,
        className,
      ].join(" ")}
      aria-label={label}
    >
      {children}
    </button>
  );
}
