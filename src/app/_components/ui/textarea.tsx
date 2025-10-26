import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "small" | "large";
  className?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size, className = "", ...props }, ref) => {
    const textareaProps: Record<string, string> = {};

    if (size) {
      textareaProps[`data-size`] = size;
    }

    return (
      <textarea
        ref={ref}
        is-="textarea"
        className={`${className} tap-highlight-none`}
        style={{ fontSize: "16px", ...props.style }}
        {...textareaProps}
        {...props}
      />
    );
  }
);
