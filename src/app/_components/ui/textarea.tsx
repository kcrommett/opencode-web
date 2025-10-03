import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: 'small' | 'large';
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  size,
  className = '',
  ...props
}) => {
  const textareaProps: Record<string, string> = {};

  if (size) {
    textareaProps[`data-size`] = size;
  }

  return (
    <textarea
      is-="textarea"
      className={`${className} tap-highlight-none`}
      style={{ fontSize: '16px', ...props.style }}
      {...textareaProps}
      {...props}
    />
  );
};