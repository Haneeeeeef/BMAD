"use client"

import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { marked } from "marked"

const REMARK_PLUGINS = [remarkGfm]

/**
 * A single markdown block, memoized so it never re-renders once finalized.
 * React.memo with default shallow comparison works because we pass a string.
 */
const MarkdownBlock = memo(
  ({ content, components }: { content: string; components?: Record<string, React.ComponentType<any>> }) => {
    return (
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {content}
      </ReactMarkdown>
    )
  },
  (prev, next) => prev.content === next.content
)
MarkdownBlock.displayName = "MarkdownBlock"

/**
 * MemoizedMarkdown: splits markdown into block-level tokens, renders each
 * as a memoized block. During streaming, only the last block re-renders.
 */
export function MemoizedMarkdown({
  content,
  components,
  className,
}: {
  content: string
  components?: Record<string, React.ComponentType<any>>
  className?: string
}) {
  // Split content into block-level tokens using marked's lexer
  const blocks = useMemo(() => {
    const tokens = marked.lexer(content)
    // Convert tokens back to their raw markdown strings
    return tokens.map((token) => token.raw)
  }, [content])

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} content={block} components={components} />
      ))}
    </div>
  )
}
