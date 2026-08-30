import { DetectResponse } from '../types/api';

export function simulateForensicsDetection(
  filename: string,
  mode: string = 'deep_scan',
  _sensitivity: number = 85
): DetectResponse {
  const isSynthetic = filename.toLowerCase().includes('flux') || 
                      filename.toLowerCase().includes('midjourney') || 
                      filename.toLowerCase().includes('ai') || 
                      filename.toLowerCase().includes('synthetic') ||
                      Math.random() > 0.45;

  const confidence = isSynthetic ? Math.floor(78 + Math.random() * 20) : Math.floor(5 + Math.random() * 20);
  const isAi = confidence >= 50;

  const modelAttributions = ['Midjourney v6.1', 'Flux.1-Dev (Black Forest Labs)', 'Stable Diffusion XL Turbo', 'DALL-E 3', 'Authentic Sensor RAW'];
  const attribution = isSynthetic ? modelAttributions[Math.floor(Math.random() * 4)] : 'None (Organic Optical Capture)';

  const regions = isSynthetic ? [
    { x: 24, y: 18, width: 38, height: 28, label: 'Generative frequency anomaly in hair fibers', confidence: 76 },
    { x: 55, y: 45, width: 30, height: 35, label: 'Unnatural specular reflection on iris', confidence: 82 },
    { x: 12, y: 68, width: 44, height: 22, label: 'ELA compression delta inconsistency', confidence: 64 }
  ] : [];

  return {
    success: true,
    taskId: `scan_demo_${Date.now().toString(36)}`,
    verdict: isAi ? 'POSSIBLE AI-GENERATED IMAGE' : 'AUTHENTIC IMAGE',
    isAi,
    confidence,
    regions,
    modelAttribution: attribution,
    synthIdStatus: isSynthetic ? (Math.random() > 0.5 ? 'PRESENT' : 'INCONCLUSIVE') : 'NOT_DETECTED',
    explanation: {
      gemini: isSynthetic
        ? `Visual inspection identified diffusion upsampling artifacts across fine-grain boundary edges. The high-frequency spectral distribution correlates with ${attribution} model signatures.`
        : 'Inspection shows natural optical noise distributions, organic sensor vignetting, and consistent quantization matrices with zero synthetic generator watermarks.',
      forensics: isSynthetic
        ? 'ELA residual variance exceeded standard JPEG compression envelopes (errorVariance: 24.8). 2D-FFT surfaced periodic Fourier spikes at mid-high frequencies. C2PA provenance manifest missing.'
        : 'Pixel noise floor coefficient within natural Poisson-Gaussian parameters. C2PA provenance valid. Quantization tables align with Sony/Canon DSLR profiles.'
    },
    metrics: {
      spectralScore: `${(isSynthetic ? 84 + Math.random() * 12 : 3 + Math.random() * 10).toFixed(1)}% Anomaly`,
      noiseConsistency: `${(isSynthetic ? 76 + Math.random() * 18 : 12 + Math.random() * 12).toFixed(1)}% Synthetic Signal`,
      metadataStatus: isSynthetic ? 'STRIPPED_OR_SYNTHETIC' : 'PRESENT_EXIF_VALID',
      facialGlint: isSynthetic ? 'Asymmetric (82% AI)' : 'Natural Eye Convergence'
    },
    forensicSignals: {
      score: confidence / 100,
      metadata: { aiLikelihood: isSynthetic ? 0.95 : 0.12, status: 'SCANNED' },
      ela: { aiLikelihood: isSynthetic ? 0.88 : 0.08, status: 'PROCESSED' },
      frequency: { aiLikelihood: isSynthetic ? 0.92 : 0.05, status: 'SPECTRAL_PEAKS' },
      noise: { aiLikelihood: isSynthetic ? 0.84 : 0.14, status: 'NON_UNIFORM' },
      synthId: { aiLikelihood: isSynthetic ? 0.75 : 0.0, status: 'CHECKED' }
    },
    heatmapUrl: '',
    scanMode: mode
  };
}
