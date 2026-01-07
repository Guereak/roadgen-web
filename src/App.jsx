import { useState, useRef, useEffect } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
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
  const canvasRef = useRef(null)

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
        alert('Successfully uploaded to API!')
      } else {
        alert(`Failed to upload: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Error uploading: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
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
  )
}

export default App
