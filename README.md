# Segmentation Mask Editor

A beautiful, Apple-inspired React web application for creating segmentation masks for ML training. Features an infinite canvas with pan and zoom, drawing masks with separate color channels for roads (red) and buildings (green).

## Features

- **Infinite Canvas**: Draw freely without boundaries - the canvas auto-expands as needed
- **Pan & Zoom**: Smooth navigation with Cmd/Ctrl/Shift + drag to pan, scroll to zoom
- **Two-class Drawing**: Roads (RGB: 255,0,0) and Buildings (RGB: 0,255,0)
- **Drawing Tools**: Brush and eraser modes
- **Adjustable Brush Size**: 1-100 pixels with live preview
- **Smart Export**: Automatically exports only the drawn area, sized to multiples of 64px
- **Apple-like Design**: Glassmorphic UI with smooth animations and transitions
- **Component-based Architecture**: Built with React + Vite

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Then open your browser to the URL shown (usually http://localhost:5173)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Drawing
1. **Select Class**: Choose "Roads" or "Buildings"
2. **Choose Tool**: Use "Brush" to draw or "Eraser" to remove
3. **Adjust Brush Size**: Use the slider (1-100px)
4. **Draw**: Click and drag anywhere on the infinite canvas

### Navigation
- **Pan**: Hold Cmd (Mac) / Ctrl (Windows) / Shift + drag
- **Zoom**: Scroll up/down to zoom in/out (10% - 500%)
- **Reset View**: Click "Reset View" to return to origin

### Export
- **Export**: Click "Export" to save your mask as PNG
  - Automatically crops to drawn area
  - Dimensions rounded to multiples of 64px
  - Minimum size: 256×256 (standard patch size)
  - Includes timestamp in filename

## Technical Details

- **Canvas Size**: 4096×4096 internal canvas (appears infinite to user)
- **Color Encoding**:
  - Roads: Red channel (255, 0, 0)
  - Buildings: Green channel (0, 255, 0)
  - Background: Black (0, 0, 0)
- **Export Format**: PNG with proper color channels for ML pipelines
- **Grid**: Subtle 64px grid overlay for spatial awareness

## Project Structure

```
src/
├── components/
│   ├── Canvas.jsx       # Infinite canvas with pan/zoom
│   └── Toolbar.jsx      # Class and tool selection
├── App.jsx              # Main application
├── main.jsx             # Entry point
└── *.css                # Component styles
```

## Keyboard Shortcuts

- **Cmd/Ctrl/Shift + Drag**: Pan canvas
- **Scroll**: Zoom in/out
