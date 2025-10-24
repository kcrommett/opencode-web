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

  return (
    <pre is-="pre" className={className} {...preProps} {...props}>
      {children}
    </pre>
  );
};
