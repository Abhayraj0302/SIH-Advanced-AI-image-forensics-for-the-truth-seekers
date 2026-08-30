import sharp from 'sharp';
import { clamp01 } from './config.js';

export async function analyzeEla(buffer) {
  try {
    // 1. Get raw uncompressed pixel buffer with alpha removed
    const origImage = sharp(buffer).removeAlpha();
    const origMetadata = await origImage.metadata();
    const { data: origRaw, info: origInfo } = await origImage.raw().toBuffer({ resolveWithObject: true });

    // 2. Re-encode as JPEG quality 90
    const recompressedJpeg = await sharp(buffer)
      .removeAlpha()
      .jpeg({ quality: 90 })
      .toBuffer();

    // 3. Decode recompressed JPEG back to raw and match dimensions
    const { data: recompRaw } = await sharp(recompressedJpeg)
      .resize(origInfo.width, origInfo.height, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const length = Math.min(origRaw.length, recompRaw.length);
    if (length === 0) {
      return {
        aiLikelihood: 0.15,
        evidence: { meanError: 0, errorVariance: 0, quality: 90 }
      };
    }

    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < length; i++) {
      const diff = Math.abs(origRaw[i] - recompRaw[i]);
      sum += diff;
      sumSq += diff * diff;
    }

    const mean = sum / length;
    const variance = Math.max(0, (sumSq / length) - (mean * mean));
    const aiLikelihood = clamp01(variance / 1800);

    return {
      aiLikelihood,
      evidence: {
        meanError: Number(mean.toFixed(3)),
        errorVariance: Number(variance.toFixed(3)),
        quality: 90
      }
    };
  } catch (err) {
    return {
      aiLikelihood: 0.2,
      evidence: {
        meanError: 0,
        errorVariance: 0,
        quality: 90,
        error: err.message
      }
    };
  }
}
