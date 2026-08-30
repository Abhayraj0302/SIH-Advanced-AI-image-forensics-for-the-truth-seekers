import sharp from 'sharp';
import FFT from 'fft.js';
import { clamp01, THRESHOLDS } from './config.js';

export async function analyzeFrequency(buffer) {
  try {
    const N = 256;
    const { data } = await sharp(buffer)
      .resize(N, N, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const f = new FFT(N);
    const rowInput = new Float64Array(N);
    const rowOutput = f.createComplexArray();

    // 1. Run real FFT per row
    for (let r = 0; r < N; r++) {
      const rowOffset = r * N;
      for (let c = 0; c < N; c++) {
        rowInput[c] = data[rowOffset + c];
      }
      f.realTransform(rowOutput, rowInput);
      f.completeSpectrum(rowOutput);
    }

    // 2. Run real FFT per column on the *original* grayscale column data
    const colInput = new Float64Array(N);
    const colOutput = f.createComplexArray();

    let energy = 0;
    let peak = 0;
    let samples = 0;

    for (let c = 0; c < N; c++) {
      for (let r = 0; r < N; r++) {
        colInput[r] = data[r * N + c];
      }
      f.realTransform(colOutput, colInput);
      f.completeSpectrum(colOutput);

      // For columns: for row indices 8..127 (skip low frequencies)
      for (let k = 8; k <= 127; k++) {
        const re = colOutput[2 * k];
        const im = colOutput[2 * k + 1];
        const mag = Math.hypot(re, im);

        energy += mag;
        if (mag > peak) {
          peak = mag;
        }
        samples++;
      }
    }

    const mean = samples > 0 ? energy / samples : 0;
    const peakRatio = mean > 0 ? peak / mean : 0;
    const periodicPeak = clamp01((peakRatio - THRESHOLDS.FREQ_PEAK_RATIO_BASE) / THRESHOLDS.FREQ_PEAK_RATIO_RANGE);
    const aiLikelihood = periodicPeak;

    return {
      aiLikelihood,
      evidence: {
        width: N,
        height: N,
        midHighFrequencyMean: Number(mean.toFixed(3)),
        peakMagnitude: Number(peak.toFixed(3)),
        peakRatio: Number(peakRatio.toFixed(3))
      }
    };
  } catch (err) {
    return {
      aiLikelihood: 0.1,
      evidence: {
        width: 256,
        height: 256,
        midHighFrequencyMean: 0,
        peakMagnitude: 0,
        peakRatio: 0,
        error: err.message
      }
    };
  }
}
