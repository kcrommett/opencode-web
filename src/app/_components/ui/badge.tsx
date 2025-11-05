import React from "react";

interface BadgeProps {
  children: React.ReactNode;
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
    | "error"
    | "info"
    | "pending";
  cap?:
    | "square"
    | "round"
    | "triangle"
    | "ribbon"
    | "slant-top"
    | "slant-bottom";
  className?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  cap = "square", // Default to square caps per webtui
  className = "",
  title,
}) => {
  const badgeProps: Record<string, string> = {};

  if (variant) {
    badgeProps[`variant-`] = variant;
  }

  if (cap) {
    badgeProps[`cap-`] = cap;
  }

  return (
    <span is-="badge" className={className} title={title} {...badgeProps}>
      {children}
    </span>
  );
};
