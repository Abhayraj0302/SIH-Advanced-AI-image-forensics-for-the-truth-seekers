import sharp from 'sharp';
import { clamp01 } from './config.js';

export async function analyzeCfaDemosaic(buffer) {
  try {
    // Color Filter Array (CFA) Demosaicing check.
    // Real cameras use Bayer filters and demosaicing, creating 2x2 periodic correlations in RGB channels.
    // AI generative models synthesize direct continuous RGB fields without Bayer artifacts.

    const N = 256;

    // BUG FIX: Use fit:'fill' to guarantee exactly NxN output (3*N*N bytes for RGB).
    // fit:'inside' preserves aspect ratio and can produce non-square output,
    // making the hardcoded stride = N*3 and loop bound y < N wrong.
    const { data: rgb, info } = await sharp(buffer)
      .resize(N, N, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    const stride = width * channels;

    let bayerArtifacts = 0;

    for (let y = 0; y < height - 2; y += 2) {
      for (let x = 0; x < width - 2; x += 2) {
        const i1 = (y * stride) + (x * channels);
        const i2 = (y * stride) + ((x + 1) * channels);
        const i3 = ((y + 1) * stride) + (x * channels);

        // Green channel is usually heavily interpolated in Bayer (RGGB)
        const g1 = rgb[i1 + 1];
        const g2 = rgb[i2 + 1];
        const g3 = rgb[i3 + 1];

        // Check for periodic micro-contrasts typical of demosaicing algorithms
        if (Math.abs(g1 - g2) > 2 && Math.abs(g1 - g3) > 2) {
          bayerArtifacts++;
        }
      }
    }

    const totalBlocks = Math.floor(height / 2) * Math.floor(width / 2);
    const bayerRatio = totalBlocks > 0 ? bayerArtifacts / totalBlocks : 0;

    // Real cameras have high bayerRatio. Generative AI has low bayerRatio.
    // We invert the check: low ratio = high AI likelihood.
    const aiLikelihood = clamp01((0.30 - bayerRatio) / 0.30);

    return {
      aiLikelihood,
      evidence: {
        bayerRatio: Number(bayerRatio.toFixed(3)),
        status: aiLikelihood > 0.5 ? 'Lacks CFA Signatures' : 'Bayer Pattern Detected'
      }
    };

  } catch (err) {
    return {
      aiLikelihood: 0.20,
      evidence: {
        bayerRatio: 0,
        status: 'Error Computing CFA',
        error: err.message
      }
    };
  }
}
