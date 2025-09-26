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
    textareaProps[`size-`] = size;
  }

  return (
    <textarea
      className={className}
      {...textareaProps}
      {...props}
    />
  );
};