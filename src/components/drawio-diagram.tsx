"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2, ExternalLink, Upload, ZoomIn, ZoomOut, Maximize2, Minimize2, X } from "lucide-react"
import { toast } from "sonner"
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch"

// Self-hosted draw.io on VPS (Docker: jgraph/drawio on port 8090)
const DRAWIO_URL = process.env.NEXT_PUBLIC_DRAWIO_URL || "http://178.156.216.77:8090"

// Lazy-load mermaid for SVG rendering
type MermaidAPI = typeof import("mermaid").default
let mermaidInstance: MermaidAPI | null = null
let mermaidInitialized = false

async function getMermaid(): Promise<MermaidAPI> {
  if (!mermaidInstance) {
    const mod = await import("mermaid")
    mermaidInstance = mod.default
  }
  if (!mermaidInitialized) {
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "inherit",
    })
    mermaidInitialized = true
  }
  return mermaidInstance
}

// Extract SVG intrinsic dimensions from viewBox or width/height attributes
function getSvgDimensions(svgStr: string): { w: number; h: number } | null {
  const vb = svgStr.match(/viewBox="[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/)
  if (vb) return { w: parseFloat(vb[1]), h: parseFloat(vb[2]) }
  const wm = svgStr.match(/width="([\d.]+)/)
  const hm = svgStr.match(/height="([\d.]+)/)
  if (wm && hm) return { w: parseFloat(wm[1]), h: parseFloat(hm[1]) }
  return null
}

interface DrawioDiagramProps {
  chart?: string    // Mermaid code
  xml?: string      // draw.io XML
  className?: string
  onUpload?: (newXml: string) => void  // Called when user uploads edited .drawio file
}

export const DrawioDiagram = React.memo(function DrawioDiagram({
  chart,
  xml,
  className,
  onUpload,
}: DrawioDiagramProps) {
  const [svg, setSvg] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [fullscreen, setFullscreen] = React.useState(false)
  const lastChartRef = React.useRef("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close fullscreen on Escape
  React.useEffect(() => {
    if (!fullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [fullscreen])

  // Render mermaid to SVG
  React.useEffect(() => {
    if (!chart) return
    const trimmed = chart.trim()
    if (trimmed === lastChartRef.current) return

    const timer = setTimeout(async () => {
      if (!trimmed) return
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const mermaid = await getMermaid()
        const result = await mermaid.render(id, trimmed)
        setSvg(result.svg)
        setError(null)
        lastChartRef.current = trimmed
      } catch (err) {
        if (trimmed.includes("end") || trimmed.includes("-->") || trimmed.includes("---")) {
          console.error("Diagram render error:", err)
          setError("Failed to render diagram")
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [chart])

  // "Edit in draw.io" — opens draw.io and copies mermaid source
  const handleEditInDrawio = React.useCallback(() => {
    if (!chart) return
    const url = `${DRAWIO_URL}/#`
    window.open(url, "_blank")
    navigator.clipboard.writeText(chart.trim()).catch(() => {})
  }, [chart])

  // Calculate scale to fit SVG into container
  const calcFitScale = React.useCallback((containerW: number, containerH: number) => {
    const dims = getSvgDimensions(svg)
    if (!dims) return 1
    const scaleX = containerW / dims.w
    const scaleY = containerH / dims.h
    return Math.min(scaleX, scaleY) * 0.9 // 90% to leave breathing room
  }, [svg])

  // draw.io XML hooks (must be top-level, not inside if)
  const iframeXmlRef = React.useRef<HTMLIFrameElement>(null)
  const [xmlIframeReady, setXmlIframeReady] = React.useState(false)

  // Deflate + base64 encode XML for draw.io viewer URL (#R format)
  const deflatedXml = React.useMemo(() => {
    if (!xml) return ""
    try {
      const pako = require("pako")
      const compressed: Uint8Array = pako.deflateRaw(xml)
      let binary = ""
      for (let i = 0; i < compressed.length; i++) {
        binary += String.fromCharCode(compressed[i])
      }
      return btoa(binary)
    } catch { return "" }
  }, [xml])

  React.useEffect(() => {
    if (!xml) return
    const handler = (evt: MessageEvent) => {
      if (evt.source !== iframeXmlRef.current?.contentWindow) return
      if (!evt.data || typeof evt.data !== "string") return
      try {
        const msg = JSON.parse(evt.data)
        if (msg.event === "init") {
          setXmlIframeReady(true)
          iframeXmlRef.current?.contentWindow?.postMessage(
            JSON.stringify({ action: "load", xml, autosave: 0 }),
            "*"
          )
        }
      } catch {}
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [xml])

  React.useEffect(() => {
    if (!xml || !xmlIframeReady) return
    iframeXmlRef.current?.contentWindow?.postMessage(
      JSON.stringify({ action: "load", xml, autosave: 0 }),
      "*"
    )
  }, [xml, xmlIframeReady])


  // draw.io XML rendering
  if (xml) {
    // Convert draw.io XML to a renderable SVG by wrapping in foreignObject
    // This is a lightweight approach — just shows the XML structure as an embedded page
    const handleOpenInDrawio = () => {
      // Create a blob URL for the .drawio file and open draw.io with it
      const blob = new Blob([xml], { type: "application/xml" })
      const blobUrl = URL.createObjectURL(blob)
      // Open draw.io — user can File > Open from URL or drag-drop
      window.open("https://app.diagrams.net", "_blank")
      // Also trigger download so they have the file
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = "diagram.drawio"
      a.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    }

    const viewerUrl = deflatedXml
      ? `https://viewer.diagrams.net/?nav=1&highlight=0000ff&page=0&toolbar-position=top&toolbar=0#R${encodeURIComponent(deflatedXml)}`
      : ""

    const xmlContent = (
      <div
        className="relative border rounded-lg overflow-hidden bg-white"
        style={{ height: fullscreen ? "100%" : "800px" }}
      >
        {/* Controls — top right */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border">
          <button
            onClick={handleOpenInDrawio}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            aria-label="Edit in draw.io"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Edit
          </button>
          {onUpload && (
            <>
              <label className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                File
                <input
                  type="file"
                  accept=".drawio,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      const content = ev.target?.result as string
                      if (content) {
                        onUpload(content)
                        toast.success("Diagram imported and saved")
                      }
                    }
                    reader.readAsText(file)
                    e.target.value = ""
                  }}
                />
              </label>
              <button
                onClick={async () => {
                  const text = await navigator.clipboard.readText().catch(() => "")
                  const url = text.trim()
                  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
                    toast.error("Copy a .drawio URL to clipboard first, then click Import URL")
                    return
                  }
                  try {
                    const res = await fetch(url)
                    if (!res.ok) throw new Error("Failed to fetch")
                    const content = await res.text()
                    if (content.includes("<mxGraphModel") || content.includes("<mxfile")) {
                      onUpload(content)
                      toast.success("Diagram imported from URL and saved")
                    } else {
                      toast.error("Not a valid .drawio file")
                    }
                  } catch {
                    toast.error("Failed to fetch from clipboard URL")
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Copy a .drawio URL to clipboard, then click this"
              >
                URL
              </button>
            </>
          )}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {viewerUrl ? (
          <iframe
            src={viewerUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              transformOrigin: "0 0",
            }}
            title="draw.io diagram"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Diagram too large to preview
          </div>
        )}
      </div>
    )

    if (fullscreen) {
      return (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-6"
          onKeyDown={(e) => { if (e.key === "Escape") setFullscreen(false) }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {xmlContent}
        </div>
      )
    }

    return <div className={className}>{xmlContent}</div>
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-sm text-destructive">
        {error}
        {chart && <pre className="mt-2 text-xs opacity-70 overflow-x-auto whitespace-pre-wrap">{chart}</pre>}
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Rendering diagram...</span>
      </div>
    )
  }

  // Fullscreen: auto-fit to viewport. Inline: natural scale (1).
  const inlineHeight = 400
  const fsW = typeof window !== "undefined" ? window.innerWidth - 48 : 1200
  const fsH = typeof window !== "undefined" ? window.innerHeight - 48 : 800
  const fsScale = calcFitScale(fsW, fsH)

  const diagramContent = (
    <TransformWrapper
      key={fullscreen ? "fs" : "inline"}
      initialScale={fullscreen ? fsScale : 1}
      minScale={0.1}
      maxScale={10}
      centerOnInit={true}
      wheel={{ step: 0.15 }}
      panning={{ velocityDisabled: false }}
    >
      {({ zoomIn, zoomOut, resetTransform, centerView }) => (
        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-white"
          style={{ height: fullscreen ? "100%" : `${inlineHeight}px` }}
        >
          {/* Controls — bottom left */}
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
              onClick={() => {
                // Fit to container
                const el = containerRef.current
                if (el) {
                  const s = calcFitScale(el.clientWidth, el.clientHeight)
                  resetTransform()
                  setTimeout(() => centerView(s), 50)
                }
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              aria-label="Fit to screen"
              title="Fit to screen"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Top right — expand / edit */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border">
            {fullscreen && (
              <button
                onClick={handleEditInDrawio}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                aria-label="Edit in draw.io"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Edit in draw.io
              </button>
            )}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
  )

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-6">
        {diagramContent}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Edit button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleEditInDrawio}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          aria-label="Edit in draw.io"
        >
          <ExternalLink className="h-3 w-3" />
          Edit in draw.io
        </button>
      </div>
      {diagramContent}
    </div>
  )
}, (prev, next) => {
  return prev.chart?.trim() === next.chart?.trim() &&
    prev.xml === next.xml &&
    prev.className === next.className
})
