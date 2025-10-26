import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /**
   * Visual prominence variant for the button
   * 
   * Foreground variants (action prominence):
   * - `foreground0`: Primary CTA (highest prominence) - filled button with high contrast
   * - `foreground1`: Secondary action (medium prominence) - bordered button
   * - `foreground2`: Tertiary action (low prominence) - subtle text button
   * 
   * Background variants (subtle controls):
   * - `background2`: Close/dismiss actions (very subtle, blends with background)
   * - `background3`: Ultra-subtle controls (barely visible, hover reveals)
   * 
   * Semantic status variants:
   * - `success`: Positive confirmation actions (e.g., "Approve", "Enable")
   * - `warning`: Caution actions (e.g., "Archive", "Pause")
   * - `error`: Destructive actions (e.g., "Delete", "Remove")
   * 
   * @default undefined - Default button styling with subtle border
   */
  variant?:
    | "background0"
    | "background1"
    | "background2"
    | "background3"
    | "foreground0"
    | "foreground1"
    | "foreground2"
    | "success"
    | "warning"
    | "error";
  box?: "square" | "round" | "double";
  size?: "small" | "large";
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  box,
  size,
  className = "",
  ...props
}) => {
  const buttonProps: Record<string, string> = {};

  if (variant) {
    buttonProps[`variant-`] = variant;
  }

  if (box) {
    buttonProps[`box-`] = box;
  }

  if (size) {
    buttonProps[`size-`] = size;
  }

  return (
    <button
      is-="button"
      className={`${className} tap-highlight-none touch-action-manipulation`}
      {...buttonProps}
      {...props}
    >
      {children}
    </button>
  );
};
