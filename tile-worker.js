/**
 * Tile Worker - Web Worker for offloading tile generation
 *
 * This worker handles heavy tile generation off the main thread
 * to keep the UI responsive during processing.
 *
 * USAGE:
 * const worker = new Worker('tile-worker.js');
 * worker.postMessage({
 *   type: 'generateTiles',
 *   imageData: imageBitmap,
 *   width: 10000,
 *   height: 8000,
 *   tileSize: 256,
 *   tileOverlap: 1
 * });
 *
 * worker.onmessage = (e) => {
 *   if (e.data.type === 'progress') {
 *     console.log(`Progress: ${e.data.percent}%`);
 *   } else if (e.data.type === 'tile') {
 *     const { level, x, y, blob } = e.data;
 *     // Store tile blob
 *   } else if (e.data.type === 'complete') {
 *     console.log('Tile generation complete');
 *   }
 * };
 *
 * NOTE: This is a future optimization. The current implementation
 * generates tiles on the main thread for simplicity.
 */

self.addEventListener('message', async (e) => {
  const { type, imageData, width, height, tileSize, tileOverlap } = e.data;

  if (type === 'generateTiles') {
    try {
      await generateTilePyramid(imageData, width, height, tileSize, tileOverlap);
      self.postMessage({ type: 'complete' });
    } catch (error) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
});

async function generateTilePyramid(imageData, width, height, tileSize, tileOverlap) {
  const maxDimension = Math.max(width, height);
  const maxLevel = Math.ceil(Math.log2(maxDimension / tileSize));

  const levels = [];
  let totalTiles = 0;

  // Calculate levels
  for (let level = 0; level <= maxLevel; level++) {
    const levelWidth = Math.ceil(width / Math.pow(2, maxLevel - level));
    const levelHeight = Math.ceil(height / Math.pow(2, maxLevel - level));
    const cols = Math.ceil(levelWidth / tileSize);
    const rows = Math.ceil(levelHeight / tileSize);

    levels.push({ level, width: levelWidth, height: levelHeight, cols, rows });
    totalTiles += cols * rows;
  }

  // Generate tiles
  let tilesGenerated = 0;

  for (let i = levels.length - 1; i >= 0; i--) {
    const levelInfo = levels[i];
    const { level } = levelInfo;

    // Create scaled canvas for this level
    const levelCanvas = new OffscreenCanvas(levelInfo.width, levelInfo.height);
    const levelCtx = levelCanvas.getContext('2d');

    // Draw scaled image
    levelCtx.drawImage(
      imageData,
      0, 0, width, height,
      0, 0, levelInfo.width, levelInfo.height
    );

    // Generate tiles
    for (let row = 0; row < levelInfo.rows; row++) {
      for (let col = 0; col < levelInfo.cols; col++) {
        const tileCanvas = new OffscreenCanvas(tileSize, tileSize);
        const tileCtx = tileCanvas.getContext('2d');

        // Calculate source rectangle
        const sx = col * tileSize;
        const sy = row * tileSize;
        const sw = Math.min(tileSize, levelInfo.width - sx);
        const sh = Math.min(tileSize, levelInfo.height - sy);

        // Draw tile
        tileCtx.drawImage(levelCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

        // Convert to blob
        const blob = await tileCanvas.convertToBlob({
          type: 'image/jpeg',
          quality: 0.85
        });

        // Send tile back to main thread
        self.postMessage({
          type: 'tile',
          level,
          x: col,
          y: row,
          blob
        });

        tilesGenerated++;

        // Send progress update
        if (tilesGenerated % 10 === 0) {
          self.postMessage({
            type: 'progress',
            percent: (tilesGenerated / totalTiles) * 100,
            current: tilesGenerated,
            total: totalTiles,
            level
          });
        }
      }
    }
  }
}

/**
 * Future improvements:
 *
 * 1. Lazy tile generation:
 *    - Generate tiles on-demand as viewer requests them
 *    - Store generated tiles in IndexedDB for persistence
 *
 * 2. Chunked image loading:
 *    - Stream large images in chunks to avoid memory spikes
 *    - Use FileReader.readAsArrayBuffer() with chunking
 *
 * 3. Multiple workers:
 *    - Spawn worker pool for parallel tile generation
 *    - Distribute levels across workers
 *
 * 4. Cancellation support:
 *    - Allow canceling long-running operations
 *    - Clean up resources on cancellation
 */
