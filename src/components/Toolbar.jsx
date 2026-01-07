import './Toolbar.css'

function Toolbar({
  currentClass,
  currentTool,
  brushSize,
  fillBuildings,
  zoom,
  theme,
  classColors,
  onClassChange,
  onToolChange,
  onBrushSizeChange,
  onFillBuildingsChange,
  onZoomChange,
  onThemeChange,
  onUndo,
  onRedo,
  onResetView,
  onClear,
  onSave
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
      <div className="toolbar-header">
        <h1>Segmentation Editor</h1>
        <button
          className="theme-toggle"
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="toolbar-content">
        <div className="control-group">
          <label>Class</label>
          <div className="button-group">
            <button
              className={`class-btn roads ${currentClass === 'roads' ? 'active' : ''}`}
              onClick={() => onClassChange('roads')}
            >
              <span className="class-indicator"></span>
              Roads
            </button>
            <button
              className={`class-btn buildings ${currentClass === 'buildings' ? 'active' : ''}`}
              onClick={() => onClassChange('buildings')}
            >
              <span className="class-indicator"></span>
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
          <label>Brush Size</label>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
            />
            <span className="slider-value">{brushSize}px</span>
          </div>
        </div>

        <div className="control-group">
          <label>Zoom</label>
          <div className="slider-container">
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            />
            <span className="slider-value">{Math.round(zoom * 100)}%</span>
          </div>
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

        <div className="divider"></div>

        <div className="control-group">
          <label>Actions</label>
          <div className="action-buttons">
            <button className="action-btn" onClick={onUndo} title="Undo (⌘Z)">
              Undo
            </button>
            <button className="action-btn" onClick={onRedo} title="Redo (⌘⇧Z)">
              Redo
            </button>
            <button className="action-btn" onClick={onResetView}>
              Reset View
            </button>
            <button className="action-btn danger" onClick={onClear}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar-footer">
        <button className="export-btn" onClick={onSave}>
          Export Mask
        </button>
      </div>
    </div>
  )
}

export default Toolbar
