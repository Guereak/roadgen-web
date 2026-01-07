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
  const [fillBuildings, setFillBuildings] = useState(false)
  const [zoom, setZoom] = useState(1)
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
    <div className="app">
      <header className="app-header">
        <h1>Segmentation Mask Editor</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
            Undo
          </button>
          <button className="header-btn" onClick={handleRedo} title="Redo (Ctrl+Y)">
            Redo
          </button>
          <button className="header-btn" onClick={handleResetView}>
            Reset View
          </button>
          <button className="header-btn" onClick={handleClear}>
            Clear
          </button>
          <button className="header-btn primary" onClick={handleSave}>
            Export
          </button>
        </div>
      </header>

      <Toolbar
        currentClass={currentClass}
        currentTool={currentTool}
        brushSize={brushSizes[currentClass]}
        fillBuildings={fillBuildings}
        zoom={zoom}
        classColors={classColors}
        onClassChange={setCurrentClass}
        onToolChange={setCurrentTool}
        onBrushSizeChange={handleBrushSizeChange}
        onFillBuildingsChange={setFillBuildings}
        onZoomChange={setZoom}
      />

      <Canvas
        ref={canvasRef}
        currentClass={currentClass}
        currentTool={currentTool}
        brushSize={brushSizes[currentClass]}
        fillBuildings={fillBuildings}
        zoom={zoom}
        classColors={classColors}
      />
    </div>
  )
}

export default App
