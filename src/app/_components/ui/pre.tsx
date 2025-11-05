import React from "react";

interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  size?: "small" | "large";
  className?: string;
}

export const Pre: React.FC<PreProps> = ({
  children,
  size,
  className = "",
  ...props
}) => {
  const preProps: Record<string, string> = {};

  if (size) {
    preProps[`data-size`] = size;
  }

  // Ensure proper width constraints and overflow handling
  const combinedClassName = `max-w-full ${className}`;

  return (
    <pre is-="pre" className={combinedClassName} {...preProps} {...props}>
      {children}
    </pre>
  );
};
