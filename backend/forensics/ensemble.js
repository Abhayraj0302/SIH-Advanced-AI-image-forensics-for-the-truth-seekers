import sharp from 'sharp';
import { weights, clamp01 } from './config.js';
import { analyzeMetadata } from './metadata.js';
import { analyzeEla } from './ela.js';
import { analyzeFrequency } from './frequency.js';
import { analyzeNoise } from './noise.js';
import { scanSynthId } from './synthid.js';
import { analyzePrnu } from './prnu.js';
import { analyzeJpegGhost } from './jpeg_ghost.js';
import { analyzeCfaDemosaic } from './cfa_demosaic.js';

/**
 * Pre-decode an image buffer once into both RGB and grayscale representations
 * so all downstream forensic modules can skip their own redundant decode.
 *
 * @param {Buffer} buffer
 * @returns {{ rgb: { data: Buffer, info: object }, gray: { data: Buffer, info: object } }}
 */
async function preDecodeImage(buffer) {
  // Pre-resize image to max 1536 for all forensics to significantly speed up processing
  const resizedBuffer = await sharp(buffer)
    .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true })
    .toBuffer();

  const [rgbResult, grayResult] = await Promise.all([
    sharp(resizedBuffer)
      .removeAlpha()
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(resizedBuffer)
      .removeAlpha()
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })
  ]);

  return {
    resizedBuffer,
    rgb: { data: rgbResult.data, info: rgbResult.info },
    gray: { data: grayResult.data, info: grayResult.info }
  };
}

export async function runLocalForensics(buffer, mimeType) {
  // Fast-fail for buffers too small to be valid images (OPT-2)
  if (!buffer || buffer.length < 100) {
    const fallback = { aiLikelihood: 0.5, evidence: { status: 'BUFFER_TOO_SMALL' } };
    return {
      metadata: fallback,
      ela: fallback,
      frequency: fallback,
      noise: fallback,
      synthId: { c2pa: fallback, pixel: {}, status: 'INCONCLUSIVE', explanation: 'Buffer too small for analysis.' },
      prnu: fallback,
      jpeg_ghost: fallback,
      cfa_demosaic: fallback
    };
  }

  // Pre-decode once: both RGB (for CFA/ELA) and grayscale (for freq/noise/prnu/jpeg_ghost)
  const preDecoded = await preDecodeImage(buffer);

  // Note: metadata and c2pa must use the original buffer as resize strips metadata
  const [metadata, ela, frequency, noise, synthId, prnu, jpeg_ghost, cfa_demosaic] = await Promise.all([
    analyzeMetadata(buffer),
    analyzeEla(preDecoded.resizedBuffer, preDecoded.rgb),
    analyzeFrequency(preDecoded.resizedBuffer, preDecoded.gray),
    analyzeNoise(preDecoded.resizedBuffer, preDecoded.gray),
    scanSynthId(buffer, mimeType),
    analyzePrnu(preDecoded.resizedBuffer, preDecoded.gray),
    analyzeJpegGhost(preDecoded.resizedBuffer, preDecoded.gray),
    analyzeCfaDemosaic(preDecoded.resizedBuffer, preDecoded.rgb)
  ]);

  return {
    metadata,
    ela,
    frequency,
    noise,
    synthId,
    prnu,
    jpeg_ghost,
    cfa_demosaic
  };
}

export function combineForensics(localResults, geminiConfidence, geminiIsAi, visibleWatermarkDetected = false) {
  const { metadata, ela, frequency, noise, synthId, prnu, jpeg_ghost, cfa_demosaic } = localResults;

  const confidence = clamp01(geminiConfidence);
  const geminiOpinion = geminiIsAi ? confidence : (1 - confidence);

  const score = clamp01(
    (metadata.aiLikelihood * weights.metadata) +
    (synthId.c2pa.aiLikelihood * weights.c2pa) +
    (ela.aiLikelihood * weights.ela) +
    (frequency.aiLikelihood * weights.frequency) +
    (noise.aiLikelihood * weights.noise) +
    (prnu.aiLikelihood * weights.prnu) +
    (jpeg_ghost.aiLikelihood * weights.jpeg_ghost) +
    (cfa_demosaic.aiLikelihood * weights.cfa_demosaic) +
    (geminiOpinion * weights.geminiOpinion)
  );

  const finalScore = visibleWatermarkDetected ? Math.max(score, 0.92) : score;

  const metrics = {
    spectralScore: `${(frequency.aiLikelihood * 100).toFixed(1)}% Anomaly`,
    noiseConsistency: `${(noise.aiLikelihood * 100).toFixed(1)}% Synthetic Signal`,
    metadataStatus: metadata.evidence.status,
    facialGlint: 'Unavailable' // Left as placeholder for future glint analysis
  };

  return {
    score: finalScore,
    synthIdStatus: synthId.status,
    explanation: synthId.explanation,
    metrics
  };
}
