import React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        is-="checkbox"
        {...props}
        style={{
          width: "18px",
          height: "18px",
          minWidth: "18px",
          minHeight: "18px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--theme-primary)",
          borderRadius: "3px",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          position: "relative",
          ...(props.style || {}),
        }}
      />
      {children}
    </label>
  );
};
