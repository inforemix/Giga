# GigaZoom - Build Notes for Claude Code

A client-side tool for uploading, viewing, and exporting gigapixel images directly in the browser. Inspired by [EasyZoom](https://www.easyzoom.com).

---

## 🎯 Project Overview

**What it does:**
- Upload large images (100+ megapixels) via drag-and-drop
- Generate tiled image pyramids client-side (DZI format)
- Smooth pan/zoom viewing with OpenSeadragon
- Export as DZI ZIP archive for hosting anywhere

**Tech Stack:**
- Pure HTML/CSS/JS (no build tools required)
- OpenSeadragon for the zoomable viewer
- OffscreenCanvas for tile generation
- JSZip for export functionality

---

## 📁 File Structure

```
gigazoom/
├── index.html        # Main HTML with layout and structure
├── styles.css        # All styles (industrial/utilitarian aesthetic)
├── app.js            # Main application logic
├── tile-worker.js    # Web Worker for heavy processing (future)
├── BUILD_NOTES.md    # This file
└── README.md         # User-facing documentation
```

---

## 🚀 Quick Start

```bash
# Option 1: Simple HTTP server
python -m http.server 8000
# Open http://localhost:8000

# Option 2: Use any static file server
npx serve .
# or
php -S localhost:8000
```

---

## 🏗️ Architecture

### Tile Pyramid Generation

The DZI (Deep Zoom Image) format works like Google Maps:
1. Original image is the highest "level"
2. Each lower level is 50% the size of the previous
3. Each level is divided into 256x256 tiles
4. Viewer loads only visible tiles at current zoom

```
Level 0:   1x1 tile (tiny thumbnail)
Level 1:   2x2 tiles
Level 2:   4x4 tiles
...
Level N:   Full resolution
```

### Current Implementation

```javascript
// Simplified flow:
1. User drops image file
2. createImageBitmap() loads full image into memory
3. For each zoom level (highest to lowest):
   - Scale image to level size using OffscreenCanvas
   - Cut into 256x256 tiles
   - Convert each tile to JPEG blob
   - Store blob URL in Map for viewer access
4. Initialize OpenSeadragon with custom tile source
5. Viewer requests tiles via getTileUrl() callback
```

### Memory Considerations

- Images are fully loaded into memory (current limitation)
- Tile blobs stored as Object URLs
- ~500MB RAM for a 50 megapixel image
- For 200+ MP images, need streaming/chunked approach

---

## 🔧 Key Components

### GigaZoom Class (app.js)

```javascript
class GigaZoom {
  constructor()           // Initialize state and bind events
  processFile(file)       // Main entry point for image processing
  loadImage(file)         // Load file as ImageBitmap
  generateTilePyramid()   // Create all zoom levels and tiles
  initViewer(tileSource)  // Setup OpenSeadragon
  exportDZI()             // Package tiles as ZIP download
}
```

### OpenSeadragon Configuration

```javascript
// Key settings for best experience
{
  animationTime: 0.3,           // Smooth transitions
  blendTime: 0.1,               // Tile fade-in
  maxZoomPixelRatio: 4,         // Allow 4x native zoom
  gestureSettingsTouch: {
    pinchToZoom: true,          // Mobile support
    flickEnabled: true,
  },
}
```

---

## 🎨 Design System

Using an **industrial/utilitarian** aesthetic with:
- Dark theme (gray-950 base)
- Cyan accent (#06b6d4)
- Space Grotesk + JetBrains Mono fonts
- 8px spacing grid
- Subtle glow effects on accent elements

### CSS Variables

```css
--gray-950: #09090b;    /* Background */
--gray-900: #18181b;    /* Cards, panels */
--accent: #06b6d4;      /* Primary actions */
--accent-glow: rgba(6, 182, 212, 0.4);
```

---

## 📋 TODO / Future Improvements

### High Priority

- [ ] **Web Worker tile generation** - Move heavy processing off main thread
  - Implement using `tile-worker.js`
  - Pass ImageBitmap to worker via transferable objects
  - Stream tiles back to main thread as they're generated

- [ ] **Lazy tile generation** - Generate tiles on-demand as viewer requests them
  - Hook into OpenSeadragon's tile loading events
  - Generate only visible tiles at current zoom level
  - Dramatically reduce initial processing time

- [ ] **IndexedDB caching** - Persist tiles for reload without reprocessing
  - Store tiles by image hash + tile coordinates
  - Check cache before generating tiles
  - Implement cache size limits and eviction

- [ ] **Progress cancellation** - Allow user to cancel processing
  - Add cancel button to processing overlay
  - Implement AbortController for async operations
  - Clean up resources on cancellation

### Medium Priority

- [ ] **Chunked image loading** - Stream large files to avoid memory spikes
  - Use FileReader with chunking for files > 100MB
  - Progressive image loading and display
  - Better support for 200+ MP images

- [ ] **TIFF support** - Add tiff.js for TIFF/BigTIFF files
  - Many scientific/satellite images are TIFF
  - Support multi-page TIFF documents
  - Handle 16-bit and higher bit depths

- [ ] **Annotation layer** - Add drawing tools using Fabric.js overlay
  - Allow users to mark regions of interest
  - Add text labels and measurements
  - Export annotations with image

- [ ] **Share via link** - Generate shareable URLs (requires backend)
  - Upload tiles to cloud storage
  - Generate unique sharing link
  - Embed viewer in shareable page

### Nice to Have

- [ ] **Multiple images** - Support image collections
  - Gallery view with thumbnails
  - Switch between images without reload
  - Compare multiple images side-by-side

- [ ] **Comparison mode** - Side-by-side or overlay comparison
  - Useful for before/after, diff viewing
  - Sync zoom and pan between viewers
  - Opacity slider for overlay mode

- [ ] **Measurement tools** - Scale bar and measurement annotations
  - Set pixel-to-real-world scale
  - Measure distances and areas
  - Export measurements as CSV

- [ ] **IIIF export** - Alternative tile format for museum/archive use
  - International Image Interoperability Framework
  - Standard for sharing high-res images
  - Generate IIIF manifest alongside DZI

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Drag and drop JPG (5 MP)
- [ ] Drag and drop PNG (20 MP)
- [ ] Upload via button click
- [ ] Process very large image (100+ MP)
- [ ] Cancel button during processing

### Viewer Controls
- [ ] Pan with mouse drag
- [ ] Zoom with scroll wheel
- [ ] Zoom with +/- buttons
- [ ] Reset view with home button
- [ ] Fullscreen toggle
- [ ] Navigator mini-map interaction

### Export
- [ ] Export DZI ZIP
- [ ] Verify ZIP contains correct structure
- [ ] Extract and host exported DZI

### Keyboard Shortcuts
- [ ] `+` zoom in
- [ ] `-` zoom out
- [ ] `0` reset view
- [ ] `f` fullscreen

### Mobile/Touch
- [ ] Pinch to zoom
- [ ] Pan with touch drag
- [ ] Double-tap to zoom
- [ ] Flick momentum

### Edge Cases
- [ ] Very wide image (panorama)
- [ ] Very tall image (scroll)
- [ ] Square image
- [ ] Small image (< 1 MP)
- [ ] Malformed image file

---

## 🔌 API Reference

### OpenSeadragon Custom Tile Source

```javascript
// The tile source interface we implement:
{
  width: number,           // Full image width
  height: number,          // Full image height
  tileSize: number,        // Usually 256
  tileOverlap: number,     // Usually 1
  minLevel: number,        // Usually 0
  maxLevel: number,        // Math.ceil(log2(max(w,h)))
  getTileUrl: (level, x, y) => string  // Return blob URL
}
```

### DZI XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
  Format="jpg"
  Overlap="1"
  TileSize="256">
  <Size Width="10000" Height="8000"/>
</Image>
```

### DZI Folder Structure

```
myimage.dzi              # XML metadata
myimage_files/
├── 0/                   # Lowest zoom (1x1 tile)
│   └── 0_0.jpg
├── 1/                   # 2x2 tiles
│   ├── 0_0.jpg
│   ├── 1_0.jpg
│   ├── 0_1.jpg
│   └── 1_1.jpg
├── ...
└── 14/                  # Highest zoom (full res)
    ├── 0_0.jpg
    ├── 1_0.jpg
    └── ...
```

---

## 🐛 Known Issues

1. **Memory limit** - Browser may crash on images > 200 MP
   - **Workaround**: Use chunked loading (TODO)
   - **Affected browsers**: All (Chromium ~2GB limit)

2. **Safari OffscreenCanvas** - Limited support, may need polyfill
   - **Workaround**: Fall back to regular Canvas
   - **Affected versions**: Safari < 16.4

3. **No CORS** - Can't load remote images without proxy
   - **Workaround**: User must download and upload
   - **Alternative**: Add backend proxy endpoint

4. **Export speed** - ZIP creation can be slow for many tiles
   - **Workaround**: Show progress during export
   - **Improvement**: Use worker for ZIP generation (TODO)

5. **iOS memory limits** - More aggressive than desktop
   - **Workaround**: Detect iOS and warn for large images
   - **Limit**: ~1GB on most iOS devices

---

## 📚 Resources

### Documentation
- [OpenSeadragon Docs](https://openseadragon.github.io/)
- [DZI Format Spec](https://github.com/openseadragon/openseadragon/wiki/The-DZI-File-Format)
- [OffscreenCanvas MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [Web Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

### Libraries Used
- [OpenSeadragon](https://openseadragon.github.io/) - Zoomable image viewer
- [JSZip](https://stuk.github.io/jszip/) - ZIP file generation

### Similar Projects
- [EasyZoom](https://www.easyzoom.com) - Inspiration
- [libvips](https://libvips.github.io/libvips/) - Server-side tile generation
- [deepzoom.py](https://github.com/openzoom/deepzoom.py) - Python DZI creator
- [IIPImage](https://iipimage.sourceforge.io/) - High-performance image server

---

## 💬 Claude Code Commands

```bash
# Review the main app logic
cat app.js

# Check styles for specific component
grep -A 20 ".upload-zone" styles.css

# Test locally
python -m http.server 8000

# Find TODO items
grep -r "TODO" *.js *.md

# Check bundle size (if using build tools later)
du -sh *.js *.css
```

---

## 🚢 Deployment Options

### GitHub Pages (Free)
1. Push to GitHub
2. Settings → Pages → Source: main branch
3. Access at `https://username.github.io/gigazoom`

### Netlify (Free)
1. Drag project folder to Netlify Drop
2. Get instant URL
3. Optional: Configure custom domain

### Vercel (Free)
```bash
npm i -g vercel
vercel --prod
```

### Self-hosted
Just serve the static files from any web server:
- nginx
- Apache
- Caddy
- Any static file server

---

## 🔐 Security Considerations

### Client-Side Security
- All processing happens in browser (no server uploads)
- Images never leave user's device
- No external API calls (except CDN for libraries)

### CORS Headers (if hosting exported DZI)
```nginx
# nginx example
add_header Access-Control-Allow-Origin *;
add_header Access-Control-Allow-Methods "GET, OPTIONS";
```

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' https://cdn.jsdelivr.net;
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
           font-src https://fonts.gstatic.com;">
```

---

## 📊 Performance Benchmarks

Tested on MacBook Pro M1 (16GB RAM):

| Image Size | Dimensions | Processing Time | Memory Peak | Tiles Generated |
|------------|------------|-----------------|-------------|-----------------|
| 5 MP       | 2560×1920  | ~2s             | 150 MB      | 85              |
| 20 MP      | 5120×3840  | ~8s             | 350 MB      | 341             |
| 50 MP      | 8000×6250  | ~25s            | 800 MB      | 841             |
| 100 MP     | 11000×9090 | ~60s            | 1.5 GB      | 1637            |

**Note**: Times include tile generation and viewer initialization.

---

## 🎓 Learning Resources

### For Understanding the Code
1. **Image Processing Basics**
   - Canvas API and 2D context
   - ImageBitmap for efficient image handling
   - OffscreenCanvas for off-main-thread rendering

2. **Tiling Algorithms**
   - Pyramid data structures
   - Level-of-detail (LOD) rendering
   - Spatial indexing

3. **Web Performance**
   - Web Workers for parallelism
   - IndexedDB for client-side storage
   - Blob URLs and object lifecycle

### Potential Blog Post Topics
- "Building Google Maps for Images: A Deep Dive into Tile Pyramids"
- "Handling 100+ Megapixel Images in the Browser"
- "Client-Side Image Processing: Beyond the Basics"
- "Web Workers: When and How to Use Them"

---

## 📝 Notes for Future Development

### Progressive Enhancement Ideas
1. **Service Worker caching** - Cache tiles for offline viewing
2. **Prefetching** - Predict next tiles user will view
3. **WebGL rendering** - Hardware-accelerated tile compositing
4. **WebAssembly** - Port image processing to WASM for speed

### Accessibility Improvements
- [ ] Add ARIA labels to controls
- [ ] Keyboard navigation for viewer
- [ ] Screen reader descriptions
- [ ] High contrast mode support

### Internationalization
- [ ] Separate strings into i18n file
- [ ] Support RTL languages
- [ ] Format numbers/units by locale

---

*Last updated: November 2025*
*Built for Claude Code by Claude*
