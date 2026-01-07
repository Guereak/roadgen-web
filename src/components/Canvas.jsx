import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import './Canvas.css'

const Canvas = forwardRef(({ currentClass, currentTool, brushSize, zoom, theme, classColors }, ref) => {
  const canvasRef = useRef(null)
  const gridCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastDrawPos = useRef({ x: 0, y: 0 })

  const CANVAS_SIZE = 4096
  const CENTER_OFFSET = CANVAS_SIZE / 2

  // Helper function to get background color based on theme
  const getBgColor = () => theme === 'light' ? '#FFFFFF' : '#000000'
  const getGridColor = () => theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)'

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

  const drawGrid = useCallback(() => {
    const gridCanvas = gridCanvasRef.current
    if (!gridCanvas) return

    const ctx = gridCanvas.getContext('2d')
    const gridSize = 64

    // Clear the grid canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize)

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

  // Initialize grid canvas
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current
    if (!gridCanvas) return

    const ctx = gridCanvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    // Draw initial grid
    drawGrid()
  }, [canvasSize, drawGrid])

  // Initialize drawing canvas only once with transparent background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Disable anti-aliasing for solid colors
    ctx.imageSmoothingEnabled = false

    // Clear to transparent - no grid on this canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // Save initial state
    const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize)
    setHistory([imageData])
    setHistoryIndex(0)
  }, [canvasSize])

  // Redraw grid when theme changes
  useEffect(() => {
    drawGrid()
  }, [theme, drawGrid])

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
        // Limit history to 10 states to prevent memory issues
        if (newHistory.length > 10) {
          newHistory.shift()
          return newHistory
        }
        return newHistory
      })

      // Adjust index if we hit the limit
      return Math.min(newIndex, 9)
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

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvasSize, canvasSize)
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

      // Fill with current theme background color
      exportCtx.fillStyle = getBgColor()
      exportCtx.fillRect(0, 0, width, height)

      const sourceX = Math.max(0, minX - 50)
      const sourceY = Math.max(0, minY - 50)

      // Draw the transparent canvas content over the background
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
    sendToAPI: async () => {
      const canvas = canvasRef.current
      if (!canvas) return { success: false, error: 'Canvas not found' }

      const { minX, minY, maxX, maxY } = bounds

      if (maxX <= 0 || maxY <= 0) {
        return { success: false, error: 'Nothing to send! Draw something first.' }
      }

      const width = Math.max(256, Math.ceil((maxX - minX + 100) / 64) * 64)
      const height = Math.max(256, Math.ceil((maxY - minY + 100) / 64) * 64)

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = width
      exportCanvas.height = height
      const exportCtx = exportCanvas.getContext('2d')

      // Fill with current theme background color
      exportCtx.fillStyle = getBgColor()
      exportCtx.fillRect(0, 0, width, height)

      const sourceX = Math.max(0, minX - 50)
      const sourceY = Math.max(0, minY - 50)

      // Draw the transparent canvas content over the background
      exportCtx.drawImage(
        canvas,
        sourceX, sourceY, width, height,
        0, 0, width, height
      )

      return new Promise((resolve) => {
        exportCanvas.toBlob(async (blob) => {
          try {
            const formData = new FormData()
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
            const filename = `segmentation_mask_${width}x${height}_${timestamp}.png`
            formData.append('file', blob, filename)
            formData.append('width', width)
            formData.append('height', height)

            const response = await fetch('http://localhost:8000/api/upload', {
              method: 'POST',
              body: formData
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            resolve({ success: true, data })
          } catch (error) {
            resolve({ success: false, error: error.message })
          }
        }, 'image/png')
      })
    },
    resetView: () => {
      setOffset(getInitialOffset())
    }
  }), [bounds, canvasSize, saveState, undo, redo, historyIndex, history.length])

  const draw = (clientX, clientY, isFirstPoint = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Convert screen coordinates to canvas coordinates
    const x = (clientX - rect.left) / zoom
    const y = (clientY - rect.top) / zoom

    const ctx = canvas.getContext('2d')

    // Ensure anti-aliasing is disabled
    ctx.imageSmoothingEnabled = false

    if (currentTool === 'eraser') {
      // Eraser will clear to transparent
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      const color = classColors[currentClass]
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
    }

    // Determine if we should draw square (buildings) or circle (roads/eraser)
    const useSquare = currentClass === 'buildings' && currentTool === 'brush'

    // Helper function to draw a filled circle with solid edges using pixel manipulation
    const drawSolidCircle = (centerX, centerY, radius) => {
      const color = currentTool === 'eraser'
        ? { r: 0, g: 0, b: 0, a: 0 } // Transparent for eraser
        : { ...classColors[currentClass], a: 255 }

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
            pixels[index + 3] = color.a
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
    if (isDrawing.current) {
      // Save state after any drawing operation
      saveState()
    }

    isDrawing.current = false
    isPanning.current = false
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()

    // Pan with trackpad scrolling
    setOffset(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY
    }))
  }, [])

  // Add wheel event listener with passive: false
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return (
    <div ref={containerRef} className="canvas-wrapper" style={{ backgroundColor: getBgColor() }}>
      <canvas
        ref={gridCanvasRef}
        width={canvasSize}
        height={canvasSize}
        className="grid-canvas"
        style={{
          position: 'absolute',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="drawing-canvas"
        style={{
          position: 'absolute',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          cursor: isPanning.current ? 'grabbing' : currentTool === 'eraser' ? 'crosshair' : 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
