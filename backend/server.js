import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { GoogleGenAI, Type } from '@google/genai';
import { runLocalForensics, combineForensics } from './forensics/ensemble.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const IMAGE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

// Module-level Gemini singleton (avoids re-instantiation per request)
const genaiInstance = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// 2. CORS configuration
const corsOrigin = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim())
  : true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// 3. In-memory Map for storing uploaded images
const images = new Map();

// Background purge every 15 minutes (unreferenced so it doesn't block process exit)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, item] of images.entries()) {
    if (now - item.uploadedAt > IMAGE_TTL_MS) {
      images.delete(id);
    }
  }
}, IMAGE_TTL_MS);
cleanupTimer.unref();

// 4. Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
  }
});

// Helper to classify and format Gemini errors
function handleGeminiError(err, modelName, res) {
  console.error('[Gemini API Error]:', err);
  const msg = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || 0;

  if (status === 401 || status === 403 || msg.includes('api_key') || msg.includes('unauthorized') || msg.includes('permission_denied') || msg.includes('api key not valid')) {
    return res.status(500).json({
      success: false,
      code: 'GEMINI_KEY_INVALID',
      error: 'Gemini API key is missing or invalid.'
    });
  }

  if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return res.status(429).json({
      success: false,
      code: 'GEMINI_QUOTA_EXCEEDED',
      error: 'Gemini API quota/tokens for this key have been used up.'
    });
  }

  if (msg.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      code: 'GEMINI_RATE_LIMITED',
      error: 'Too many requests right now — please wait and try again.'
    });
  }

  if (status === 503 || msg.includes('high demand') || msg.includes('unavailable')) {
    return res.status(503).json({
      success: false,
      code: 'GEMINI_SERVICE_UNAVAILABLE',
      error: 'The Gemini model is experiencing unusually high demand. Please try again shortly.'
    });
  }

  if (status === 404 || msg.includes('not found') || msg.includes('is not available') || msg.includes('unsupported model')) {
    return res.status(500).json({
      success: false,
      code: 'GEMINI_MODEL_UNAVAILABLE',
      error: `Configured model "${modelName}" is not available.`
    });
  }

  return res.status(502).json({
    success: false,
    code: 'GEMINI_UNKNOWN_ERROR',
    error: 'Gemini could not analyze this image.',
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// 1. GET /health
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// 2. POST /api/v1/upload
app.post('/api/v1/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded under form field "file".'
      });
    }

    const imageId = crypto.randomUUID();
    const mimeType = req.file.mimetype.toLowerCase();
    const subtype = mimeType.split('/')[1] || 'JPEG';

    images.set(imageId, {
      buffer: req.file.buffer,
      mimeType,
      filename: req.file.originalname || `upload_${imageId}.${subtype}`,
      uploadedAt: Date.now()
    });

    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(1);

    return res.status(200).json({
      success: true,
      imageId,
      url: `/media/${imageId}`,
      filename: req.file.originalname || `upload_${imageId}`,
      filesize: `${sizeMb} MB`,
      format: subtype.toUpperCase()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Image upload failed.'
    });
  }
});

// 3. GET /media/:imageId
app.get('/media/:imageId', (req, res) => {
  const { imageId } = req.params;
  const imageItem = images.get(imageId);

  if (!imageItem) {
    return res.status(404).json({
      success: false,
      error: 'Media not found or expired.'
    });
  }

  res.type(imageItem.mimeType).send(imageItem.buffer);
});

