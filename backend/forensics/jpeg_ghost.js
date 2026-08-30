import sharp from 'sharp';
import { clamp01 } from './config.js';

export async function analyzeJpegGhost(buffer) {
  try {
    // JPEG Ghosting detects spliced/inpainted regions that were saved at a different
    // compression quality than the rest of the image (often seen in AI inpainting).

    const N = 256;

    // BUG FIX: Sharp pipelines are single-use. Create separate instances for each operation.
    // Also use fit:'fill' to guarantee NxN output so buffer lengths match.
    const [original, resavedBuffer] = await Promise.all([
      sharp(buffer).resize(N, N, { fit: 'fill' }).grayscale().raw().toBuffer(),
      sharp(buffer).resize(N, N, { fit: 'fill' }).jpeg({ quality: 65 }).toBuffer()
    ]);

    const resaved = await sharp(resavedBuffer)
      .grayscale()
      .raw()
      .toBuffer();

    const length = Math.min(original.length, resaved.length);
    let sumDiff = 0;

    // Compute absolute differences
    const diffs = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      diffs[i] = Math.abs(original[i] - resaved[i]);
      sumDiff += diffs[i];
    }

    const meanDiff = sumDiff / length;

    // Look for localized anomalies (ghosts) where the difference is abnormally low
    // meaning that specific region was already saved at Q=65 previously.
    let ghostCount = 0;
    for (let i = 0; i < length; i++) {
      if (diffs[i] < (meanDiff * 0.1)) {
        ghostCount++;
      }
    }

    const ghostRatio = ghostCount / length;

    // Calibrate: if > 5% of the image has suspiciously low delta to Q=65, it's likely a localized splice
    const aiLikelihood = clamp01((ghostRatio - 0.02) / 0.08);

    return {
      aiLikelihood,
      evidence: {
        ghostRatio: Number(ghostRatio.toFixed(3)),
        meanCompressionDiff: Number(meanDiff.toFixed(3)),
        status: aiLikelihood > 0.5 ? 'Ghosting Anomalies Found' : 'Uniform Compression'
      }
    };

  } catch (err) {
    return {
      aiLikelihood: 0.20,
      evidence: {
        ghostRatio: 0,
        meanCompressionDiff: 0,
        status: 'Error Computing Ghosts',
        error: err.message
      }
    };
  }
}
