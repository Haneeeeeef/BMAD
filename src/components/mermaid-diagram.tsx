"use client"

import * as React from "react"
import mermaid from "mermaid"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

// Initialize mermaid with config
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "inherit",
})

interface MermaidDiagramProps {
  chart: string
  className?: string
}

// Memoized to prevent re-renders on parent scroll/type
export const MermaidDiagram = React.memo(function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const [svg, setSvg] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)
  const lastChartRef = React.useRef<string>("")

  React.useEffect(() => {
    // Debounce rendering to prevent flashing during streaming
    const trimmedChart = chart.trim()

    // Skip if chart hasn't actually changed
    if (trimmedChart === lastChartRef.current) return

    const timeoutId = setTimeout(async () => {
      if (!trimmedChart) return

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, trimmedChart)
        setSvg(svg)
        setError(null)
        lastChartRef.current = trimmedChart
      } catch (err) {
        // Only show error if chart looks complete (has end markers)
        if (trimmedChart.includes("end") || trimmedChart.includes("-->")) {
          console.error("Mermaid render error:", err)
          setError("Failed to render diagram")
        }
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [chart])

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-sm text-destructive">
        {error}
        <pre className="mt-2 text-xs opacity-70 overflow-x-auto">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50 animate-pulse">
        Loading diagram...
      </div>
    )
  }

  return (
    <div className={className}>
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={4}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div
            className="relative border rounded-lg overflow-hidden bg-white"
            style={{ height: "400px" }}
          >
            {/* Zoom controls - bottom left overlay */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border">
              <button
                onClick={() => zoomIn()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.chart.trim() === nextProps.chart.trim() && prevProps.className === nextProps.className
})
