"use client";

type LoaderProps = {
  size?: "sm" | "md" | "lg";
  variant?: "maroon" | "light";
  className?: string;
};

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

const variantClasses = {
  maroon: "border-[#7b2c3d]/30 border-t-[#7b2c3d]",
  light: "border-white/50 border-t-white",
};

export default function Loader({
  size = "md",
  variant = "maroon",
  className = "",
}: LoaderProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
