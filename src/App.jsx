import { useState, useRef } from 'react'
import Canvas from './components/Canvas'
import Toolbar from './components/Toolbar'
import './App.css'

function App() {
  const [currentClass, setCurrentClass] = useState('roads')
  const [currentTool, setCurrentTool] = useState('brush')
  const [brushSize, setBrushSize] = useState(7)
  const [fillBuildings, setFillBuildings] = useState(false)
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef(null)

  const classColors = {
    roads: { r: 255, g: 0, b: 0 },
    buildings: { r: 0, g: 255, b: 0 }
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Segmentation Mask Editor</h1>
        <div className="header-actions">
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
        brushSize={brushSize}
        fillBuildings={fillBuildings}
        zoom={zoom}
        classColors={classColors}
        onClassChange={setCurrentClass}
        onToolChange={setCurrentTool}
        onBrushSizeChange={setBrushSize}
        onFillBuildingsChange={setFillBuildings}
        onZoomChange={setZoom}
      />

      <Canvas
        ref={canvasRef}
        currentClass={currentClass}
        currentTool={currentTool}
        brushSize={brushSize}
        fillBuildings={fillBuildings}
        zoom={zoom}
        classColors={classColors}
      />
    </div>
  )
}

export default App
