import React from 'react';
import { marked } from 'marked';

/**
 * Configure marked options for GitHub Flavored Markdown and automatic breaks
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Validates URLs against safe protocols.
 * Blocks javascript:, data:, vbscript:, file:, etc.
 */
function isSafeUrl(href) {
  if (!href || typeof href !== 'string') return false;
  const trimmed = href.trim();
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return false;
  }
  try {
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return true;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, origin);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safely decodes HTML entities into literal characters for safe React text nodes.
 */
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Pre-processes AI content to remove dangerous tags and handle malformed formatting
 */
function sanitizeRawContent(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // Strip dangerous executable HTML blocks and tags entirely
  const sanitized = raw
    .replace(/<(script|style|iframe|object|embed|svg|canvas|form|input|button)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|svg|canvas|form|input|button)[^>]*\/?>/gi, '');

  return sanitized;
}

/**
 * Recursive React token renderer.
 * Converts marked AST tokens directly into React Virtual DOM elements with ZERO dangerouslySetInnerHTML.
 */
function renderTokens(tokens, keyPrefix = 'tok') {
  if (!Array.isArray(tokens)) return null;

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case 'space':
        return null;

      case 'heading': {
        const depth = Math.min(Math.max(token.depth || 1, 1), 6);
        const headingStyles = {
          fontFamily: 'var(--font-serif, "Lora", serif)',
          color: 'var(--color-primary-dark, #171513)',
          letterSpacing: '-0.01em',
          lineHeight: 1.3,
        };

        const children = renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-h`);

        if (depth === 1) {
          return (
            <h2
              key={key}
              style={{
                ...headingStyles,
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: '1.1rem 0 0.45rem 0',
              }}
            >
              {children}
            </h2>
          );
        }
        if (depth === 2) {
          return (
            <h3
              key={key}
              style={{
                ...headingStyles,
                fontSize: '1.15rem',
                fontWeight: 600,
                margin: '1rem 0 0.4rem 0',
              }}
            >
              {children}
            </h3>
          );
        }
        if (depth === 3) {
          return (
            <h4
              key={key}
              style={{
                ...headingStyles,
                fontSize: '1.05rem',
                fontWeight: 600,
                margin: '0.85rem 0 0.35rem 0',
              }}
            >
              {children}
            </h4>
          );
        }
        return (
          <h5
            key={key}
            style={{
              ...headingStyles,
              fontSize: '0.95rem',
              fontWeight: 600,
              margin: '0.75rem 0 0.3rem 0',
            }}
          >
            {children}
          </h5>
        );
      }

      case 'paragraph':
        return (
          <p
            key={key}
            style={{
              margin: '0.65rem 0',
              lineHeight: 1.65,
              color: 'inherit',
              wordBreak: 'break-word',
            }}
          >
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-p`)}
          </p>
        );

      case 'text': {
        if (token.tokens && token.tokens.length > 0) {
          return (
            <React.Fragment key={key}>
              {renderTokens(token.tokens, `${key}-txt`)}
            </React.Fragment>
          );
        }
        const textStr = decodeEntities(token.text || '');
        // If text contains newlines, split and insert <br /> tags
        if (textStr.includes('\n')) {
          const lines = textStr.split('\n');
          return (
            <React.Fragment key={key}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={`${key}-ln-${lIdx}`}>
                  {lIdx > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }
        return textStr;
      }

      case 'strong':
        return (
          <strong
            key={key}
            style={{
              fontWeight: 600,
              color: 'var(--color-primary-dark, #171513)',
            }}
          >
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-str`)}
          </strong>
        );

      case 'em':
        return (
          <em key={key} style={{ fontStyle: 'italic' }}>
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-em`)}
          </em>
        );

      case 'del':
        return (
          <del key={key} style={{ textDecoration: 'line-through' }}>
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-del`)}
          </del>
        );

      case 'codespan':
        return (
          <code
            key={key}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.85em',
              backgroundColor: 'rgba(23, 21, 19, 0.06)',
              border: '1px solid var(--border-subtle, #DED4C4)',
              borderRadius: 'var(--radius-sm, 4px)',
              padding: '0.15rem 0.38rem',
              color: 'var(--color-primary-dark, #171513)',
              wordBreak: 'break-word',
            }}
          >
            {decodeEntities(token.text || '')}
          </code>
        );

      case 'code':
        return (
          <div
            key={key}
            style={{
              margin: '0.9rem 0',
              borderRadius: 'var(--radius-md, 6px)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle, #DED4C4)',
              backgroundColor: '#1E1B18',
              maxWidth: '100%',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {token.lang && (
              <div
                style={{
                  padding: '0.35rem 0.85rem',
                  backgroundColor: '#171513',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.72rem',
                  color: 'var(--color-warm-gold, #C5A46D)',
                  fontFamily: 'ui-monospace, monospace',
                  textTransform: 'lowercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                {token.lang}
              </div>
            )}
            <pre
              style={{
                margin: 0,
                padding: '0.85rem 1rem',
                overflowX: 'auto',
                maxWidth: '100%',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.825rem',
                lineHeight: 1.55,
                color: '#F5F0E8',
                whiteSpace: 'pre',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <code>{token.text}</code>
            </pre>
          </div>
        );

      case 'list': {
        const ListTag = token.ordered ? 'ol' : 'ul';
        return (
          <ListTag
            key={key}
            start={token.ordered ? token.start || 1 : undefined}
            style={{
              margin: '0.65rem 0',
              paddingLeft: '1.4rem',
              listStyleType: token.ordered ? 'decimal' : 'disc',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            {token.items?.map((item, iIdx) => (
              <li
                key={`${key}-li-${iIdx}`}
                style={{
                  lineHeight: 1.55,
                  wordBreak: 'break-word',
                }}
              >
                {renderTokens(item.tokens || [{ type: 'text', text: item.text }], `${key}-li-${iIdx}`)}
              </li>
            ))}
          </ListTag>
        );
      }

      case 'list_item':
        return (
          <li key={key} style={{ lineHeight: 1.55, wordBreak: 'break-word' }}>
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-item`)}
          </li>
        );

      case 'table':
        return (
          <div
            key={key}
            style={{
              margin: '1.15rem 0',
              overflowX: 'auto',
              width: '100%',
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-subtle, #DED4C4)',
              boxShadow: '0 1px 3px rgba(23, 21, 19, 0.03)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                textAlign: 'left',
                backgroundColor: 'var(--color-white, #FFFFFF)',
                minWidth: '400px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-warm-ivory-light, #FAF7F2)',
                    borderBottom: '1px solid var(--border-subtle, #DED4C4)',
                  }}
                >
                  {token.header?.map((cell, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        fontWeight: 600,
                        color: 'var(--color-primary-dark, #171513)',
                        textAlign: cell.align || token.align?.[cIdx] || 'left',
                        borderRight: cIdx < token.header.length - 1 ? '1px solid var(--border-subtle, #DED4C4)' : 'none',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {renderTokens(cell.tokens || [{ type: 'text', text: cell.text }], `${key}-th-${cIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {token.rows?.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      backgroundColor: rIdx % 2 === 1 ? 'var(--color-warm-ivory-light, #FAF7F2)' : 'var(--color-white, #FFFFFF)',
                      borderBottom: rIdx < token.rows.length - 1 ? '1px solid var(--border-subtle, #DED4C4)' : 'none',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '0.6rem 0.85rem',
                          color: 'var(--text-primary, #171513)',
                          textAlign: cell.align || token.align?.[cIdx] || 'left',
                          borderRight: cIdx < row.length - 1 ? '1px solid var(--border-subtle, #DED4C4)' : 'none',
                          lineHeight: 1.5,
                        }}
                      >
                        {renderTokens(cell.tokens || [{ type: 'text', text: cell.text }], `${key}-td-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'link': {
        const safe = isSafeUrl(token.href);
        const linkChildren = renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-a`);

        if (safe) {
          return (
            <a
              key={key}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              title={token.title || undefined}
              style={{
                color: 'var(--color-terracotta, #B86F52)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                fontWeight: 500,
                wordBreak: 'break-word',
                cursor: 'pointer',
              }}
            >
              {linkChildren}
            </a>
          );
        }
        return (
          <span key={key} style={{ textDecoration: 'underline' }}>
            {linkChildren}
          </span>
        );
      }

      case 'blockquote':
        return (
          <blockquote
            key={key}
            style={{
              margin: '0.85rem 0',
              padding: '0.55rem 1rem',
              borderLeft: '3px solid var(--color-terracotta, #B86F52)',
              backgroundColor: 'rgba(184, 111, 82, 0.05)',
              borderRadius: '0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0',
              fontStyle: 'italic',
              color: 'var(--text-secondary, #5A534C)',
              lineHeight: 1.6,
            }}
          >
            {renderTokens(token.tokens || [{ type: 'text', text: token.text }], `${key}-bq`)}
          </blockquote>
        );

      case 'hr':
        return (
          <hr
            key={key}
            style={{
              border: 'none',
              borderTop: '1px solid var(--border-subtle, #DED4C4)',
              margin: '1.25rem 0',
            }}
          />
        );

      case 'br':
        return <br key={key} />;

      case 'html': {
        const rawHtml = token.text || token.raw || '';
        // Safe conversion of <br> tags
        if (/^<br\s*\/?>$/i.test(rawHtml.trim())) {
          return <br key={key} />;
        }
        if (/^<hr\s*\/?>$/i.test(rawHtml.trim())) {
          return (
            <hr
              key={key}
              style={{
                border: 'none',
                borderTop: '1px solid var(--border-subtle, #DED4C4)',
                margin: '1.25rem 0',
              }}
            />
          );
        }
        // For other HTML: strip tags and render safe text content
        const stripped = rawHtml.replace(/<[^>]*>/g, '').trim();
        return stripped ? <span key={key}>{decodeEntities(stripped)}</span> : null;
      }

      default:
        if (token.text) {
          return <React.Fragment key={key}>{decodeEntities(token.text)}</React.Fragment>;
        }
        return null;
    }
  });
}

/**
 * Mentra AI Markdown Renderer
 * Renders assistant responses with rich academic typography, GFM tables, syntax-safe code blocks,
 * and sanitized links, without unrestricted dangerouslySetInnerHTML.
 */
export const AiMarkdownRenderer = ({ content }) => {
  if (!content || typeof content !== 'string') return null;

  try {
    const sanitized = sanitizeRawContent(content);
    const tokens = marked.lexer(sanitized);

    return (
      <div
        className="mentra-ai-markdown"
        style={{
          color: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {renderTokens(tokens)}
      </div>
    );
  } catch (err) {
    console.warn('Mentra AI Markdown parsing error, falling back to safe plain text:', err);
    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
        {content}
      </div>
    );
  }
};

export default AiMarkdownRenderer;
