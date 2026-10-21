import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const variants = {
    primary:
      "bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]",
    secondary:
      "border border-black/10 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