// 4. POST /api/v1/detect
app.post('/api/v1/detect', async (req, res) => {
  const { imageId, mode = 'deep_scan', sensitivity = 85 } = req.body || {};

  if (!imageId || !images.has(imageId)) {
    return res.status(404).json({
      success: false,
      error: 'Image expired. Please upload it again.'
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      code: 'GEMINI_KEY_MISSING',
      error: 'Gemini API key missing'
    });
  }

  const imageRecord = images.get(imageId);

  try {
    // 1. Start local forensics promise immediately
    const localForensicsPromise = runLocalForensics(imageRecord.buffer, imageRecord.mimeType);

    // 2. Prepare image for Gemini concurrently
    const geminiPrepPromise = (async () => {
      const preprocessedBuffer = await sharp(imageRecord.buffer)
        .rotate()
        .resize({
          width: 1536,
          height: 1536,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const base64Image = preprocessedBuffer.toString('base64');
      // OPT: Reuse module-level singleton instead of creating per-request
      const ai = genaiInstance;

      const instructionText = `Inspect for AI-generation evidence and possible SynthID. Critically examine specific regions where modern diffusion models often fail: hands (extra/missing fingers, merged joints), teeth (asymmetry, bleeding edges), eyes (mismatched specular highlights/reflections), text/writing (gibberish, morphological drift), and background object coherence (floating or structurally impossible geometry). Also explicitly check for any visible AI-platform watermark, badge, or logo rendered into the image (e.g. a Gemini/Google AI sparkle mark, a Midjourney/DALL-E/Firefly signature, or similar). A visible platform watermark is strong, direct evidence of AI generation — if present, aiProbability must be at least 85, regardless of whether other physical-artifact categories look otherwise clean. List up to 5 reliable supporting regions; use normalized 0-100 x,y,width,height with x,y top-left. For each region, provide a 'confidence' score (0-100) indicating your certainty that the region contains synthetic artifacts. Use short labels. Return a single aiProbability from 0 to 100 representing how likely this image is AI-generated. Do not assume the image is AI-generated; most images are authentic unless clear physical impossibilities or distinct generative artifacts are present. Provide an honest, balanced aiProbability. Mode: ${mode}; sensitivity: ${sensitivity}.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                text: instructionText
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiProbability: { type: Type.NUMBER, description: '0 to 100 likelihood of AI generation' },
              visibleWatermarkDetected: { type: Type.BOOLEAN, description: 'true if an AI-platform watermark, badge, or logo is visibly rendered in the image' },
              regions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                    confidence: { type: Type.NUMBER, description: '0 to 100 confidence that this region is synthetic' }
                  },
                  required: ['x', 'y', 'width', 'height', 'label', 'confidence']
                }
              },
              synthIdStatus: {
                type: Type.STRING,
                enum: ['PRESENT', 'NOT_DETECTED', 'INCONCLUSIVE']
              },
              explanation: { type: Type.STRING },
              modelAttribution: { type: Type.STRING },
              spectralScore: { type: Type.STRING },
              noiseConsistency: { type: Type.STRING },
              metadataStatus: { type: Type.STRING },
              facialGlint: { type: Type.STRING }
            },
            required: ['aiProbability', 'visibleWatermarkDetected', 'regions', 'synthIdStatus', 'explanation', 'modelAttribution']
          }
        }
      });

      let responseText = typeof response.text === 'function' ? response.text() : response.text;
      if (!responseText) {
        responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      }
      responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(responseText);
    })();

    // 3. Await both in parallel
    const [localResults, geminiData] = await Promise.all([
      localForensicsPromise,
      geminiPrepPromise
    ]);

    const rawAiProb = typeof geminiData.aiProbability === 'number' ? geminiData.aiProbability : 50;
    const clampedAiProb = Math.max(0, Math.min(100, rawAiProb));
    const visibleWatermarkDetected = geminiData.visibleWatermarkDetected === true;
    const geminiIsAi = clampedAiProb >= 50 || visibleWatermarkDetected;

    // 4. Combine with ensemble logic
    const ensemble = combineForensics(localResults, clampedAiProb / 100, geminiIsAi, visibleWatermarkDetected);
    const isAi = ensemble.score >= 0.5;

    return res.status(200).json({
      success: true,
      taskId: `scan_${crypto.randomUUID()}`,
      verdict: isAi ? 'POSSIBLE AI-GENERATED IMAGE' : 'AUTHENTIC IMAGE',
      isAi,
      confidence: Number((clampedAiProb).toFixed(1)),
      regions: geminiData.regions || [],
      modelAttribution: geminiData.modelAttribution || 'Unknown / Not Determined',
      synthIdStatus: ensemble.synthIdStatus,
      explanation: {
        gemini: geminiData.explanation || '',
        forensics: ensemble.explanation || ''
      },
      metrics: ensemble.metrics,
      forensicSignals: {
        score: ensemble.score,
        metadata: localResults.metadata,
        ela: localResults.ela,
        frequency: localResults.frequency,
        noise: localResults.noise,
        synthId: localResults.synthId,
        prnu: localResults.prnu,
        jpeg_ghost: localResults.jpeg_ghost,
        cfa_demosaic: localResults.cfa_demosaic
      },
      heatmapUrl: `/media/${imageId}`,
      scanMode: mode
    });
  } catch (err) {
    return handleGeminiError(err, GEMINI_MODEL, res);
  }
});

// 5. Serve the frontend as static files
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use('/', express.static(frontendDistPath));
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[AI Forensics Backend] Server running on port ${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn(`[AI Forensics Backend] WARNING: GEMINI_API_KEY is not set. Forensic detection will fail.`);
  } else {
    console.log(`[AI Forensics Backend] Gemini configured successfully.`);
  }
});
