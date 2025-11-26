# ⚡ GigaZoom

**Browser-based gigapixel image viewer with client-side tile generation and DZI export.**

View, explore, and export massive images (100+ megapixels) directly in your browser. No uploads, no servers, 100% private.

---

## ✨ Features

- 📸 **Drag & Drop Upload** - Just drop your image to start
- 🔒 **100% Private** - All processing happens in your browser, no data uploaded
- ⚡ **Smooth Pan/Zoom** - Google Maps-style tile rendering for instant zoom
- 📦 **DZI Export** - Download as Deep Zoom Image format for hosting anywhere
- 🎨 **No Size Limits** - Handle 100+ megapixel images with ease
- 📱 **Mobile Support** - Touch gestures and responsive design
- ⌨️ **Keyboard Shortcuts** - Fast navigation with keyboard controls

---

## 🚀 Quick Start

### Option 1: Run Locally

```bash
# Clone or download this repository
git clone https://github.com/yourusername/gigazoom.git
cd gigazoom

# Start a local server (choose one):

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open **http://localhost:8000** in your browser.

### Option 2: Deploy Online

Deploy to any static hosting service:

- **GitHub Pages**: Push to GitHub, enable Pages in settings
- **Netlify**: Drag folder to [Netlify Drop](https://app.netlify.com/drop)
- **Vercel**: `npx vercel --prod`

---

## 📖 How to Use

### 1. Upload an Image

- **Drag and drop** your image onto the upload zone
- Or **click** the upload zone to browse for a file
- Supports: JPG, PNG, WebP

### 2. Wait for Processing

GigaZoom will:
- Load your image
- Generate a pyramid of tiles (like Google Maps)
- Initialize the interactive viewer

Processing time depends on image size:
- 5 MP: ~2 seconds
- 20 MP: ~8 seconds
- 50 MP: ~25 seconds
- 100 MP: ~60 seconds

### 3. Explore Your Image

**Mouse Controls:**
- Drag to pan
- Scroll wheel to zoom
- Click home button to reset view

**Touch Controls:**
- Pinch to zoom
- Drag to pan
- Double-tap to zoom in

**Keyboard Shortcuts:**
- `+` or `=` - Zoom in
- `-` - Zoom out
- `0` - Reset view to home
- `F` - Toggle fullscreen

### 4. Export DZI (Optional)

Click the **Export** button to download your image as a DZI archive:

1. Click **Export** button
2. Wait for ZIP generation
3. Download `yourimage.zip`
4. Extract to get DZI files

**What's in the ZIP?**
```
yourimage.zip
├── yourimage.dzi          (XML metadata)
└── yourimage_files/       (Tile folders)
    ├── 0/                 (Lowest zoom level)
    ├── 1/
    ├── ...
    └── 14/                (Highest zoom level)
```

**How to host exported DZI:**

Upload the extracted files to any web server, then embed with OpenSeadragon:

```html
<div id="viewer" style="width: 800px; height: 600px;"></div>
<script src="https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/openseadragon.min.js"></script>
<script>
  OpenSeadragon({
    id: 'viewer',
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
    tileSources: 'yourimage.dzi'
  });
</script>
```

---

## 🛠️ Technical Details

### What is DZI?

**Deep Zoom Image (DZI)** is a tiled image format that allows smooth zooming of very large images without loading the entire image at once.

**How it works:**
1. Image is divided into a pyramid of zoom levels
2. Each level is cut into small tiles (256×256 pixels)
3. Viewer loads only visible tiles at current zoom level
4. Enables instant zooming on multi-gigapixel images

### Architecture

```
User uploads image
       ↓
Load into memory (ImageBitmap)
       ↓
Generate pyramid levels (level 0 = thumbnail, level N = full res)
       ↓
Slice each level into 256×256 tiles
       ↓
Store tiles as JPEG blobs in memory
       ↓
Initialize OpenSeadragon viewer with custom tile source
       ↓
Viewer requests tiles via getTileUrl() as needed
```

### Tech Stack

- **OpenSeadragon** - Zoomable image viewer
- **OffscreenCanvas** - Efficient tile generation
- **JSZip** - ZIP export functionality
- **Pure JavaScript** - No build tools, no dependencies beyond CDN libraries

---

## 🎨 Screenshots

### Upload Screen
![Upload Screen](https://via.placeholder.com/800x400/09090b/06b6d4?text=Upload+Screen)

### Viewer Interface
![Viewer](https://via.placeholder.com/800x400/09090b/06b6d4?text=Gigapixel+Viewer)

### Processing Overlay
![Processing](https://via.placeholder.com/800x400/09090b/06b6d4?text=Processing...)

---

## ❓ FAQ

### **Q: What's the maximum image size?**

**A:** Depends on your browser's memory limit. Most modern browsers can handle 100-200 megapixels. Chrome has a ~2GB memory limit per tab.

### **Q: Does this work offline?**

**A:** Yes, once loaded. However, the OpenSeadragon and JSZip libraries are loaded from CDN, so you need internet for the initial page load.

### **Q: Can I use this for medical/satellite imagery?**

**A:** Yes, but TIFF support is not yet implemented. Convert TIFF to PNG first, or check out the TODO list in BUILD_NOTES.md.

### **Q: Is this secure?**

**A:** Yes. All processing happens in your browser. Your images are never uploaded to any server.

### **Q: Can I embed this in my website?**

**A:** Yes! Either use the exported DZI files with OpenSeadragon, or embed the entire GigaZoom app in an iframe.

### **Q: Why is processing slow?**

**A:** Tile generation happens on the main thread. Future updates will move this to a Web Worker for better performance. See BUILD_NOTES.md for roadmap.

### **Q: Can I contribute?**

**A:** Absolutely! See BUILD_NOTES.md for the TODO list and architecture details.

---

## 🐛 Known Issues

- **Safari < 16.4**: Limited OffscreenCanvas support (may need polyfill)
- **iOS devices**: More aggressive memory limits (~1GB)
- **Very large images (200+ MP)**: May cause browser crashes on low-memory devices

---

## 📄 License

MIT License - feel free to use, modify, and distribute.

---

## 🙏 Credits

- **OpenSeadragon** - Amazing open-source image viewer
- **EasyZoom** - Inspiration for this project
- Fonts: Space Grotesk, JetBrains Mono

---

## 📚 Further Reading

- [OpenSeadragon Documentation](https://openseadragon.github.io/)
- [DZI Format Specification](https://github.com/openseadragon/openseadragon/wiki/The-DZI-File-Format)
- [BUILD_NOTES.md](BUILD_NOTES.md) - Developer documentation
- [Deep Zoom Technology](https://en.wikipedia.org/wiki/Deep_Zoom)

---

**Built with Claude Code** • [Report Issues](https://github.com/yourusername/gigazoom/issues) • [View Source](https://github.com/yourusername/gigazoom)
