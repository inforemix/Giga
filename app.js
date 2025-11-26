/**
 * GigaZoom - Browser-Based Gigapixel Image Viewer
 *
 * Main application class that handles:
 * - Image upload and loading
 * - Tile pyramid generation (DZI format)
 * - OpenSeadragon viewer initialization
 * - DZI export as ZIP file
 */

class GigaZoom {
  constructor() {
    // State
    this.currentImage = null;
    this.imageName = '';
    this.imageWidth = 0;
    this.imageHeight = 0;
    this.tileSize = 256;
    this.tileOverlap = 1;
    this.levels = [];
    this.tiles = new Map(); // Map of "level_x_y" => Blob URL
    this.viewer = null;

    // DOM elements
    this.uploadZone = document.getElementById('uploadZone');
    this.fileInput = document.getElementById('fileInput');
    this.uploadSection = document.getElementById('uploadSection');
    this.processingOverlay = document.getElementById('processingOverlay');
    this.viewerSection = document.getElementById('viewerSection');

    // Processing UI
    this.processingMessage = document.getElementById('processingMessage');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.imageSize = document.getElementById('imageSize');
    this.levelCount = document.getElementById('levelCount');
    this.tileCount = document.getElementById('tileCount');
    this.memoryUsage = document.getElementById('memoryUsage');

    // Controls
    this.btnZoomIn = document.getElementById('btnZoomIn');
    this.btnZoomOut = document.getElementById('btnZoomOut');
    this.btnHome = document.getElementById('btnHome');
    this.btnFullscreen = document.getElementById('btnFullscreen');
    this.btnExport = document.getElementById('btnExport');
    this.btnNewImage = document.getElementById('btnNewImage');

    // Bind events
    this.bindEvents();
  }

