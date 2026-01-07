import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import './Canvas.css'

const Canvas = forwardRef(({ currentClass, currentTool, brushSize, fillBuildings, zoom, classColors }, ref) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastDrawPos = useRef({ x: 0, y: 0 })
  const strokePoints = useRef([])

  const CANVAS_SIZE = 8192
  const CENTER_OFFSET = CANVAS_SIZE / 2

  // Center the view initially
  const getInitialOffset = () => {
    if (typeof window !== 'undefined') {
      return {
        x: window.innerWidth / 2 - CENTER_OFFSET,
        y: (window.innerHeight - 400) / 2 - CENTER_OFFSET
      }
    }
    return { x: 0, y: 0 }
  }

  const [offset, setOffset] = useState(getInitialOffset())
  const [bounds, setBounds] = useState({ minX: CANVAS_SIZE, minY: CANVAS_SIZE, maxX: 0, maxY: 0 })
  const [canvasSize] = useState(CANVAS_SIZE)
  const prevZoomRef = useRef(zoom)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    drawGrid()
  }, [canvasSize])

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const gridSize = 64

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1

    for (let x = 0; x < canvasSize; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasSize)
      ctx.stroke()
    }

    for (let y = 0; y < canvasSize; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasSize, y)
      ctx.stroke()
    }
  }, [canvasSize])

  useEffect(() => {
    drawGrid()
  }, [drawGrid])

  // Adjust offset when zoom changes to keep the center of viewport fixed
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prevZoom = prevZoomRef.current
    if (prevZoom === zoom) return

    const rect = container.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Calculate what canvas point is currently at the center
    const canvasX = (centerX - offset.x) / prevZoom
    const canvasY = (centerY - offset.y) / prevZoom

    // Adjust offset so the same canvas point remains at the center with new zoom
    setOffset({
      x: centerX - canvasX * zoom,
      y: centerY - canvasY * zoom
    })

    prevZoomRef.current = zoom
  }, [zoom, offset.x, offset.y])

  const updateBounds = useCallback((x, y) => {
    setBounds(prev => ({
      minX: Math.min(prev.minX, x - brushSize),
      minY: Math.min(prev.minY, y - brushSize),
      maxX: Math.max(prev.maxX, x + brushSize),
      maxY: Math.max(prev.maxY, y + brushSize)
    }))
  }, [brushSize])

  const floodFill = useCallback((startX, startY, fillColor) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize)
    const pixels = imageData.data

    const startPos = (Math.floor(startY) * canvasSize + Math.floor(startX)) * 4
    const startR = pixels[startPos]
    const startG = pixels[startPos + 1]
    const startB = pixels[startPos + 2]

    // Helper function to check if a pixel is "empty" (black or close to black, ignoring grid)
    const isEmptyPixel = (r, g, b) => {
      // A pixel is empty if it's mostly black (allowing for grid lines)
      // Roads are (255, 0, 0), Buildings are (0, 255, 0)
      // Empty is close to (0, 0, 0) - allowing some tolerance for grid
      return r < 50 && g < 50 && b < 50
    }

    // If starting pixel is not empty, don't fill
    if (!isEmptyPixel(startR, startG, startB)) {
      return
    }

    const stack = [[Math.floor(startX), Math.floor(startY)]]
    const visited = new Set()

    while (stack.length > 0) {
      const [x, y] = stack.pop()

      if (x < 0 || x >= canvasSize || y < 0 || y >= canvasSize) continue

      const key = `${x},${y}`
      if (visited.has(key)) continue
      visited.add(key)

      const pos = (y * canvasSize + x) * 4
      const r = pixels[pos]
      const g = pixels[pos + 1]
      const b = pixels[pos + 2]

      // Only fill if this pixel is empty (not a road or building)
      if (!isEmptyPixel(r, g, b)) continue

      // Fill this pixel
      pixels[pos] = fillColor.r
      pixels[pos + 1] = fillColor.g
      pixels[pos + 2] = fillColor.b
      pixels[pos + 3] = 255

      // Add neighbors to stack
      stack.push([x + 1, y])
      stack.push([x - 1, y])
      stack.push([x, y + 1])
      stack.push([x, y - 1])
    }

    ctx.putImageData(imageData, 0, 0)
    drawGrid()
  }, [canvasSize, drawGrid])

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      drawGrid()
      setBounds({ minX: canvasSize, minY: canvasSize, maxX: 0, maxY: 0 })
    },
    save: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const { minX, minY, maxX, maxY } = bounds

      if (maxX <= 0 || maxY <= 0) {
        alert('Nothing to export! Draw something first.')
        return
      }

      const width = Math.max(256, Math.ceil((maxX - minX + 100) / 64) * 64)
      const height = Math.max(256, Math.ceil((maxY - minY + 100) / 64) * 64)

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = width
      exportCanvas.height = height
      const exportCtx = exportCanvas.getContext('2d')

      exportCtx.fillStyle = '#000000'
      exportCtx.fillRect(0, 0, width, height)

      const sourceX = Math.max(0, minX - 50)
      const sourceY = Math.max(0, minY - 50)

      exportCtx.drawImage(
        canvas,
        sourceX, sourceY, width, height,
        0, 0, width, height
      )

      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        a.href = url
        a.download = `segmentation_mask_${width}x${height}_${timestamp}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 'image/png')
    },
    resetView: () => {
      setOffset(getInitialOffset())
    }
  }), [bounds, canvasSize, drawGrid])

  const draw = (clientX, clientY, isFirstPoint = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Convert screen coordinates to canvas coordinates
    const x = (clientX - rect.left) / zoom
    const y = (clientY - rect.top) / zoom

    // Track points for flood fill detection
    strokePoints.current.push({ x, y })

    const ctx = canvas.getContext('2d')

    if (currentTool === 'eraser') {
      ctx.fillStyle = '#000000'
    } else {
      const color = classColors[currentClass]
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    }

    if (isFirstPoint) {
      // Just draw a single point for the first position
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      updateBounds(x, y)
    } else {
      // Interpolate between last position and current position
      const lastX = lastDrawPos.current.x
      const lastY = lastDrawPos.current.y
      const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2)
      const steps = Math.max(1, Math.ceil(distance / (brushSize / 4)))

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const interpX = lastX + (x - lastX) * t
        const interpY = lastY + (y - lastY) * t

        ctx.beginPath()
        ctx.arc(interpX, interpY, brushSize / 2, 0, Math.PI * 2)
        ctx.fill()
        updateBounds(interpX, interpY)
      }
    }

    lastDrawPos.current = { x, y }
  }

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey) {
      isPanning.current = true
      lastPos.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    } else {
      isDrawing.current = true
      strokePoints.current = []
      draw(e.clientX, e.clientY, true)
    }
  }

  const handleMouseMove = (e) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPos.current.x
      const dy = e.clientY - lastPos.current.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPos.current = { x: e.clientX, y: e.clientY }
    } else if (isDrawing.current) {
      draw(e.clientX, e.clientY)
    }
  }

  const handleMouseUp = () => {
    // Check for closed loop and fill if conditions are met
    if (isDrawing.current && fillBuildings && currentClass === 'buildings' && currentTool === 'brush') {
      const points = strokePoints.current
      if (points.length > 10) {
        const firstPoint = points[0]
        const lastPoint = points[points.length - 1]
        const distance = Math.sqrt(
          (lastPoint.x - firstPoint.x) ** 2 + (lastPoint.y - firstPoint.y) ** 2
        )

        // If the stroke forms a closed loop (ends near where it started)
        if (distance < brushSize * 2) {
          // Calculate center point of the stroke to use as fill start point
          const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
          const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

          // Perform flood fill from the center
          const fillColor = classColors.buildings
          setTimeout(() => {
            floodFill(centerX, centerY, fillColor)
          }, 50)
        }
      }
    }

    isDrawing.current = false
    isPanning.current = false
    strokePoints.current = []
  }

  const handleWheel = (e) => {
    e.preventDefault()

    // Pan with trackpad scrolling
    setOffset(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY
    }))
  }

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="drawing-canvas"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          cursor: isPanning.current ? 'grabbing' : currentTool === 'eraser' ? 'crosshair' : 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="canvas-info">
        Zoom: {Math.round(zoom * 100)}% • Trackpad to pan • Use zoom slider to zoom (50-300%)
      </div>
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
