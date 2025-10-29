import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { highlightCode } from "./highlight";

/**
 * Markdown renderer configuration and utilities for OpenCode Web.
 * Provides GitHub-flavored markdown parsing with sanitization and syntax highlighting.
 */

interface MarkdownRendererProps {
  content: string;
  enableImages?: boolean;
}

/**
 * Custom code block component with syntax highlighting and copy functionality.
 * Integrates with existing highlight.js configuration.
 */
const CodeBlock: React.FC<{
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ inline, className, children }) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    if (!language) return code;
    try {
      return highlightCode(code, language);
    } catch {
      return code;
    }
  }, [code, language]);

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-theme-background-accent text-theme-markdown-code font-mono text-sm">
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div className="relative my-4 rounded-md overflow-hidden border border-theme-border group">
      <div className="flex items-center justify-between px-4 py-2 bg-theme-background-alt border-b border-theme-border">
        {language && (
          <span className="text-xs text-theme-muted font-mono">{language}</span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto text-xs text-theme-muted hover:text-theme-foreground transition-colors px-2 py-1 rounded hover:bg-theme-background-accent"
          aria-label="Copy code to clipboard"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-theme-background-element">
        <code
          className="hljs font-mono text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
};

/**
 * Custom blockquote component with theme-aware styling.
 */
const Blockquote: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <blockquote className="border-l-4 border-theme-markdown-block-quote pl-4 my-4 italic text-theme-foreground-alt">
    {children}
  </blockquote>
);

/**
 * Custom link component with safe external link handling.
 */
const Link: React.FC<{
  href?: string;
  children?: React.ReactNode;
}> = ({ href, children }) => (
  <a
    href={href}
    className="text-theme-markdown-link hover:underline"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

/**
 * Custom table component with responsive wrapper.
 */
const Table: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="my-4 overflow-x-auto">
    <table className="min-w-full border-collapse border border-theme-border">
      {children}
    </table>
  </div>
);

const TableRow: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <tr className="border-b border-theme-border">{children}</tr>
);

const TableCell: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <td className="px-4 py-2 border-r border-theme-border last:border-r-0">
    {children}
  </td>
);

const TableHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <th className="px-4 py-2 bg-theme-background-alt border-r border-theme-border last:border-r-0 font-semibold text-left">
    {children}
  </th>
);

/**
 * Custom heading components with theme-aware colors.
 */
const Heading: React.FC<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
}> = ({ level, children }) => {
  const classes = "text-theme-markdown-heading font-semibold my-4";
  const sizes = {
    1: "text-2xl",
    2: "text-xl",
    3: "text-lg",
    4: "text-base",
    5: "text-sm",
    6: "text-xs",
  };

  switch (level) {
    case 1:
      return <h1 className={`${classes} ${sizes[1]}`}>{children}</h1>;
    case 2:
      return <h2 className={`${classes} ${sizes[2]}`}>{children}</h2>;
    case 3:
      return <h3 className={`${classes} ${sizes[3]}`}>{children}</h3>;
    case 4:
      return <h4 className={`${classes} ${sizes[4]}`}>{children}</h4>;
    case 5:
      return <h5 className={`${classes} ${sizes[5]}`}>{children}</h5>;
    case 6:
      return <h6 className={`${classes} ${sizes[6]}`}>{children}</h6>;
  }
};

/**
 * Custom list components.
 */
const List: React.FC<{
  ordered?: boolean;
  children?: React.ReactNode;
}> = ({ ordered, children }) => {
  const Tag = ordered ? "ol" : "ul";
  const className = ordered
    ? "list-decimal list-inside my-4 space-y-2"
    : "list-disc list-inside my-4 space-y-2";
  return <Tag className={className}>{children}</Tag>;
};

const ListItem: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <li className="text-theme-foreground">{children}</li>
);

/**
 * Custom image component with conditional rendering based on enableImages flag.
 */
const Image: React.FC<{
  src?: string;
  alt?: string;
  enableImages: boolean;
}> = ({ src, alt, enableImages }) => {
  if (!enableImages) {
    return (
      <span className="text-theme-muted italic">
        [Image: {alt || "Untitled"}]
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-md my-4 border border-theme-border"
      loading="lazy"
    />
  );
};

/**
 * Sanitization schema for rehype-sanitize.
 * Allows safe HTML elements and attributes needed for markdown rendering.
 */
const sanitizeSchema = {
  tagNames: [
    "p",
    "br",
    "strong",
    "em",
    "del",
    "code",
    "pre",
    "blockquote",
    "a",
    "ul",
    "ol",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "input",
  ],
  attributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["className"],
    pre: ["className"],
    input: ["type", "checked", "disabled"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
    src: ["http", "https", "data"],
  },
};

/**
 * Main markdown renderer component.
 * Renders markdown content with GFM support, sanitization, and custom styling.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  enableImages = false,
}) => {
  return (
    <div className="markdown-content text-theme-foreground text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={{
          code: CodeBlock,
          blockquote: Blockquote,
          a: Link,
          table: Table,
          tr: TableRow,
          td: TableCell,
          th: TableHeader,
          h1: (props) => <Heading level={1} {...props} />,
          h2: (props) => <Heading level={2} {...props} />,
          h3: (props) => <Heading level={3} {...props} />,
          h4: (props) => <Heading level={4} {...props} />,
          h5: (props) => <Heading level={5} {...props} />,
          h6: (props) => <Heading level={6} {...props} />,
          ul: (props) => <List {...props} />,
          ol: (props) => <List ordered {...props} />,
          li: ListItem,
          img: (props) => <Image {...props} enableImages={enableImages} />,
          p: ({ children }) => <p className="my-2">{children}</p>,
          hr: () => <hr className="my-4 border-theme-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Helper function to check if content contains markdown syntax.
 * Used to optimize rendering by detecting markdown patterns.
 */
export function hasMarkdownSyntax(text: string): boolean {
  const patterns = [
    /^#{1,6}\s/m, // Headings
    /\*\*.*?\*\*/,  // Bold
    /\*.*?\*/,      // Italic
    /\[.*?\]\(.*?\)/, // Links
    /```[\s\S]*?```/, // Code blocks
    /`[^`]+`/,      // Inline code
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /^\s*>\s/m,     // Blockquotes
    /^\s*\|.*\|/m,  // Tables
  ];

  return patterns.some((pattern) => pattern.test(text));
}
