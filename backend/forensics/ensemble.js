import { weights, clamp01 } from './config.js';
import { analyzeMetadata } from './metadata.js';
import { analyzeEla } from './ela.js';
import { analyzeFrequency } from './frequency.js';
import { analyzeNoise } from './noise.js';
import { scanSynthId } from './synthid.js';
import { analyzePrnu } from './prnu.js';
import { analyzeJpegGhost } from './jpeg_ghost.js';
import { analyzeCfaDemosaic } from './cfa_demosaic.js';

export async function runLocalForensics(buffer, mimeType) {
  const [metadata, ela, frequency, noise, synthId, prnu, jpeg_ghost, cfa_demosaic] = await Promise.all([
    analyzeMetadata(buffer),
    analyzeEla(buffer),
    analyzeFrequency(buffer),
    analyzeNoise(buffer),
    scanSynthId(buffer, mimeType),
    analyzePrnu(buffer),
    analyzeJpegGhost(buffer),
    analyzeCfaDemosaic(buffer)
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
