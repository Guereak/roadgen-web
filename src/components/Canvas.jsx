import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import './Canvas.css'

const Canvas = forwardRef(({ currentClass, currentTool, brushSize, fillBuildings, zoom, theme, classColors }, ref) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastDrawPos = useRef({ x: 0, y: 0 })
  const strokePoints = useRef([])

  const CANVAS_SIZE = 8192
  const CENTER_OFFSET = CANVAS_SIZE / 2

  // Helper function to get background color based on theme
  const getBgColor = () => theme === 'light' ? '#FFFFFF' : '#000000'
  const getGridColor = () => theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'

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
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Initialize canvas only once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Disable anti-aliasing for solid colors
    ctx.imageSmoothingEnabled = false

    ctx.fillStyle = getBgColor()
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    drawGrid()

    // Save initial state
    const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize)
    setHistory([imageData])
    setHistoryIndex(0)
  }, [canvasSize])

  // Handle theme changes - preserve drawn content, only change background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Skip on initial mount
    if (history.length === 0) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize)
    const pixels = imageData.data

    const newBgColor = theme === 'light' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }

    // Replace only background pixels, preserve roads and buildings
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      // Check if this is a background pixel (close to old background color)
      const isBackground = theme === 'light'
        ? (r < 50 && g < 50 && b < 50)  // Was dark, changing to light
        : (r > 200 && g > 200 && b > 200)  // Was light, changing to dark

      if (isBackground) {
        pixels[i] = newBgColor.r
        pixels[i + 1] = newBgColor.g
        pixels[i + 2] = newBgColor.b
      }
    }

    ctx.putImageData(imageData, 0, 0)
    drawGrid()

    // Update history with the theme-changed state
    saveState()
  }, [theme])

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const gridSize = 64

    ctx.strokeStyle = getGridColor()
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
  }, [canvasSize, theme])

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

  const saveState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize)

    setHistoryIndex(prev => {
      const newIndex = prev + 1

      setHistory(prevHistory => {
        // Remove any future states if we're not at the end of history
        const newHistory = prevHistory.slice(0, prev + 1)
        // Add new state
        newHistory.push(imageData)
        // Limit history to 50 states to prevent memory issues
        if (newHistory.length > 50) {
          newHistory.shift()
          return newHistory
        }
        return newHistory
      })

      // Adjust index if we hit the limit
      return Math.min(newIndex, 49)
    })
  }, [canvasSize])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      const prevState = history[historyIndex - 1]
      ctx.putImageData(prevState, 0, 0)
      setHistoryIndex(prev => prev - 1)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      const nextState = history[historyIndex + 1]
      ctx.putImageData(nextState, 0, 0)
      setHistoryIndex(prev => prev + 1)
    }
  }, [history, historyIndex])

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

    // Helper function to check if a pixel is "empty" (background color, ignoring grid)
    const isEmptyPixel = (r, g, b) => {
      // Roads are (255, 0, 0), Buildings are (0, 255, 0)
      // Empty is close to background color - allowing some tolerance for grid
      if (theme === 'light') {
        // In light mode, empty is white or close to white
        return r > 200 && g > 200 && b > 200
      } else {
        // In dark mode, empty is black or close to black
        return r < 50 && g < 50 && b < 50
      }
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
  }, [canvasSize, drawGrid, theme])

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = getBgColor()
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      drawGrid()
      setBounds({ minX: canvasSize, minY: canvasSize, maxX: 0, maxY: 0 })
      saveState()
    },
    undo: () => {
      undo()
    },
    redo: () => {
      redo()
    },
    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,
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

      exportCtx.fillStyle = getBgColor()
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
  }), [bounds, canvasSize, drawGrid, saveState, undo, redo, historyIndex, history.length])

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

    // Ensure anti-aliasing is disabled
    ctx.imageSmoothingEnabled = false

    if (currentTool === 'eraser') {
      ctx.fillStyle = getBgColor()
    } else {
      const color = classColors[currentClass]
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    }

    // Determine if we should draw square (buildings) or circle (roads/eraser)
    const useSquare = currentClass === 'buildings' && currentTool === 'brush'

    // Helper function to draw a filled circle with solid edges using pixel manipulation
    const drawSolidCircle = (centerX, centerY, radius) => {
      const color = currentTool === 'eraser'
        ? (theme === 'light' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 })
        : classColors[currentClass]

      const radiusSquared = radius * radius
      const minX = Math.max(0, Math.floor(centerX - radius))
      const maxX = Math.min(canvasSize - 1, Math.ceil(centerX + radius))
      const minY = Math.max(0, Math.floor(centerY - radius))
      const maxY = Math.min(canvasSize - 1, Math.ceil(centerY + radius))

      // Only get the pixels we need to modify (a small rectangle around the circle)
      const width = maxX - minX + 1
      const height = maxY - minY + 1

      if (width <= 0 || height <= 0) return

      const imageData = ctx.getImageData(minX, minY, width, height)
      const pixels = imageData.data

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const actualX = minX + px
          const actualY = minY + py
          const dx = actualX - centerX
          const dy = actualY - centerY
          const distSquared = dx * dx + dy * dy

          if (distSquared <= radiusSquared) {
            const index = (py * width + px) * 4
            pixels[index] = color.r
            pixels[index + 1] = color.g
            pixels[index + 2] = color.b
            pixels[index + 3] = 255
          }
        }
      }

      ctx.putImageData(imageData, minX, minY)
    }

    if (isFirstPoint) {
      // Just draw a single point for the first position
      if (useSquare) {
        ctx.fillRect(Math.floor(x - brushSize / 2), Math.floor(y - brushSize / 2), brushSize, brushSize)
      } else {
        drawSolidCircle(x, y, brushSize / 2)
      }
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

        if (useSquare) {
          ctx.fillRect(Math.floor(interpX - brushSize / 2), Math.floor(interpY - brushSize / 2), brushSize, brushSize)
        } else {
          drawSolidCircle(interpX, interpY, brushSize / 2)
        }
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
            saveState()
          }, 50)
        } else {
          // No fill, just save the drawing
          saveState()
        }
      } else {
        // Stroke too short for fill
        saveState()
      }
    } else if (isDrawing.current) {
      // Save state after any drawing operation
      saveState()
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
