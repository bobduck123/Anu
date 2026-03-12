"use client";

type ButtonVariants = "primary" | "ghost" | "outline" | "accent" | "sage";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariants;
  size?: "sm" | "md";
};

const variantClasses: Record<ButtonVariants, string> = {
  primary: "bg-[var(--color-institutional)] text-white hover:bg-[#152a45]",
  accent: "bg-[var(--color-accent)] text-white hover:bg-[#b45309]",
  sage: "bg-[var(--color-sage)] text-white hover:bg-[var(--color-forest)]",
  ghost: "bg-transparent border border-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  outline: "bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-institutional)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const classes = [
    "inline-flex items-center justify-center rounded-full font-medium transition duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-institutional)]",
    "shadow-sm shadow-black/10 hover:shadow-md",
    variantClasses[variant],
    sizeClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button {...props} className={classes} />;
}
