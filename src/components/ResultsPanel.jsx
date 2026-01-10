import { useState, useRef, useEffect } from 'react'
import './ResultsPanel.css'

const ResultsPanel = ({
  isOpen,
  onClose,
  currentResult,
  history,
  onSelectHistory,
  onRegenerate,
  isRegenerating,
  inputMask
}) => {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const sliderRef = useRef(null)

  const handleSliderDrag = (e) => {
    if (!isDragging && e.type !== 'mousedown') return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    handleSliderDrag(e)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleSliderDrag(e)
    }
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const handleDownload = () => {
    if (!currentResult) return

    const a = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    a.href = currentResult.imageUrl
    a.download = `generated_road_network_${timestamp}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!isOpen) return null

  return (
    <div className={`results-panel ${isOpen ? 'open' : ''}`}>
      <div className="results-header">
        <div className="results-title-section">
          <h2>Generated Result</h2>
          <span className="result-count">{history.length} {history.length === 1 ? 'generation' : 'generations'}</span>
        </div>
        <button className="collapse-btn" onClick={onClose} title="Close panel">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="results-content">
        {currentResult && (
          <>
            {/* Main comparison view */}
            <div
              className="comparison-container"
              ref={containerRef}
            >
              {/* Before image (input mask) */}
              <div className="comparison-image before-image">
                {inputMask ? (
                  <img src={inputMask} alt="Input mask" />
                ) : (
                  <div className="placeholder">No input mask</div>
                )}
              </div>

              {/* After image (generated result) */}
              <div
                className="comparison-image after-image"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img src={currentResult.imageUrl} alt="Generated result" />
              </div>

              {/* Slider control */}
              <div
                className="comparison-slider"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
                ref={sliderRef}
              >
                <div className="slider-line" />
                <div className="slider-handle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="comparison-labels">
                <span className="label-before">Input</span>
                <span className="label-after">Generated</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="results-actions">
              <button
                className="action-button regenerate-btn"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <span className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.65 2.35A7 7 0 1 0 14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M14 4V1M14 4h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Regenerate
                  </>
                )}
              </button>
              <button
                className="action-button download-btn"
                onClick={handleDownload}
                disabled={isRegenerating}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10M8 10V2M8 10L5.5 7.5M8 10l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download
              </button>
            </div>

            {/* History thumbnails */}
            {history.length > 1 && (
              <div className="results-history">
                <label>Recent Generations</label>
                <div className="history-thumbnails">
                  {history.slice().reverse().map((item, index) => (
                    <button
                      key={item.id}
                      className={`thumbnail ${item.id === currentResult.id ? 'active' : ''}`}
                      onClick={() => onSelectHistory(item)}
                      title={`Generation ${history.length - index}`}
                    >
                      <img src={item.imageUrl} alt={`Generation ${history.length - index}`} />
                      <div className="thumbnail-overlay">
                        {item.id === currentResult.id && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5"/>
                            <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!currentResult && (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 44l12-12 8 8 16-16 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="44" cy="24" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <h3>No Results Yet</h3>
            <p>Generate a road network to see results here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPanel
