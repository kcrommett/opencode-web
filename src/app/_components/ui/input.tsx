import React from "react";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "small" | "large";
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ size, className = "", ...props }, ref) => {
    const inputProps: Record<string, string> = {};

    if (size) {
      inputProps[`data-size`] = size;
    }

    return (
      <input
        ref={ref}
        is-="input"
        className={className}
        {...inputProps}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
