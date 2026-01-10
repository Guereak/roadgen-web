import { useState, useRef, useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import ResultsPanel from './components/ResultsPanel'
import './App.css'

function App() {
  const [currentClass, setCurrentClass] = useState('roads')
  const [currentTool, setCurrentTool] = useState('brush')
  const [brushSizes, setBrushSizes] = useState({
    roads: 7,
    buildings: 12
  })
  const [zoom, setZoom] = useState(1)
  const [theme, setTheme] = useState('light')
  const [isUploading, setIsUploading] = useState(false)
  const [generationHistory, setGenerationHistory] = useState([])
  const [currentResult, setCurrentResult] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [inputMaskUrl, setInputMaskUrl] = useState(null)
  const canvasRef = useRef(null)
  const nextIdRef = useRef(1)

  const classColors = {
    roads: { r: 255, g: 0, b: 0 },
    buildings: { r: 0, g: 255, b: 0 }
  }

  const handleBrushSizeChange = (newSize) => {
    setBrushSizes(prev => ({
      ...prev,
      [currentClass]: newSize
    }))
  }

  const handleClear = () => {
    if (window.confirm('Clear the entire canvas?')) {
      canvasRef.current?.clear()
    }
  }

  const handleSave = () => {
    canvasRef.current?.save()
  }

  const handleSendToAPI = async () => {
    if (isUploading) return

    setIsUploading(true)
    try {
      const result = await canvasRef.current?.sendToAPI()

      if (result?.success) {
        // Create a new generation entry
        const newGeneration = {
          id: nextIdRef.current++,
          imageUrl: result.data.imageUrl,
          blob: result.data.blob,
          timestamp: new Date().toISOString()
        }

        // Update history (keep last 5 generations)
        setGenerationHistory(prev => {
          const updated = [...prev, newGeneration]
          return updated.slice(-5)
        })

        // Set as current result
        setCurrentResult(newGeneration)

        // Open the results panel
        setIsPanelOpen(true)

        // Store the input mask URL for comparison
        // We'll create a blob URL from the canvas
        const maskBlob = result.data.inputBlob
        if (maskBlob) {
          const maskUrl = URL.createObjectURL(maskBlob)
          setInputMaskUrl(maskUrl)
        }
      } else {
        alert(`Failed to upload: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Error uploading: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRegenerate = async () => {
    await handleSendToAPI()
  }

  const handleSelectHistory = (item) => {
    setCurrentResult(item)
  }

  const handleClosePanel = () => {
    setIsPanelOpen(false)
  }

  const handleResetView = () => {
    canvasRef.current?.resetView()
  }

  const handleUndo = () => {
    canvasRef.current?.undo()
  }

  const handleRedo = () => {
    canvasRef.current?.redo()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        canvasRef.current?.undo()
      } else if (isCtrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        canvasRef.current?.redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`app ${theme}`}>
      <Toolbar
        currentClass={currentClass}
        currentTool={currentTool}
        brushSize={brushSizes[currentClass]}
        zoom={zoom}
        theme={theme}
        classColors={classColors}
        onClassChange={setCurrentClass}
        onToolChange={setCurrentTool}
        onBrushSizeChange={handleBrushSizeChange}
        onZoomChange={setZoom}
        onThemeChange={setTheme}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onResetView={handleResetView}
        onClear={handleClear}
        onSave={handleSave}
        onSendToAPI={handleSendToAPI}
        isUploading={isUploading}
      />

      <div className={`canvas-container ${isPanelOpen ? 'split' : ''}`}>
        <Canvas
          ref={canvasRef}
          currentClass={currentClass}
          currentTool={currentTool}
          brushSize={brushSizes[currentClass]}
          zoom={zoom}
          theme={theme}
          classColors={classColors}
        />
      </div>

      <ResultsPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        currentResult={currentResult}
        history={generationHistory}
        onSelectHistory={handleSelectHistory}
        onRegenerate={handleRegenerate}
        isRegenerating={isUploading}
        inputMask={inputMaskUrl}
      />
    </div>
  )
}

export default App