  bindEvents() {
    // Upload zone events
    this.uploadZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('drag-over');
    });

    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('drag-over');
    });

    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.processFile(file);
      }
    });

    // Control buttons
    this.btnZoomIn?.addEventListener('click', () => this.viewer?.viewport.zoomBy(1.5));
    this.btnZoomOut?.addEventListener('click', () => this.viewer?.viewport.zoomBy(0.67));
    this.btnHome?.addEventListener('click', () => this.viewer?.viewport.goHome());
    this.btnFullscreen?.addEventListener('click', () => this.viewer?.setFullScreen(!this.viewer.isFullPage()));
    this.btnExport?.addEventListener('click', () => this.exportDZI());
    this.btnNewImage?.addEventListener('click', () => this.reset());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.viewer) return;

      switch(e.key) {
        case '+':
        case '=':
          this.viewer.viewport.zoomBy(1.5);
          e.preventDefault();
          break;
        case '-':
        case '_':
          this.viewer.viewport.zoomBy(0.67);
          e.preventDefault();
          break;
        case '0':
          this.viewer.viewport.goHome();
          e.preventDefault();
          break;
        case 'f':
        case 'F':
          this.viewer.setFullScreen(!this.viewer.isFullPage());
          e.preventDefault();
          break;
      }
    });
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  async processFile(file) {
    try {
      this.imageName = file.name;

      // Show processing overlay
      this.uploadSection.style.display = 'none';
      this.processingOverlay.style.display = 'flex';

      // Update file size
      this.imageSize.textContent = this.formatBytes(file.size);

      // Load image
      this.updateProgress(0, 'Loading image...');
      this.currentImage = await this.loadImage(file);
      this.imageWidth = this.currentImage.width;
      this.imageHeight = this.currentImage.height;

      const megapixels = (this.imageWidth * this.imageHeight) / 1000000;
      console.log(`Image loaded: ${this.imageWidth}x${this.imageHeight} (${megapixels.toFixed(1)} MP)`);

      // Generate tile pyramid
      await this.generateTilePyramid();

      // Initialize viewer
      this.initViewer();

      // Show viewer
      this.processingOverlay.style.display = 'none';
      this.viewerSection.style.display = 'block';

    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing image: ' + error.message);
      this.reset();
    }
  }

  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        createImageBitmap(img).then(resolve).catch(reject);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async generateTilePyramid() {
    const maxDimension = Math.max(this.imageWidth, this.imageHeight);
    const maxLevel = Math.ceil(Math.log2(maxDimension / this.tileSize));

    this.levels = [];
    let totalTiles = 0;

    // Calculate levels (from smallest to largest)
    for (let level = 0; level <= maxLevel; level++) {
      const scale = Math.pow(2, level);
      const levelWidth = Math.ceil(this.imageWidth / Math.pow(2, maxLevel - level));
      const levelHeight = Math.ceil(this.imageHeight / Math.pow(2, maxLevel - level));
      const cols = Math.ceil(levelWidth / this.tileSize);
      const rows = Math.ceil(levelHeight / this.tileSize);

      this.levels.push({
        level,
        width: levelWidth,
        height: levelHeight,
        cols,
        rows,
        tileCount: cols * rows
      });

      totalTiles += cols * rows;
    }

    console.log(`Generating ${this.levels.length} levels with ${totalTiles} total tiles`);
    this.levelCount.textContent = this.levels.length;
    this.tileCount.textContent = totalTiles;

    // Generate tiles for each level (from largest to smallest for efficiency)
    let tilesGenerated = 0;

    for (let i = this.levels.length - 1; i >= 0; i--) {
      const levelInfo = this.levels[i];
      const level = levelInfo.level;

      this.updateProgress(
        (tilesGenerated / totalTiles) * 100,
        `Generating level ${level} (${levelInfo.width}×${levelInfo.height})...`
      );

      // Create scaled canvas for this level
      const levelCanvas = new OffscreenCanvas(levelInfo.width, levelInfo.height);
      const levelCtx = levelCanvas.getContext('2d');

      // Draw scaled image
      levelCtx.drawImage(
        this.currentImage,
        0, 0, this.imageWidth, this.imageHeight,
        0, 0, levelInfo.width, levelInfo.height
      );

      // Generate tiles for this level
      for (let row = 0; row < levelInfo.rows; row++) {
        for (let col = 0; col < levelInfo.cols; col++) {
          const tileCanvas = new OffscreenCanvas(this.tileSize, this.tileSize);
          const tileCtx = tileCanvas.getContext('2d');

          // Calculate source rectangle
          const sx = col * this.tileSize;
          const sy = row * this.tileSize;
          const sw = Math.min(this.tileSize, levelInfo.width - sx);
          const sh = Math.min(this.tileSize, levelInfo.height - sy);

          // Draw tile
          tileCtx.drawImage(
            levelCanvas,
            sx, sy, sw, sh,
            0, 0, sw, sh
          );

          // Convert to blob and store
          const blob = await tileCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
          const blobUrl = URL.createObjectURL(blob);
          this.tiles.set(`${level}_${col}_${row}`, blobUrl);

          tilesGenerated++;

          // Update progress periodically
          if (tilesGenerated % 10 === 0) {
            this.updateProgress(
              (tilesGenerated / totalTiles) * 100,
              `Generating tiles: ${tilesGenerated}/${totalTiles}`
            );
            this.updateMemoryUsage();
          }
        }
      }
    }

    this.updateProgress(100, 'Initializing viewer...');
    console.log(`Generated ${tilesGenerated} tiles`);
  }

  initViewer() {
    const maxLevel = this.levels.length - 1;

    // Custom tile source that uses our generated tiles
    const tileSource = {
      width: this.imageWidth,
      height: this.imageHeight,
      tileSize: this.tileSize,
      tileOverlap: this.tileOverlap,
      minLevel: 0,
      maxLevel: maxLevel,
      getTileUrl: (level, x, y) => {
        const key = `${level}_${x}_${y}`;
        return this.tiles.get(key) || '';
      }
    };

    // Initialize OpenSeadragon
    this.viewer = OpenSeadragon({
      id: 'openseadragon',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1.0/build/openseadragon/images/',
      tileSources: tileSource,

      // Performance
      animationTime: 0.3,
      blendTime: 0.1,
      immediateRender: false,

      // Zoom settings
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 1, // Max zoom is 100%
      visibilityRatio: 1.0,

      // Navigation
      showNavigator: false,
      showNavigationControl: false,
      showFullPageControl: false,

      // Touch/gestures
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
        flickMinSpeed: 20,
        flickMomentum: 0.4
      }
    });

    console.log('Viewer initialized');

    // Initialize Mission Control UI
    this.initMissionControlUI();
  }

  initMissionControlUI() {
    // Draw trajectory chart
    this.drawTrajectoryChart();

    // Draw schematic
    this.drawSchematic();

    // Populate mission data
    this.updateMissionData();
  }

  drawTrajectoryChart() {
    const canvas = document.getElementById('trajectoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, width, height);

    // Draw sine wave pattern (orbital trajectory)
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * 0.03) * 40 * Math.sin(x * 0.007);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Add grid lines
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }

  drawSchematic() {
    const canvas = document.getElementById('schematicCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#12121f';
    ctx.fillRect(0, 0, width, height);

    // Draw a simplified space station schematic
    const centerX = width / 2;
    const centerY = height / 2;

    // Central module
    ctx.strokeStyle = '#6366f1';
    ctx.fillStyle = '#20203a';
    ctx.lineWidth = 2;
    ctx.fillRect(centerX - 30, centerY - 15, 60, 30);
    ctx.strokeRect(centerX - 30, centerY - 15, 60, 30);

    // Solar panels (left)
    ctx.strokeStyle = '#8b5cf6';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(centerX - 100, centerY - 25, 60, 50);
    ctx.strokeRect(centerX - 100, centerY - 25, 60, 50);

    // Connection line (left)
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY);
    ctx.lineTo(centerX - 100, centerY);
    ctx.stroke();

    // Solar panels (right)
    ctx.strokeStyle = '#8b5cf6';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(centerX + 40, centerY - 25, 60, 50);
    ctx.strokeRect(centerX + 40, centerY - 25, 60, 50);

    // Connection line (right)
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX + 30, centerY);
    ctx.lineTo(centerX + 40, centerY);
    ctx.stroke();

    // Add some detail lines on solar panels
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = centerY - 20 + i * 10;
      ctx.beginPath();
      ctx.moveTo(centerX - 95, y);
      ctx.lineTo(centerX - 45, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + 45, y);
      ctx.lineTo(centerX + 95, y);
      ctx.stroke();
    }

    // Add indicator lights
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(centerX + 15, centerY - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Add labels
    ctx.fillStyle = '#a0a0b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Power', centerX - 70, centerY + 40);
    ctx.fillText('90%', centerX - 70, centerY + 52);
    ctx.fillText('Power', centerX + 70, centerY + 40);
    ctx.fillText('88%', centerX + 70, centerY + 52);
    ctx.fillText('Integrity', centerX, centerY + 40);
    ctx.fillText('70%', centerX, centerY + 52);
  }

  updateMissionData() {
    // Generate random but consistent data based on image dimensions
    const seed = this.imageWidth + this.imageHeight;

    // Orbital data
    document.getElementById('inclination').textContent = `${(51.5 + (seed % 10) * 0.1).toFixed(1)}°`;
    document.getElementById('apogee').textContent = `${400 + (seed % 50)} km`;
    document.getElementById('perigee').textContent = `${380 + (seed % 30)} km`;

    // Mission parameters
    const days = Math.floor(seed / 1000) % 30 + 1;
    const hours = (seed % 24);
    const minutes = (seed % 60);
    document.getElementById('orbitAdjustment').textContent = `+${(seed % 5)}.2Km (PENDING)`;
    document.getElementById('fuelConsumption').textContent = `${150 + (seed % 50)}Kg/h`;

    // Mission readouts
    document.getElementById('missionDuration').textContent = `${days}d ${hours}h ${minutes}m`;
    document.getElementById('fuelStatus').textContent = `${85 + (seed % 10)}%`;
    document.getElementById('distance').textContent = `${(12000 + (seed % 5000)).toLocaleString()}km`;
    document.getElementById('temperature').textContent = `${20 + (seed % 10)}°C`;
    document.getElementById('radiation').textContent = `${(seed % 10) / 10}.5VEv/h`;
  }

  async exportDZI() {
    if (!this.tiles.size) {
      alert('No image loaded');
      return;
    }

    try {
      this.btnExport.disabled = true;
      this.btnExport.textContent = 'Exporting...';

      const zip = new JSZip();
      const baseName = this.imageName.replace(/\.[^.]+$/, '');

      // Create DZI XML
      const dziXml = `<?xml version="1.0" encoding="UTF-8"?>
<Image xmlns="http://schemas.microsoft.com/deepzoom/2008"
  Format="jpg"
  Overlap="${this.tileOverlap}"
  TileSize="${this.tileSize}">
  <Size Width="${this.imageWidth}" Height="${this.imageHeight}"/>
</Image>`;

      zip.file(`${baseName}.dzi`, dziXml);

      // Add tiles
      const filesFolder = zip.folder(`${baseName}_files`);

      for (const [key, blobUrl] of this.tiles.entries()) {
        const [level, x, y] = key.split('_');

        // Fetch blob
        const response = await fetch(blobUrl);
        const blob = await response.blob();

        // Add to zip: level/x_y.jpg
        const levelFolder = filesFolder.folder(level);
        levelFolder.file(`${x}_${y}.jpg`, blob);
      }

      // Generate ZIP
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('DZI exported successfully');

    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting DZI: ' + error.message);
    } finally {
      this.btnExport.disabled = false;
      this.btnExport.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2v10m0 0l-4-4m4 4l4-4M3 15v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" fill="none"/></svg><span>Export</span>';
    }
  }

  reset() {
    // Revoke blob URLs
    for (const blobUrl of this.tiles.values()) {
      URL.revokeObjectURL(blobUrl);
    }

    // Clear state
    this.tiles.clear();
    this.levels = [];
    this.currentImage = null;
    this.viewer?.destroy();
    this.viewer = null;

    // Reset UI
    this.viewerSection.style.display = 'none';
    this.processingOverlay.style.display = 'none';
    this.uploadSection.style.display = 'block';
    this.fileInput.value = '';
  }

  updateProgress(percent, message) {
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = `${Math.round(percent)}%`;
    this.processingMessage.textContent = message;
  }

  updateMemoryUsage() {
    if (performance.memory) {
      const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(0);
      const totalMB = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
      this.memoryUsage.textContent = `${usedMB} / ${totalMB} MB`;
    } else {
      this.memoryUsage.textContent = 'N/A';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.gigaZoom = new GigaZoom();
  console.log('GigaZoom initialized');
});
