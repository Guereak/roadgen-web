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
  const [generatedImage, setGeneratedImage] = useState(null)
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
        setGeneratedImage(result.data.imageUrl)
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

      {generatedImage && (
        <div className="image-viewer-overlay" onClick={() => setGeneratedImage(null)}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-header">
              <h3>Generated Road Network</h3>
              <button className="close-button" onClick={() => setGeneratedImage(null)}>
                ✕
              </button>
            </div>
            <div className="image-viewer-body">
              <img src={generatedImage} alt="Generated road network" />
            </div>
            <div className="image-viewer-footer">
              <a href={generatedImage} download="generated_road_network.png" className="download-button">
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
