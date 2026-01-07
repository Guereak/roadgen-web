import './Toolbar.css'

function Toolbar({
  currentClass,
  currentTool,
  brushSize,
  fillBuildings,
  zoom,
  classColors,
  onClassChange,
  onToolChange,
  onBrushSizeChange,
  onFillBuildingsChange,
  onZoomChange
}) {
  const getCurrentColor = () => {
    if (currentTool === 'eraser') {
      return { r: 0, g: 0, b: 0 }
    }
    return classColors[currentClass]
  }

  const color = getCurrentColor()
  const previewSize = Math.min(brushSize, 40)

  return (
    <div className="toolbar">
      <div className="control-group">
        <label>Class</label>
        <div className="button-group">
          <button
            className={`class-btn roads ${currentClass === 'roads' ? 'active' : ''}`}
            onClick={() => onClassChange('roads')}
            style={{ paddingLeft: '24px' }}
          >
            Roads
          </button>
          <button
            className={`class-btn buildings ${currentClass === 'buildings' ? 'active' : ''}`}
            onClick={() => onClassChange('buildings')}
            style={{ paddingLeft: '24px' }}
          >
            Buildings
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Tool</label>
        <div className="tool-group">
          <button
            className={`tool-btn ${currentTool === 'brush' ? 'active' : ''}`}
            onClick={() => onToolChange('brush')}
          >
            Brush
          </button>
          <button
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
          >
            Eraser
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Brush Size: {brushSize}px</label>
        <input
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>Zoom: {Math.round(zoom * 100)}%</label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>Preview</label>
        <div className="brush-preview">
          <div
            className="brush-preview-inner"
            style={{
              width: `${previewSize}px`,
              height: `${previewSize}px`,
              background: `rgb(${color.r}, ${color.g}, ${color.b})`,
              borderRadius: currentClass === 'buildings' && currentTool === 'brush' ? '0' : '50%'
            }}
          />
        </div>
      </div>

      <div className="control-group">
        <label>Options</label>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={fillBuildings}
              onChange={(e) => onFillBuildingsChange(e.target.checked)}
            />
            <span>Fill Buildings</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
